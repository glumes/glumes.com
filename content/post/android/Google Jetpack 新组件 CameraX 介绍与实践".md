---
title: "Google Jetpack 新组件 CameraX 介绍与实践"
date: 2019-05-23T08:50:23+08:00
subtitle: ""
tags: []
categories: ["android"]
comments: true
draft: false
original: true
bigimg: [{src: "/img/banner.jpg", desc: ""}]
slug: "google-jetpack-camerax"
---

> 避免图片丢失，建议阅读微信原文：
> 
> https://mp.weixin.qq.com/s/geCmI9XovmxyaA437JIewg

近期，Google 的 Jetpack 组件又出了新的库：CameraX 。

顾名思义：CameraX 就是用来进行 Camera 开发的官方库了，而且后续会有 Google 进行维护和升级。这对于广大 Camera 开发工程师和即将成为 Camera 的程序员来说，真是个好消息~~~


## CameraX 介绍

官方有给出一个示例的工程，我 fork 了之后，加入使用 OpenGL 黑白滤镜渲染的操作，具体地址如下：

> [https://github.com/glumes/camera](https://github.com/glumes/camera)

官方并没有提到 CameraX 库具体如何进行 OpenGL 线程渲染的， 继续往下看，你会找到答案的~~~

关于 CameraX 更多的介绍，建议看看 Google I/O 大会上的视频记录，比看文档能了解更多内容~~~


> [https://www.youtube.com/watch?v=kuv8uK-5CLY](https://www.youtube.com/watch?v=kuv8uK-5CLY)


在视频中提到，目前有很多应用都开始接入了 CameraX，比如 Camera360、Tik Tok 等。

![](https://image.glumes.com/images/2019/05/22/-2019-05-23-8.35.08.png)


<!--more-->

## 简述 Camera 开发

关于 Camera 的开发，之前也有写过相关的文章🤔

> [Android 相机开发中的尺寸和方向问题](https://glumes.com/post/android/android-camera-aspect-ratio-and-orientation/)

> [Android Camera 模型及 API 接口演变](https://glumes.com/post/android/android-camrea-api-evolution/)


对于一个简单能用的 Camera 应用（Demo 级别）来说，关注两个方面就好了：预览和拍摄。

而预览和拍摄的图像都受到分辨率、方向的影响。Camera 最必备的功能就是能针对预览和拍摄提供两套分辨率，因此就得区分场景去设置。

对于拍摄还好说一点，要获得最好的图像质量，就选择同比例中分辨率最大的吧。

而预览的图像最终要呈现到 Android 的 Surface 上，因此选择分辨率的时候要考虑 Surface 的宽高比例，不要出现比例不匹配导致图像拉伸的现象。

另外，如果要做美颜、滤镜类的应用，就要把 Camera 预览的图像放到 OpenGL 渲染的线程上去，然后由 OpenGL 去做图像相关的操作，也就没 Camera 什么事了。等到拍摄图片时，可以由 OpenGL 去获取图像内容，也可以由 Camera 获得图像内容，然后经过 OpenGL 做离屏处理~~~

至于 Camera 开发的其他功能，比如对焦、曝光、白平衡、HDR 等操作，不一定所有的 Camera 都能够支持，而且也可以在上面的基础上当做 Camera 的一个 feature 去拓展开发，并不算难事，这也是一个 Camera 开发工程师进阶所要掌握的内容~~

## CameraX 开发实践

CameraX 目前的版本是 `1.0.0-alpha01` ，在使用时要添加如下的依赖：

```kotlin
    // CameraX
    def camerax_version = "1.0.0-alpha01"
    implementation "androidx.camera:camera-core:${camerax_version}"
    implementation "androidx.camera:camera-camera2:${camerax_version}"
```

CameraX 向后兼容到 Android 5.0（API Level 21），并且它是基于 Camera 2.0 的 API 进行封装的，解决了市面上绝大部分手机的兼容性问题~~~

相比 Camera 2.0 复杂的调用流程，CameraX 就简化很多，只关心我们需要的内容就好了，不像前者得自己维护 CameraSession 会话等状态，并且 CameraX 和 Jetpack 主打的 Lifecycle 绑定在一起了，什么时候该打开相机，什么时候该释放相机，都交给 Lifecycle 生命周期去管理吧


上手 CameraX 主要关注三个方面：

*   图像预览（Image Preview）
*   图像分析（Image analysis）
*   图像拍摄（Image capture）


### 预览

不管是 预览 还是 图像分析、图像拍摄，CameraX 都是通过一个建造者模式来构建参数 Config 类，再由 Config 类创建预览、分析器、拍摄的类，并在绑定生命周期时将它们传过去。

```kotlin
// // Apply declared configs to CameraX using the same lifecycle owner
CameraX.bindToLifecycle(
               lifecycleOwner: this, preview, imageCapture, imageAnalyzer)
```

既可以绑定 Activity 的 Lifecycle，也可以绑定 Fragment 的。

当需要解除绑定时：

```kotlin
// Unbinds all use cases from the lifecycle and removes them from CameraX.
 CameraX.unbindAll()
```

关于预览的参数配置，如果你有看过之前的文章：[Android 相机开发中的尺寸和方向问题](https://glumes.com/post/android/android-camera-aspect-ratio-and-orientation/) 想必就会很了解了。

提供我们的目标参数，由 CameraX 去判断当前 Camera 是否支持，并选择最符合的。

```kotlin
fun buildPreviewUseCase(): Preview {
    val previewConfig = PreviewConfig.Builder()
        // 宽高比
        .setTargetAspectRatio(aspectRatio)
        // 旋转
        .setTargetRotation(rotation)
        // 分辨率
        .setTargetResolution(resolution)
        // 前后摄像头
        .setLensFacing(lensFacing)
        .build()
    
    // 创建 Preview 对象
    val preview = Preview(previewConfig)
    // 设置监听
    preview.setOnPreviewOutputUpdateListener { previewOutput ->
        // PreviewOutput 会返回一个 SurfaceTexture
        cameraTextureView.surfaceTexture = previewOutput.surfaceTexture
    }

    return preview
}
```


通过建造者模式创建 `Preview` 对象，并且一定要给 Preview 对象设置 `OnPreviewOutputUpdateListener` 接口回调。

相机预览的图像流是通过 SurfaceTexture 来返回的，而在项目例子中，是通过把 TextureView 的 SurfaceTexture 替换成 CameraX 返回的 SurfaceTexture，这样实现了 TextureView 控件显示 Camera 预览内容。


另外，还需要考虑到设备的选择方向，当设备横屏变为竖屏了，TextureView 也要相应的做旋转。

```kotlin
preview.setOnPreviewOutputUpdateListener { previewOutput ->
    cameraTextureView.surfaceTexture = previewOutput.surfaceTexture

    // Compute the center of preview (TextureView)
    val centerX = cameraTextureView.width.toFloat() / 2
    val centerY = cameraTextureView.height.toFloat() / 2

    // Correct preview output to account for display rotation
    val rotationDegrees = when (cameraTextureView.display.rotation) {
        Surface.ROTATION_0 -> 0
        Surface.ROTATION_90 -> 90
        Surface.ROTATION_180 -> 180
        Surface.ROTATION_270 -> 270
        else -> return@setOnPreviewOutputUpdateListener
    }

    val matrix = Matrix()
    matrix.postRotate(-rotationDegrees.toFloat(), centerX, centerY)

    // Finally, apply transformations to TextureView
    cameraTextureView.setTransform(matrix)
}
```

TextureView 旋转的设置同样在 `OnPreviewOutputUpdateListener` 接口中去完成。

### 图像分析

在 `bindToLifecycle` 方法中，`imageAnalyzer` 参数并不是必需的。

`ImageAnalysis` 可以帮助我们做一些图像质量的分析，需要我们去实现 `ImageAnalysis.Analyzer` 接口的 `analyze` 方法。

```kotlin
fun buildImageAnalysisUseCase(): ImageAnalysis {
    // 分析器配置 Config 的建造者
    val analysisConfig = ImageAnalysisConfig.Builder()
        // 宽高比例
        .setTargetAspectRatio(aspectRatio)
        // 旋转
        .setTargetRotation(rotation)
        // 分辨率
        .setTargetResolution(resolution)
        // 图像渲染模式
        .setImageReaderMode(readerMode)
        // 图像队列深度
        .setImageQueueDepth(queueDepth)
        // 设置回调的线程
        .setCallbackHandler(handler)
        .build()
    
    // 创建分析器 ImageAnalysis 对象
    val analysis = ImageAnalysis(analysisConfig)
    
    // setAnalyzer 传入实现了 analyze 接口的类
    analysis.setAnalyzer { image, rotationDegrees ->
        // 可以得到的一些图像信息，参见 ImageProxy 类相关方法
        val rect = image.cropRect
        val format = image.format
        val width = image.width
        val height = image.height
        val planes = image.planes
    }

    return analysis
}
```

在图像分析器的相关配置中，有个 `ImageReaderMode` 和 `ImageQueueDepth` 的设置。

ImageQueueDepth 会指定相机管线中图像的个数，提高 ImageQueueDepth 的数量会对相机的性能和内存的使用造成影响

其中，ImageReaderMode 有两种模式：

* ACQUIRE_LATEST_IMAGE
    * 该模式下，获得图像队列中最新的图片，并且会清空队列已有的旧的图像。
* ACQUIRE_NEXT_IMAGE
    * 该模式下，获得下一张图像。


在图像分析的 `analyze` 方法中，能通过 ImageProxy 类拿到一些图像信息，并基于这些信息做分析。

### 拍摄

拍摄同样有一个 Config 参数构建者类，而且设定的参数和预览相差不大，也是图像宽高比例、旋转方向、分辨率，除此之外还有闪光灯等配置项。

```kotlin
fun buildImageCaptureUseCase(): ImageCapture {
    val captureConfig = ImageCaptureConfig.Builder()
        .setTargetAspectRatio(aspectRatio)
        .setTargetRotation(rotation)
        .setTargetResolution(resolution)
        .setFlashMode(flashMode)
        // 拍摄模式
        .setCaptureMode(captureMode)
        .build()
    
    // 创建 ImageCapture 对象
    val capture = ImageCapture(captureConfig)
    cameraCaptureImageButton.setOnClickListener {
        // Create temporary file
        val fileName = System.currentTimeMillis().toString()
        val fileFormat = ".jpg"
        val imageFile = createTempFile(fileName, fileFormat)
        
        // Store captured image in the temporary file
        capture.takePicture(imageFile, object : ImageCapture.OnImageSavedListener {
            override fun onImageSaved(file: File) {
                // You may display the image for example using its path file.absolutePath
            }

            override fun onError(useCaseError: ImageCapture.UseCaseError, message: String, cause: Throwable?) {
                // Display error message
            }
        })
    }

    return capture
}
```

在图像拍摄的相关配置中，也有个 `CaptureMode` 的设置。

它有两种选项：

* MIN_LATENCY
    * 该模式下，拍摄速度会相对快一点，但图像质量会打折扣
* MAX_QUALITY
    * 该模式下，拍摄速度会慢一点，但图像质量好


### OpenGL 渲染


以上是关于 CameraX 的简单应用方面的内容，更关心的是如何用 CameraX 去做 OpenGL 渲染实现美颜。滤镜等效果。

还记得在图像预览 Preview 的 setOnPreviewOutputUpdateListener 方法中，会返回一个 `SurfaceTexture` ，相机的图像流就是通过它返回的。

那么要实现 OpenGL 线程的渲染，首先就要基于 EGL 去创建 OpenGL 绘制环境，然后利用 SurfaceTexture 的 `attachToGLContext` 方法，将 SurfaceTexture 添加到 OpenGL 线程去。

attachToGLContext 的参数是一个纹理 ID ，这个纹理就必须是 OES 类型的纹理。

然后再把这纹理 ID 绘制到 OpenGL 对应的 Surface 上，这可以看成是两个不同的线程在允许，一个 Camera 预览线程，一个 OpenGL 绘制线程。

如果你不是很理解的话，建议还是看看上面提供的代码地址：

> [https://github.com/glumes/camera](https://github.com/glumes/camera)

也可以关注我的微信公众号 【纸上浅谈】，里面有一些关于 OpenGL 学习和实践的文章~~~

## CameraX 的拓展

如果你看了 Google I/O 大会的视频，那肯定了解 CameraX 的拓展属性。

在视频中提到 Google 也正在和华为、三星、LG、摩托摩拉等厂商进行合作，为了获得厂商系统相机的一些能力，比如 HDR 等。

不过考虑到目前的形势，可能和华为的合作难以继续下去了吧...

但还是期待 CameraX 能给带来更多的新特性吧~~~


## 参考

1. https://www.youtube.com/watch?v=kuv8uK-5CLY
2. https://proandroiddev.com/android-camerax-preview-analyze-capture-1b3f403a9395
