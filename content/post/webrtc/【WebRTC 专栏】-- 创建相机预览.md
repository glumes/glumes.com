---
title: 【WebRTC 专栏】--创建相机预览
date: 2021-09-02T10:49:02+08:00
subtitle: ""
tags:
  - webrtc
categories:
  - media-development
slug: webrtc-setup-camera-preview
comments: true
draft: false
original: true
image: /banner/error-6984855.svg
---

用 WebRTC 创建相机预览，不到 50 行核心代码就可以轻松搞定了。

## WebRTC 依赖版本

直接使用官方给的版本就好了，不需要再去额外编译。

```cpp
implementation 'org.webrtc:google-webrtc:1.0.30039'
```

后面都会使用该版本做测试的。

<!--more-->

## 相机权限申请

WebRTC 虽说功能强大，代码简洁，但是并没有封装一个应用权限申请的接口，这需要自己去操作了。

## 相机预览

有个段子是把大象放进冰箱有多少步骤，共三步，打开冰箱，塞进大象，关上冰箱。

用 WebRTC 创建相机预览和上面的段子步骤一样，打开相机，设置接收，开启预览。

至于中间的繁琐步骤，比如相机创建的内部实现，预览绘制的内部实现都不用去关心了，调用好接口，设置好参数就行。

### 创建相机实例

在 WebRTC 中相机实例统一继承了 VideoCapturer 接口，不管是 Camera1 还是 Camera2 。

```cpp
public interface VideoCapturer {
    void initialize(SurfaceTextureHelper var1, Context var2, CapturerObserver var3);

    void startCapture(int var1, int var2, int var3);

    void stopCapture() throws InterruptedException;

    void changeCaptureFormat(int var1, int var2, int var3);

    void dispose();

    boolean isScreencast();
}
```

该接口也比较简单，只需要相机实例对外提供一些简单的预览能力就好。


创建相机实例的代码如下：

```cpp
private fun createVideoCapture(): VideoCapturer? {
    val enumerator = Camera1Enumerator(false)
    val deviceNames = enumerator.deviceNames

    for (deviceName in deviceNames) {
        if (enumerator.isFrontFacing(deviceName)) {
            val videoCapture = enumerator.createCapturer(deviceName, null)
            if (videoCapture != null) {
                return videoCapture
            }
        }
    }
    return null
}
```

Camera1Enumerator 是用来枚举设备上有多少摄像头的，一般只有前置和后置两种，，也可以用 Camera2Enumerator 来获取 Camera2 的相机调用。

deviceNames 对应 getDeviceNames 方法，只不过用了 kotlin 变成缩写了，它表示设备上的摄像头集合，这个接口其实就已经屏蔽了 Camera1 和 Camera2 内部检索不同摄像头的实现。

满足前后置条件时，调用 createCapturer 来创建相机实例就好了。

### 相机预览接收

需要有分别对应的组件去接收相机输出的画面并且显示到屏幕上。

显示到屏幕上的控件既不是 SurfaceView 也不是 TextureView ，而是 WebRTC 自己封装的控件 SurfaceViewRenderer 。

它其实就是继承了 SurfaceView ，并且内部有个 **SurfaceEglRenderer** 变量，用来将外界传递的 VideoFrame 绘制到屏幕上。

```cpp
<org.webrtc.SurfaceViewRenderer android:id="@+id/localView"
                            android:layout_width="match_parent"
                            android:layout_height="match_parent"/>

// SurfaceViewRenderer 的绘制方法
public void onFrame(VideoFrame frame) {
        this.eglRenderer.onFrame(frame);
}
```

SurfaceEglRenderer 也是走的 OpenGL 渲染进行预览，在创建 OpenGL 环境可以决定是否要以 ShareContext 的形式创建。

```cpp
val eglBaseContext = EglBase.create().eglBaseContext
localView.init(eglBaseContext, null)
```

接收相机预览流的组件就是 SurfaceTexture ，只不过 WebRTC 将它包装到了 SurfaceTextureHelper 变量中。

创建 SurfaceTextureHelper 的方法如下：

```cpp
val eglBaseContext = EglBase.create().eglBaseContext
val surfaceTextureHelper = surfaceTextureHelper.create("CaptureThread", eglBaseContext)
```

SurfaceTextureHelper 内部会创建一个线程，并且也可以通过外部传递 EGLContext 以决定是否要走 ShareContext 方式的调用。

有了相机实例 VideoCapturer 和接收预览的组件 SurfaceTextureHelper ，就可以将他们关联起来：

```cpp
videoCapture?.initialize(surfaceTextureHelper, applicationContext, videoSource?.capturerObserver)
videoCapture?.startCapture(480, 640, 30)
```

videoCapture 调用 initialize 方法实现两者的关联，同时 startCapture 方法决定相机采集的宽高和帧率。


### 开启相机预览

在开启相机预览时，就需要涉及到和 WebRTC 相关内容了。

WebRTC 本身是用来做即时通信的，它将音频和视频流都抽象成了一个个轨道 MediaStreamTrack ，有音频轨 AudioTrack 也有视频轨 VideoTrack。

而轨道上的内容来源就对应 MedisSource ，有音频源 AudioSource 和视频源 VideoSource 。

相机输出就是提供视频源的，需要将 VideoCapturer 和 VideoSource 关联起来。

在上面代码中 initialize 方法实际上就建立了关联。

```cpp
videoSource = videoCapture?.isScreencast?.let { factory.createVideoSource(it) }
videoCapture?.initialize(surfaceTextureHelper, applicationContext, videoSource?.capturerObserver)
```
initialize 方法的最后一个参数就是一个回调，典型的观察者模式，VideoCapturer 相关的状态都会通过 capturerObserver 通知到 VideoSource ，从而实现关联。

创建 videoSource 的 factory ，对应的就是一条即时通信端对端的连接，而 videoTrack 和 audioTrack 就是这条连接上的内容。

创建 factory 的代码比较固定：

```cpp
val options = PeerConnectionFactory.InitializationOptions.builder(this).createInitializationOptions();
PeerConnectionFactory.initialize(options)
factory = PeerConnectionFactory.builder().createPeerConnectionFactory()
```

创建 VideoTrack 的代码如下，需要将视频源和视频轨道关联起来。

```cpp
videoTrack = factory.createVideoTrack("101",videoSource)
```

完成了所有的创建和关联之后，就可以开启预览了。需要将视频轨道内容显示到画面上，也就是上面的 SurfaceViewRenderer 控件上。

```cpp
videoTrack?.addSink(localView)
```

### 完整代码示例：

```cpp
class CameraActivity : AppCompatActivity() {

    private lateinit var factory: PeerConnectionFactory
    private var videoCapture:VideoCapturer? = null
    private var videoSource: VideoSource? = null
    private var videoTrack: VideoTrack? = null
    private lateinit var localView:SurfaceViewRenderer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_camera)
        localView = findViewById(R.id.localView)
        
        val options = PeerConnectionFactory.InitializationOptions.builder(this).createInitializationOptions();
        PeerConnectionFactory.initialize(options)
        factory = PeerConnectionFactory.builder().createPeerConnectionFactory()

        val eglBaseContext = EglBase.create().eglBaseContext
        val surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", eglBaseContext)

        videoCapture = createVideoCapture()
        videoSource = videoCapture?.isScreencast?.let { factory.createVideoSource(it) }

        videoCapture?.initialize(surfaceTextureHelper, applicationContext, videoSource?.capturerObserver)
        videoCapture?.startCapture(480, 640, 30)

        localView.setMirror(true)
        localView.init(eglBaseContext, null)

        videoTrack = factory.createVideoTrack("101",videoSource)
        videoTrack?.addSink(localView)
    }

    private fun createVideoCapture(): VideoCapturer? {
        val enumerator = Camera1Enumerator(false)
        val deviceNames = enumerator.deviceNames

        for (deviceName in deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                val videoCapture = enumerator.createCapturer(deviceName, null)
                if (videoCapture != null) {
                    return videoCapture
                }
            }
        }
        return null
    }
}
```

不到 50 行代码就完成了相机预览，Github 仓库地址后续会给出。

这篇文章就先讲到这里，持续更新中~~


