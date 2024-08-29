---
title: iOS VideoToolBox 解码 HEVC Open-GOP 视频的问题排查
date: 2024-03-29T22:13:47+08:00
slug: ios-videotoolbox-opengop
subtitle: ""
tags:
  - VideoToolBox
categories:
  - software-development
comments: true
draft: false
original: true
image: https://image.glumes.com/image/closed-gop-open-gop-featured-image.webp
author: 星陨
---

最近项目中遇到一个问题，用户上传一个 H.265 编码，并且是 Open-GOP 格式的某个视频。

该视频在 iOS 平台上用 AssetReader 进行解码，频繁 Seek 的场景下会出现卡死。

<!--more-->

用 VideoToolBox 解码也会有异常，具体表现在 iOS 16 的系统上出现花屏，iOS 17 的系统上解码失败，错误码是 kVTVideoDecoderBadDataErr (-12909)。

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

**欢迎扫码阅读或者加入【音视频开发进阶】知识星球，看更多精彩内容！！！**

星球介绍： [一个音视频领域专业问答的小圈子](https://glumes.com/av-knowledge-planet/)

![](https://image.glumes.com/image/Snipaste_2024-03-29_22-33-55-2.webp)

文章链接：[https://t.zsxq.com/18h4Z1Xno](https://t.zsxq.com/18h4Z1Xno)

