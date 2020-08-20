---
title: "MediaCodec 硬编码之相机内容编码成 H264 文件"
date: 2018-09-19T23:39:28+08:00
subtitle: ""
tags: ["MediaCodec","YUV","H264","Camera"]
categories: ["Android"]
comments: true
draft: false
original: true
addwechat: true
---

> 避免图片丢失，建议阅读微信原文：
> 
> https://mp.weixin.qq.com/s/8Kq9JgvGhlJCpNIyb7zK2w

在 Android 4.1 版本提供了 MediaCodec 接口来访问设备的编解码器，不同于 FFmpeg 的软件编解码，它采用的是硬件编解码能力，因此在速度上会比软解更具有优势，但是由于 Android 的碎片化问题，机型众多，版本各异，导致 MediaCodec 在机型兼容性上需要花精力去适配，并且编解码流程不可控，全交由厂商的底层硬件去实现，最终得到的视频质量不一定很理想。

虽然 MediaCodec 仍然存在一定的弊端，但是对于快速实现编解码需求，还是很值得参考的。

以将相机预览的 YUV 数据编码成 H264 视频流为例来解析 MediaCodec 的使用。


<!--more-->

## 使用解析

### MediaCodec 工作模型

下图展示了 MediaCodec 的工作方式，一个典型的生产者消费者模型，两边的 Client 分别代表输入端和输出端，输入端将数据交给 MediaCodec 进行编码或者解码，而输出端就得到编码或者解码后的内容。

![](https://image.glumes.com/images/2019/04/27/bc32fd77gy1fufzrm63n9j21no0oc0wm.jpg)

输入端和输出端是通过输入队列缓冲区和输出队列缓冲区，两条缓冲区队列的形式来和 MediaCodec  传递数据。

首先从输入队列中出队得到一个可用的缓冲区，将它填满数据之后，再将缓冲区入队，交由 MediaCodec 去处理。

MediaCodec 处理完了之后，再从输出队列中出队得到一个可用的缓冲区，这个缓冲里面的数据就是编码或者解码后的数据了，把这些数据进行相应的处理之后，还需要释放这个缓冲区，让它回到队列中去，可供下一次使用。

### MediaCodec 生命周期

另外，MediaCodec 也存在相应的 **生命周期**，如下图所示：

![](https://image.glumes.com/images/2019/04/27/bc32fd77gy1fug07wfwvwj20tk0kttaw.jpg)


当创建了 MediaCodec 之后，是处于未初始化的 `Uninitialized` 状态，调用 configure 方法之后就处于 `Configured` 状态，调用了 start 方法之后，就处于 `Executing` 状态。

在 `Executing` 状态下开始处理数据，它又有三个子状态，分别是：

*	Flushed
*	Running
*	End of Stream

当一调用 start 方法之后，就进入了 `Flushed` 状态，从输入缓冲区队列中取出一个缓冲区就进入了 `Running` 状态，当入队的缓冲区带有 `EOS` 标志时， 就会切换到 `End of Stream` 状态， MediaCodec 不再接受入队的缓冲区，但是仍然会对已入队的且没有进行编解码操作的缓冲区进行操作、输出，直到输出的缓冲区带有 `EOS` 标志，表示编解码操作完成了。

在 `Executing` 状态下可以调用 flush 方法，使 MediaCodec 切换到 `Flushed` 状态。

在 `Executing` 状态下可以调用 stop 方法，使 MediaCodec 切换到 `Uninitialized` 状态，然后再次调用 configure 方法进入 `Configured` 状态。另外，当调用 reset 方法也会进入到 `Uninitialized` 状态。

当不再需要 MediaCodec 时，调用 release 方法将它释放掉，进入 `Released` 状态。

当 MediaCodec 工作发生异常时，会进入到 `Error` 状态，此时还是可以通过 reset 方法恢复过来，进入 `Uninitialized` 状态。

 
### MediaCodec 调用流程
 
理解了 MediaCodec 的生命周期和工作流程之后，就可以上手来进行编码工作了。

以 MediaCodec 同步调用为例，使用过程如下：

```java
 // 创建 MediaCodec，此时是 Uninitialized 状态
 MediaCodec codec = MediaCodec.createByCodecName(name);
 // 调用 configure 进入 Configured 状态
 codec.configure(format, …);
 MediaFormat outputFormat = codec.getOutputFormat(); // option B
 // 调用 start 进入 Executing 状态，开始编解码工作
 codec.start();
 for (;;) {
   // 从输入缓冲区队列中取出可用缓冲区，并填充数据
   int inputBufferId = codec.dequeueInputBuffer(timeoutUs);
   if (inputBufferId >= 0) {
     ByteBuffer inputBuffer = codec.getInputBuffer(…);
     // fill inputBuffer with valid data
     …
     codec.queueInputBuffer(inputBufferId, …);
   }
   // 从输出缓冲区队列中拿到编解码后的内容，进行相应操作后释放，供下一次使用
   int outputBufferId = codec.dequeueOutputBuffer(…);
   if (outputBufferId >= 0) {
     ByteBuffer outputBuffer = codec.getOutputBuffer(outputBufferId);
     MediaFormat bufferFormat = codec.getOutputFormat(outputBufferId); // option A
     // bufferFormat is identical to outputFormat
     // outputBuffer is ready to be processed or rendered.
     …
     codec.releaseOutputBuffer(outputBufferId, …);
   } else if (outputBufferId == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
     // Subsequent data will conform to new format.
     // Can ignore if using getOutputFormat(outputBufferId)
     outputFormat = codec.getOutputFormat(); // option B
   }
 }
 // 调用 stop 方法进入 Uninitialized 状态
 codec.stop();
 // 调用 release 方法释放，结束操作
 codec.release();
```

## 代码解析

###  MediaFormat 设置

首先需要创建并设置好 MediaFormat 对象，它表示媒体数据格式的相关信息，对于视频主要有以下信息要设置：

*	颜色格式
*	码率
*	码率控制模式
*	帧率
*	I 帧间隔

其中，码率就是指单位传输时间传送的数据位数，一般用 `kbps` 即千位每秒来表示。而帧率就是指每秒显示的帧数。

其实对于码率有三种模式可以控制：

*	BITRATE_MODE_CQ
	*	表示不控制码率，尽最大可能保证图像质量
*	BITRATE_MODE_VBR
	*	表示 MediaCodec 会根据图像内容的复杂度来动态调整输出码率，图像负责则码率高，图像简单则码率低
*	BITRATE_MODE_CBR
	*	表示 MediaCodec 会把输出的码率控制为设定的大小

	
对于颜色格式，由于是将 YUV 数据编码成 H264，而 YUV 格式又有很多，这又涉及到机型兼容性问题。在对相机编码时要做好格式的处理，比如相机使用的是 `NV21` 格式，MediaFormat 使用的是 `COLOR_FormatYUV420SemiPlanar`，也就是 `NV12` 模式，那么就得做一个转换，把 `NV21` 转换到 `NV12` 。

对于 I 帧间隔，也就是隔多久出现一个 H264 编码中的 I 帧。

完整 MediaFormat 设置示例：

```java
        MediaFormat mediaFormat = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height);
        mediaFormat.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar);
        // 马率
        mediaFormat.setInteger(MediaFormat.KEY_BIT_RATE, width * height * 5);
        // 调整码率的控流模式
        mediaFormat.setInteger(MediaFormat.KEY_BITRATE_MODE, MediaCodecInfo.EncoderCapabilities.BITRATE_MODE_VBR);
        // 设置帧率 
        mediaFormat.setInteger(MediaFormat.KEY_FRAME_RATE, 30);
        // 设置 I 帧间隔
        mediaFormat.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);
```

当开始编解码操作时，开启编解码线程，处理相机预览返回的 YUV 数据。

在这里用到了相机的一个封装库：

> [https://github.com/glumes/EzCameraKit](https://github.com/glumes/EzCameraKit)


### 编解码操作

编解码操作代码如下：

```java
while (isEncoding) {
    // YUV 颜色格式转换
    if (!mEncodeDataQueue.isEmpty()) {
        input = mEncodeDataQueue.poll();
        byte[] yuv420sp = new byte[mWidth * mHeight * 3 / 2];
        NV21ToNV12(input, yuv420sp, mWidth, mHeight);
        input = yuv420sp;
    }
    if (input != null) {
        try {
            // 从输入缓冲区队列中拿到可用缓冲区，填充数据，再入队
            ByteBuffer[] inputBuffers = mMediaCodec.getInputBuffers();
            ByteBuffer[] outputBuffers = mMediaCodec.getOutputBuffers();
            int inputBufferIndex = mMediaCodec.dequeueInputBuffer(-1);
            if (inputBufferIndex >= 0) {
                // 计算时间戳
                pts = computePresentationTime(generateIndex);
                ByteBuffer inputBuffer = inputBuffers[inputBufferIndex];
                inputBuffer.clear();
                inputBuffer.put(input);
                mMediaCodec.queueInputBuffer(inputBufferIndex, 0, input.length, pts, 0);
                generateIndex += 1;
            }
            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
            int outputBufferIndex = mMediaCodec.dequeueOutputBuffer(bufferInfo, TIMEOUT_USEC);
            // 从输出缓冲区队列中拿到编码好的内容，对内容进行相应处理后在释放
            while (outputBufferIndex >= 0) {
                ByteBuffer outputBuffer = outputBuffers[outputBufferIndex];
                byte[] outData = new byte[bufferInfo.size];
                outputBuffer.get(outData);
                // flags 利用位操作，定义的 flag 都是 2 的倍数
                if ((bufferInfo.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) { // 配置相关的内容，也就是 SPS，PPS
                    mOutputStream.write(outData, 0, outData.length);
                } else if ((bufferInfo.flags & MediaCodec.BUFFER_FLAG_KEY_FRAME) != 0) { // 关键帧
					mOutputStream.write(outData, 0, outData.length);
                } else {
                    // 非关键帧和SPS、PPS,直接写入文件，可能是B帧或者P帧
                    mOutputStream.write(outData, 0, outData.length);
                }
                mMediaCodec.releaseOutputBuffer(outputBufferIndex, false);
                outputBufferIndex = mMediaCodec.dequeueOutputBuffer(bufferInfo, TIMEOUT_USEC);
            }
        } catch (IOException e) {
            Log.e(TAG, e.getMessage());
        }
    } else {
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Log.e(TAG, e.getMessage());
        }
    }
}
```

首先，要把要把相机的 `NV21` 格式转换成 `NV12` 格式，然后 通过 `dequeueInputBuffer` 方法去从可用的输入缓冲区队列中出队取出缓冲区，填充完数据后再通过 `queueInputBuffer` 方法入队。

`dequeueInputBuffer` 返回缓冲区索引，如果索引小于 0 ，则表示当前没有可用的缓冲区。它的参数 `timeoutUs` 表示超时时间 ，毕竟用的是 MediaCodec 的同步模式，如果没有可用缓冲区，就会阻塞指定参数时间，如果参数为负数，则会一直阻塞下去。

`queueInputBuffer` 方法将数据入队时，除了要传递出队时的索引值，然后还需要传入当前缓冲区的时间戳 `presentationTimeUs` 和当前缓冲区的一个标识 `flag` 。

其中，时间戳通常是缓冲区渲染的时间，而标识则有多种标识，标识当前缓冲区属于那种类型：

*	BUFFER_FLAG_CODEC_CONFIG
	*	标识当前缓冲区携带的是编解码器的初始化信息，并不是媒体数据
*	BUFFER_FLAG_END_OF_STREAM
	*	结束标识，当前缓冲区是最后一个了，到了流的末尾
*	BUFFER_FLAG_KEY_FRAME
	*	表示当前缓冲区是关键帧信息，也就是 I 帧信息

在编码的时候可以计算当前缓冲区的时间戳，也可以直接传递 0 就好了，对于标识也可以直接传递 0 作为参数。

把数据传入给 MediaCodec 之后，通过 `dequeueOutputBuffer` 方法取出编解码后的数据，除了指定超时时间外，还需要传入 `MediaCodec.BufferInfo` 对象，这个对象里面有着编码后数据的长度、偏移量以及标识符。

取出 `MediaCodec.BufferInfo` 内的数据之后，根据不同的标识符进行不同的操作：

*	BUFFER_FLAG_CODEC_CONFIG
	*	表示当前数据是一些配置数据，在 H264 编码中就是 SPS 和 PPS 数据，也就是 `00 00 00 01 67` 和 `00 00 00 01 68` 开头的数据，这个数据是必须要有的，它里面有着视频的宽、高信息。
*	BUFFER_FLAG_KEY_FRAME
	*	关键帧数据，对于 I 帧数据，也就是开头是 `00 00 00 01 65` 的数据，
*	BUFFER_FLAG_END_OF_STREAM
	*	表示结束，MediaCodec 工作结束

对于返回的 flags ，不符合预定义的标识，则可以直接写入，那些数据可能代表的是 H264 中的 P 帧 或者 B 帧。

对于编解码后的数据，进行操作后，通过 `releaseOutputBuffer` 方法释放对应的缓冲区，其中第二个参数 `render` 代表是否要渲染到 surface 上，这里暂时不需要就为 false 。


### 停止编码

当想要停止编码时，通过 MediaCodec 的 `stop` 方法切换到 `Uninitialized` 状态，然后再调用 `release` 方法释放掉。

这里并没有采用使用 `BUFFER_FLAG_END_OF_STREAM` 标识符的方式来停止编码，而是直接切换状态了，在通过 Surface 方式进行录制时，再去采用这种方式了。

对于 MediaCodec 硬编码解析之相机内容编码成 H264 文件就到这里了，主要还是讲述了关于 MediaCodec 的使用，一旦熟悉使用了，完成编码工作也就很简单了。



## 参考

1. [android MediaCodec解析](https://wangyantao.github.io/mediacodec/)
2. [谈谈关于Android视频编码的那些坑](http://ragnraok.github.io/android_video_record.html)

