---
title: "Android Camera 模型及 API 接口演变"
date: 2018-04-12T13:13:57+08:00
subtitle: ""
draft: false
categories: ["android"]
tags: ["Camera","Android"]
comments: true

---

要了解 Android Camear 相机模型的演变，首先还是得了解硬件抽象层 HAL 相关的知识内容。

<!--more-->

可以通过这篇文章了解相关知识 [Android 硬件抽象层调用流程小结](https://glumes.com/post/android/android-hal-summary/)，包括底层驱动、HAL 硬件抽象层接口、应用层到 HAL 的调用流程。

基本上 HAL 的调用流程都是相似的，对于 Camera 也是这样。

![Android Camera HAL 调用](http://7xqe3m.com1.z0.glb.clouddn.com/blog_camera_java_to_kernel.png)

应用进程通过 Binder 通信得到一个系统服务，这个系统服务就是用来访问硬件的。

系统服务最后都是通过 HAL 的接口来访问硬件的驱动程序，从而最终访问硬件设备。

而 HAL 接口的实现方式则是由不同厂商去完成的，只需要按照接口定义的规范实现就好。

正是由于 Android Camera 的硬件抽象层发生了变化，访问硬件的方式有所改变，才导致相机模型发生变化，上层 API 接口也就随之变化了。

当了解了这些变化之后，再回过头去看 Camera 的 API 调用就显得清晰多了。

## Android Camera 1.0 的相机模型

Android 5.0 之前的 Camera 版本，功能比较单一，不像 5.0 之后那样支持很多特性，这也是由于它的 HAL 所决定的。

用的是 `android.hardware.Camera` 包下的内容，回顾一下 Camera 1.0 的调用流程：

*	创建预览类 （ SurfaceView ）
*	 打开相机（ Camera.open ） 
*	 设置预览 （ setPreviewDisplay ）
*	 开始预览（ startPreview ）
*	 对焦（ autoFocus ）
*	 拍摄（ takePicture ）
*	 拍照监听器处理（ PictureCallback ）

![Android 5.0 之前 HAL 接口](http://7xqe3m.com1.z0.glb.clouddn.com/blog_camera_block.png)

HAL 接口被设计成了三种运行模式：

*	预览
*	静态拍摄
*	视频录制

其中，预览对应于代码中 Camera 类的 `startPreview` 函数，而静态拍摄对应于 Camera 类的 `takePicture` 函数，视频录制则是在 `MediaRecorder` 类的 `setCamera` 函数中传入 Camera 对象实例。

三种模式具有略有不同又相互重叠的功能。这样就难以实现新类型的功能（例如连拍模式），因为新类型的功能会介于其中两种模式之间。

从图中可以看到，应用层 Camera 会发出一个请求队列到 HAL ，请求队列中的每个请求都对应三种运行模式中的一种。

当你想要在预览时拍照，然后再返回预览模式，那么就得在拍照前发送请求切换到静态拍摄模式，拍完后再发送请求切换到预览模式。


## Android Camera 2.0 的相机模型

在 Android 5.0 之后，相机 API 就有了较大的变化，用的是 `android.hardware.camera2` 包下的内容了。

回顾一下 Camera 2.0 的调用流程：

*	创建预览类（ SurfaceView 或者 TextureView 都行）
*	打开相机（ CameraManager.openCamera ）
*	相机回调（ CemeraDevice.StateCallback ）
*	创建 CameraCaptureSession 会话（ createCaptureSession ）
*	创建一个进行预览的请求（ CaptureRequest.Builder ）
*	预览请求中设置输出的 Surface（ addTarget ）
*	在会话中发出预览的请求（ setRepeatingRequest ）
*	在会话的回调类中处理发出请求的结果（ CameraCaptureSession.CaptureCallback ）
*	拍照时，创建一个拍照的请求（ CaptureRequest ）
*	在会话中发出拍照的请求（ capture ）
*	在会话的回调类中处理发出请求的结果（ CameraCaptureSession.CaptureCallback ）

以上就是 Camera 2.0 相关的调用流程和对应的重要函数，大致就是每做一次操作都要在会话中发出一次请求。

更具体的如下极客学院流程图所示：

![Android Camera 2.0 调用](http://wiki.jikexueyuan.com/project/android-actual-combat-skills/images/33-3.png)


Camera 2.0 的架构将多个运行模式整合为一个统一的视图，可以使用这种视图实现之前的任何模式以及一些其他模式，如连拍模式。这样一来，便可以提高用户对聚焦、曝光以及更多后期处理（例如降噪、对比度和锐化）效果的控制能力。此外，这种简化的视图还能够使应用开发者更轻松地使用相机的各种功能。


Camera 2.0 将相机系统塑造为一个管道，该管道可按照 1:1 的基准将传入的帧捕获请求转化为帧。这些请求会封装有关帧的捕获和处理的所有配置信息，其中包括分辨率和像素格式；手动传感器、镜头和闪光灯控件；3A 运行模式；RAW->YUV 处理控件；统计信息生成等等。

简单来说，应用框架从相机系统请求帧，然后相机系统将结果返回到输出流。

可以将 Camera 2.0 看作是 Camera 1.0 的单向流管道。它会将每个捕获请求转化为传感器捕获的一张图像，这张图像将被处理成：

*	包含有关捕获的元数据的结果对象。
*	图像数据的 1 到 N 个缓冲区，每个缓冲区会进入自己的目的地 Surface。也就是我们创建 CaptureRequest 时的 addTarget 添加的 Surface。

可能的输出 Surface 组经过预配置：

*	每个 Surface 都是一个固定分辨率的图像缓冲区流的目标位置
*	一次只能将少量的 Surface 配置为输出（约 3 个）


一个请求中包含所需的全部捕获设置，以及要针对该请求将图像缓冲区推送到其中的输出 Surface 的列表。请求可以只发生一次（使用 capture ），也可以无限重复（使用 setRepeatingRequest ）。捕获的优先级高于重复请求的优先级。

![相机运行核心模式](http://7xqe3m.com1.z0.glb.clouddn.com/camera_simple_model.png)


如上图所示，一个 capture 请求，左边就是要输出的目的 Surface 列表。而 CameraDevice 框内的就是请求的队列。相机的硬件设备会处理每个请求，将图像数据的缓冲区输出到设置的目的 Surface 中，同时在回调的 onCaptureComplete 方法中处理请求的结果 CaptureResult。

就是这样一个队列模型，相机系统不断地处理队列中的请求，并且一次可以发起多个请求，而且提交的请求不会出现阻塞的情况，请求始终按照接收的顺序处理。

同样的，如果想要实现连拍功能，只要不断发送捕获的请求 capture 就好了，而不需要像之前一样每次拍完照还得设置回预览模式。


## 相机模型


这是一个更全面的相机模型图：

![相机模型](http://7xqe3m.com1.z0.glb.clouddn.com/camera_model.png)


在模型图里把一些主要函数和流程图都绘制包含进去了。我们调用的流程基本也是顺着紫色的 API 接口来的。

可以看到，相机可以设置六种类型的 Surface 输出：

*	MediaRecorder
*	SurfaceView
*	RenderScriptAllocation
*	ImageReader
*	MediaCodec
*	SurfaceTexture

而在 CameraCaptureSession 会话类中，发出的请求方法有如下：

*	capture()
*	captureBurst()
*	setStreamingRequest()
*	setStreamingBurst()
*	stopRepeating()

发出请求后，交由相机硬件去处理，处理后的会先将图像数据输出到缓冲区，然后再从缓冲区输出到设置的目的 Surface。

同时，在会话中发出请求，在请求的回调中还会返回 CaptureResult 这样的请求结果，相当于是一个请求有两个返回的来源了。

经过这样的理解安卓相机模型之后，再去看 API 的调用就不会那么困惑了。

关于 Android Camera 的相关代码，可以参考我的 Github 工程：[https://github.com/glumes/Camera2Sample](https://github.com/glumes/Camera2Sample)。

## 参考
1、https://source.android.com/devices/camera/
