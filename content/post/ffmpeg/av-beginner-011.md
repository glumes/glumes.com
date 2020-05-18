---
title: "【音视频连载-011】第二季 FFmpeg 一层一层获取文件信息"
date: 2020-05-18T11:37:09+08:00
subtitle: ""
tags: ["FFmpeg"]
categories: ["FFmpeg"]
comments: true
bigimg: [{src: "https://ae01.alicdn.com/kf/U0d90ed6069554297bec5112bed73109aN.jpg", desc: ""}]
draft: false
original: true
---

本篇文章主要是讲解如何通过 FFmpeg 代码来获取文件信息。

首先准备一个文件，用命令行来查看它的基本信息。

文件地址如下：

https://github.com/glumes/av-beginner/blob/master/resource/video/video-avi-320x320.avi

这个文件很有意思，它的内容是一个时钟，每隔一秒，秒针都会跳动，同时还会发出滴答的声音，很方便后续做音视频同步处理。


<!--more-->

执行命令如下：

> ffmpeg -i your_file_path


得到的结果如下图：

![](https://ae01.alicdn.com/kf/H166f18215b2d49c48ad90860f26d7abbu.jpg)

从图中获取如下的信息：

* 视频时长 duration 为 12s
* 开始时间点 start  0s
* 比特率 bitrate 42 kb/s

另外，还可以得出该文件有两路流，一路视频，一路音频。

以上这些信息都可以在一个叫 `AVFormatContext` 的结构体中得到。

除此之外，还可以看到该视频文件的分辨率是 `320x320` ，音频采样率是 `8000Hz` ，以上信息需要通过一个叫 `AVCodecContext` 的结构体去获得。

--- 

## 信息获取

本篇文章就讲一讲如何获得 `AVFormatContext` 并查看它的信息。

核心代码很简单如下：

```cpp
    // 声明并初始化 AVFormatContext
    AVFormatContext * fmt_ctx = avformat_alloc_context();

    int ret = RET_OK;
    
    // 打开文件
    if ((ret = avformat_open_input(&fmt_ctx, filename, nullptr, nullptr)) < 0) {
        logE( "Cannot open input file");
        return ret;
    }
    
    // 获取文件流相关信息
    if ((ret = avformat_find_stream_info(fmt_ctx, nullptr)) < 0) {
        logE("Cannot find stream information");
        return ret;
    }
```

只有三个简单的函数调用：

### avformat_alloc_context

作用如下：

* 用来初始化 AVFormatContext 结构体的
* 要配套使用 avformat_free_context 来释放

### avformat_open_input 

作用如下：

* 打开输入文件，通过读取文件头 AVFormatContext 就已经能够获取部分信息了，比如文件地址、文件封装格式、有多少路流等等。

* 但是更多详细信息还需要通过其他方法来获取，比如流信息
      
* 要配套使用 avformat_close_input 来关闭文件，并且要在 avformat_free_context 之前调用，否则就出问题了。


### avformat_find_stream_info

* 探测得到视频文件的具体流信息

### av_dump_format

通过改方法可以打印相关的文件信息，它的输出和 FFmpeg 命令行输出的内容基本一样。

具体使用： 

```cpp
av_dump_format(mFormatContext,0,filename,0);
```


最后要进行相关结构体的释放，不要忘了释放的顺序。

```cpp
avformat_close_input(&mFormatContext);
avformat_free_context(mFormatContext);
```

--- 

## 信息查看

当运行成功后，就可以查看 `AVFormatContext` 包含的具体信息了。

先通过 CLion 的 `Structure` 工具查看 `AVFormatContext` 具体包含哪些信息。

![](https://ae01.alicdn.com/kf/Haba3869049d04f4a842cbf5568ffb115j.jpg)

> 在 Android Studio 中也可以这样进行查看，方便快速阅读源码。

然后就可以通过打 Log 或者断点的方式查看运行后的具体某个数据是否符合预期了。

以下是通过断点的方式：

![](https://ae01.alicdn.com/kf/Hc1e0f99c4761407fb678dd9097e58a20P.jpg)

以下是通过打 Log 的方式：

```cpp
    logI("file path is %s", mFormatContext->filename);
    logI("iformat name is %s", mFormatContext->iformat->name);
    logI("nb_streams is %d", mFormatContext->nb_streams);
    logI("bitrate is %lld", mFormatContext->bit_rate);
    logI("duration is %lld", mFormatContext->duration);
    logI("start time is %lld",mFormatContext->start_time);
```

打印的结果如下：

```cpp
 [av-beginner]: iformat name is avi
 [av-beginner]: nb_streams is 2
 [av-beginner]: bitrate is 42912
 [av-beginner]: duration is 12000000
 [av-beginner]: start time is 0
```

可以看到和通过命令行显示的内容基本一致，除了在比特率上在有着些许误差，总的来说符合预期。

想要看更多信息的话，自己也可以去打印或者断点查看。

## 总结

以上就是音视频基础学习连载的 011 篇。

通过代码来查看文件信息，信息都存储在 `AVFormatContext` 的各个字段上，只是通过一些方法去获取、填充这些字段。

后面会继续讲到如何创建和获取 `AVCodecContext` ，敬请期待~~~

本文具体代码见仓库：

> https://github.com/glumes/av-beginner

仓库的代码会比文章提前更新，想要抢先知道后续内容，就关注代码吧，欢迎 star 。

能力有限，文中有不对之处，欢迎加我微信 ezglumes 进行交流~~