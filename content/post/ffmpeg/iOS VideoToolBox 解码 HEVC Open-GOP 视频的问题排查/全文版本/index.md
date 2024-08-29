---
title: 【全文】iOS VideoToolBox 解码 HEVC Open-GOP 视频的问题排查
date: 2024-03-29T22:13:47+08:00
slug: ios-videotoolbox-opengop-full
subtitle: 
tags:
  - 水电费
categories:
  - software-development
comments: true
draft: true
original: true
image: https://image.glumes.com/image/closed-gop-open-gop-featured-image.webp
author: 星陨
---

最近项目中遇到一个问题，用户上传一个 H.265 编码，并且是 Open-GOP 格式的某个视频。

该视频在 iOS 平台上用 AssetReader 进行解码，频繁 Seek 的场景下会出现卡死。用 VideoToolBox 解码也会有异常，具体表现在 iOS 16 的系统上出现花屏，iOS 17 的系统上解码失败，错误码是 kVTVideoDecoderBadDataErr (-12909)。

通过调研分析，AssetReader 解码对于开发者来说相当于是个黑盒，Play 和 Seek 行为都是通过指定 API 来完成的，可操作的空间比较小，并且官方论坛上也有反馈卡死的行为，因此暂时不处理这个，重点放在 VideoToolBox 上，毕竟竞品也是用 VideoToolBox 解码的，而且还一切正常。

VideoToolBox 的解码流程和 MediaCodec 还不一样，需要的前置操作比较多，比如判断 NALU 类型，提取 VPS、SPS、PPS 等，具体流程可以参考这里，讲的非常详细了。

https://stackoverflow.com/questions/29525000/how-to-use-videotoolbox-to-decompress-h-264-video-stream 。

上面是关于 H.264 的解码，对于要处理的 H.265 & Open-GOP 格式的视频还是不够的，不过他们的 API 调用流程都是一样的，H.265 的视频需要多提取一个 VPS 的 NALU 。

通过比对校验，确认了 VideoToolBox 的使用流程上没有问题之后，那么就是关于视频格式的解码处理流程有问题了。

重点还是在 Open-GOP 格式上，它的 GOP 结构是这样的：

I B B P B B P B B P B B I B B P B B P B（显示顺序）

I P B B P B B P B B I B B P B B P B B...（解码顺序）

解码顺序中，在 I 帧后面跟了两个 B 帧，而这两个 B 帧还参考了 I 帧前面 GOP 的内容。

假设 Seek 到 I 帧，然后接着解码后面 B 帧，由于 I 帧前面的内容并没有读取送给解码器，所以 B 帧缺少了参考内容导致解码失败，在 iOS 16 上表现为画面花屏，在 iOS 17 上则是报 -12909 的错误码，并且 B 帧后面所有的帧在 Seek 后顺序播放的情况下也解码失败了。

通过上面的现象定位到具体原因就是 Open-GOP 格式下 Seek 的 I 帧并不是 IDR 帧，导致 B 帧解码失败，从而影响了整个解码器运行。

解决办法要么把 B 帧要参考的帧给补上，要么把这个 B 帧给丢了。显然第一种太耗时了，不可取，只能把 B 帧给丢了。那么接下来要做的就是如何确定谁是 B 帧。

这里需要用到 H.265 相关的知识内容了，尤其是 H.265 的 NALU 类型，具体如下：

```
NAL_TRAIL_N = 0, 
NAL_TRAIL_R = 1, 
NAL_TSA_N = 2, 
NAL_TSA_R = 3, 
NAL_STSA_N = 4, 
NAL_STSA_R = 5, 
NAL_RADL_N = 6, 
NAL_RADL_R = 7, 
NAL_RASL_N = 8, 
NAL_RASL_R = 9, 
NAL_BLA_W_LP = 16, 
NAL_BLA_W_RADL = 17, 
NAL_BLA_N_LP = 18, 
NAL_IDR_W_RADL = 19, 
NAL_IDR_N_LP = 20, 
NAL_CRA_NUT = 21, 
NAL_VPS = 32, 
NAL_SPS = 33, 
NAL_PPS = 34, 
NAL_AUD = 35, 
NAL_EOS_NUT = 36, 
NAL_EOB_NUT = 37, 
NAL_FD_NUT = 38, 
NAL_SEI_PREFIX = 39, 
NAL_SEI_SUFFIX = 40,
```

在上面的 NALU 中，类型值为 16~21 的均为 I 帧，但 I 帧并不是 IDR 帧。

类型为 NAL_CRA_NUT 的 NALU，简称 CRA ，它就是 I 帧，并不是 IDR 帧。在上面出问题的情况下，就是因为 Seek 到了 CRA 帧，而 CRA 后面的帧可以参考前一个 GOP 的内容。

对于需要参考前一个 GOP 类型的帧，他们的 NALU 类型是 NAL_RASL_N 和 NAL_RASL_R ，因为要参考前一个 GOP 的帧，所以其他的帧也不会去参考这两个类型的帧。

NAL_RASL_N = 8, 
NAL_RASL_R = 9, 

那么接下来要做的就很简单了，Seek 之后接着解码，在解码过程中判断 AVPacket 的 NALU 类型是不是 NAL_RASL_N 或者 NAL_RASL_R。如果是的话，直接丢帧跳过即可。

修改代码，验证想法，确认了该方式能修复上述的问题。

并且查阅了 FFmpeg 解码的代码，也找到了这样的操作痕迹：
```cpp
if (s->max_ra == INT_MAX) {
	// 判断 HEVC_NAL_CRA_NUT 类型
  if (s->nal_unit_type == HEVC_NAL_CRA_NUT || IS_BLA(s)) {
    s->max_ra = s->poc;
  } else {
    if (IS_IDR(s)) s->max_ra = INT_MIN;
  }
}
// 判断 HEVC_NAL_RASL_R 和 HEVC_NAL_RASL_N 类型
if ((s->nal_unit_type == HEVC_NAL_RASL_R || s->nal_unit_type == HEVC_NAL_RASL_N) && s->poc <= s->max_ra) {
  s->is_decoded = 0;
  break;
} else {
  if (s->nal_unit_type == HEVC_NAL_RASL_R && s->poc > s->max_ra) s->max_ra = INT_MIN;
}
```
至此，还遗留了一个小问题，并不是所有 GOP 的 NAL_RASL_N 和 NAL_RASL_R 类型都要丢弃。理论上只丢弃 Seek 后解码的第一个 GOP 内的 NAL_RASL_N 和 NAL_RASL_R ，接下来顺序播放的话，GOP 的帧是不能丢弃的，毕竟它是可以找到前向参考内容的，这种情况下要怎么处理呢？

这里留下一个小问题给大家，实际上在上面 FFmepg 的源码中就已经有答案了，利用 s->max_ra 和 s->poc 这两个变量做判断，在下一个 GOP 内不会丢帧了，具体可以详细阅读源码。

至此，问题得到解决，下班~~~

参考：

https://blog.csdn.net/DittyChen/article/details/87798547
