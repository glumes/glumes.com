---
title: "Android Activity 创建 Window 及添加 View 流程分析"
date: 2017-12-22T15:33:22+08:00
categories: ["android"]
tags: ["Android"]
comments: true
original: true
addwechat: true
---


在之前有分析过 Android 6.0 Launcher 启动 Activity 过程，文章的链接如下：

1. [Android 6.0 Launcher 启动 Activity 过程源码分析（一）](http://www.glumes.com/start-activity-from-launcher-in-android-1/)
2. [Android 6.0 Launcher 启动 Activity 过程源码分析（二）](http://www.glumes.com/start-activity-from-launcher-in-android-2/)
3. [Android 6.0 Launcher 启动 Activity 过程源码分析（三）](http://www.glumes.com/start-activity-from-launcher-in-android-3/)
4. [Android 6.0 Launcher 启动 Activity 过程源码分析（四）](http://www.glumes.com/start-activity-from-launcher-in-android-4/)

<!--more-->

大致的总结一下：

从`ContextImpl`的`startActivity`方法开始，通过`ActivityManagerProxy`代理对象向`ActivityManagerService`发起 IPC 调用。

`ActivityManagerService`会对`startActivity`方法进行响应，处理传递过来的`Intent`。这其中包括，解析`Intent`信息，创建或分配待启动的 Activity 的 `Task`任务，将启动者 Activity 运行至`Paused`状态，创建待启动 Activity 的进程。

完成一系列准备工作之后，就该启动 Activity 了。启动的入口是`ActivityThread`类的`main`方法。在`main`方法中会开启主线程的消息循环，并调用`attch`方法，之后就是创建 Application，然后再创建 Activity。


创建 Activity 是 ActivityManagerService 进程向应用程序进程发送一个进程间通信，应用程序进程通过`handleLaunchActivity`方法进行响应，在其方法内部执行了`performLaunchActivity`方法和`handleResumeActivity`来完成启动。

在`performLaunchActivity`方法内部，通过反射创建了 Activity 类，并且调用了 Activity 类的 `attach` 方法，为其关联运行过程中所依赖的一系列上下文环境变量，比如 Activity 的 Context 就是在 attach 方法内部调用`attachBaseContext`方法添加上的，同时，还调度了待启动的 Activity 的生命周期，从  OnCreate 到 OnStart 状态 。

在`performLaunchActivity`方法后，就执行了`handleResumeActivity`方法，将 Activity 的状态运行至 `onResume` 状态，此时 Activity 就处于可见的状态了。Activity 也处于能够正常工作的状态了。

而 Activity 类的 attach 方法也就是本文要追踪的方法了，在此方法内如何为 Activity 创建 Window 的，之后才是向 Window 中添加 View。

## Window 的创建

attach 方法内创建 Window 的代码示例如下：
``` java
		mWindow = new PhoneWindow(this); // 创建 Window，实例是 PhonwWindow
        mWindow.setCallback(this);    // 设置回调
        mWindow.setOnWindowDismissedCallback(this);  // 设置回调
        mWindow.getLayoutInflater().setPrivateFactory(this);
        if (info.softInputMode != WindowManager.LayoutParams.SOFT_INPUT_STATE_UNSPECIFIED) {
            mWindow.setSoftInputMode(info.softInputMode);    // 调整键盘
        }
        if (info.uiOptions != 0) {
            mWindow.setUiOptions(info.uiOptions);
        }

        mWindow.setWindowManager(    // 设置 WindowManager
                (WindowManager)context.getSystemService(Context.WINDOW_SERVICE),
                mToken, mComponent.flattenToString(),
                (info.flags & ActivityInfo.FLAG_HARDWARE_ACCELERATED) != 0);
        if (mParent != null) {
            mWindow.setContainer(mParent.getWindow());
        }
        mWindowManager = mWindow.getWindowManager();
```

在 Android 6.0 的源码中，创建 Window 不再采用策略模式了，直接创建了 PhoneWindow。Window 是一个抽象类，它的唯一实现就是 PhoneWindow。

接下来就是为 Window 设置回调，回调是实现都是由 Activity 来实现的，回调方法有很多，就不一一列举了，常见的有如下一些：
*	onAttachedToWindow
*	onDetachedFromWindow
*	dispatchTouchEvent
*	dispatchKetEvent

从 dispatchTouchEvent 回调可以看出，Activity 响应触摸事件，实际上的响应了 Window 的回调方法，说明触摸事件是传递给我们的 Window，然后再又 Activity 进行分发的。

然后就是为 Window 设置 WindowManager 。

至此，Activity 的 Window 就算是创建完成的，剩下的就是往 Window 中添加 View 了。


## Window 中 View 的添加

Android 中的所有视图都是通过 Window 来呈现的，不管是 Activity、Dialog 还是 Toast，它们的视图实际上都是附加在 Window 上的。

因此，我们的 Activity 中的所有 View 也是添加在 Window 上的，而这一切入点就是`setContentView`方法。

``` java
    public void setContentView(int layoutResID) {
        getWindow().setContentView(layoutResID);
        initWindowDecorActionBar();
    }
```
getWindow 方法返回的就是上面创建的 PhoneWindow 对象，而重点就在于`setContentView`方法内。

是时候展现一张经典的图了：

![activity-window](http://7xqe3m.com1.z0.glb.clouddn.com/blog-activity-window.png)

在上图中，DecorView 就是一个 FrameLayout 的 ViewGroup 容器，也是 Activity 中的顶级 View，一般来说它内部包含标题栏和内部栏，但还是会随着主题发生变化的，但不管怎么样，内容栏是肯定有的。

当创建了一个 DecorView 对象时，还得把内容栏和标题栏给添加进去才行。

同时，DecorView 是依附于 Window 之上的，没有了 Window，DecorView 也无从谈起了。当我们创建好了 DecorView 时，还得把 DecorView 添加到 Window 上。


而`setContentView`方法就是对上述图片创建 DecorView 的解释了。

``` java
    @Override
    public void setContentView(int layoutResID) {
        if (mContentParent == null) {    // 代表图中 ContentView 的内容
            installDecor();    // 创建 DecorView
        } else if (!hasFeature(FEATURE_CONTENT_TRANSITIONS)) {
            mContentParent.removeAllViews();    // 
        }
        if (hasFeature(FEATURE_CONTENT_TRANSITIONS)) {
            final Scene newScene = Scene.getSceneForLayout(mContentParent, layoutResID,
                    getContext());
            transitionTo(newScene);
        } else {
            mLayoutInflater.inflate(layoutResID, mContentParent);    // 将布局文件加载到 mContentParent 中去，注意 mContentParent 就是上图中的内容栏
        }
        mContentParent.requestApplyInsets();
        final Callback cb = getCallback();
        if (cb != null && !isDestroyed()) {
            cb.onContentChanged();    // 在 Activity 内部回调 onContentChanged 方法，表示视图已经发生改变
        }
    }
```
首先要明确的是`mContentParent`指的就是图中的`ContentView`内容栏，当内容栏为 null 时，则去为 Window 创建 DecorView 。

当 DecorView 创建完成后，则直接调用 LayoutInflater 的 inflate 方法将我们自己的布局文件添加到`mContentParent`中，由此完成了 View 的添加。关于 LayoutInflater 如何将布局添加到父布局中，可以参考之前写的文章：[Android 布局加载之LayoutInflater](http://www.glumes.com/android-layoutinflater/)。


## DecorView 的创建和初始 View 的添加

下面就是分析 DecorView 是如何创建并添加初始的布局内容的。

``` java
    private void installDecor() {
        if (mDecor == null) {
            mDecor = generateDecor();    // 直接 new 一个 DecorView 对象
        }
        if (mContentParent == null) {
            mContentParent = generateLayout(mDecor);    // 创建内容栏
        }
	}
	
```
在 installDecor 方法中直接 new 了一个 DecorView 对象，此时它还是只是一个 FrameLayout 容器，内部还没有东西。接着就是去创建内容栏。

``` java
		int layoutResource ;
		// 省略掉根据各自 Feature 参数来初始化不同的 layoutResource 过程
		mDecor.startChanging();    // 标识 DecorView 中的内容开始改变
        View in = mLayoutInflater.inflate(layoutResource, null);    // 加载 XML 布局文件，可能没有标题栏，但一定有内容栏
        decor.addView(in, new ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT));    // 为 DecorView 添加内容
        mContentRoot = (ViewGroup) in;
        ViewGroup contentParent = (ViewGroup)findViewById(ID_ANDROID_CONTENT);
        mDecor.finishChanging(); // 标识 DecorView 中的内容改变完成
```
在上面曾提到了，在 DecorView 中，标题栏可能没有，则内容栏是一定要有的，这是因为用户可能在 Actiivty 设置了相应的参数，比如设置 Window 类型为 `FEATURE_NO_TITLE` 的类型。

而 DecorView 添加内容 View 时，这个 View 是从 XML 布局文件中加载的，针对不同的 FEATURE， XML 布局文件中的内容也不相同，有的可能就没有标题栏了，只有一个内容栏，而且不管怎么样，所有的内容栏的 ID 都是固定的，为 `android.R.id.content`。


至此，DecorView 就完成了创建过程，并且还向其中添加了标题栏和内容栏。

## DecorView 添加至 Window 上

众所周知，在 Activity 的 onCreate 和 onStart 阶段，View 还是处于不可见的状态，只有在 onResume 状态时，View 才是可见的。

而我们现在只是分析完了 DecorView 的添加，还并没将它依附到 Window 上去。只有将 View 添加到 Window 上之后，它才能够拥有具体的功能，处理外界的输入信息等等。

在`handleResumeActivity`方法内的处理代码如下：
``` java
	// 变量 r 指的是 ActivityClientRecord 类，变量 a 指的是 Activity，也就是 r.activity
		 if (r.window == null && !a.mFinished && willBeVisible) {    // if 判断成立
                r.window = r.activity.getWindow();
                View decor = r.window.getDecorView();    // 设置 DecorView 可见
                decor.setVisibility(View.INVISIBLE);
                ViewManager wm = a.getWindowManager();
                WindowManager.LayoutParams l = r.window.getAttributes();
                a.mDecor = decor;
                l.type = WindowManager.LayoutParams.TYPE_BASE_APPLICATION;
                l.softInputMode |= forwardBit;
                if (a.mVisibleFromClient) {
                    a.mWindowAdded = true;
                    wm.addView(decor, l);    // WindowManager 添加 DecorView
                }
```

截取的代码片段，其中`r`指的就是`ActivityClientRecord`类型，存储了 Activity 的状态，此时`r`的`window`变量还是为 null 的。于是为`ActivityClientRecord`相应的变量设置值，以记录当前 Activity 的状态，然后在设置 DecorView 为可见，并把 DecorView 添加到 WindowManager 中去，以便 DecorView 能够响应各种事件，进行事件分发等等操作。

至此，就分析完了 Activity 的 Window 的创建以及 View 的添加过程。


## 总结

最后再来一发小小的总结，Activity 创建 Window 并添加 View 的流程大致如下：

*	`ActivityThread`是应用程序的入口，它的`attach`方法会开启主线程消息循环，然后创建`Application`、`Activity`等。
*	创建`Activity`时，又有调用`Activity`的`attach`方法，在此方法内将为 Activity 创建一个 Window，此时 Window 内还是空白的。
*	`Instrumentation`类开始回调 Activity 的一系列生命周期方法，当回调`onCreate`方法时，主要做的就是创建 DecorView，并将我们传递过来的 View 添加到 DecorView 的内容栏中，而此时，DecorView 和 Window 两者还是处于分离的状态。
*	在 Activity 生命周期的`onResume`方法内，将 DecorView 添加进了 Window 中，并设置 DecorView 可见，此时，就完成了 Activity Window 的创建和 View 的添加过程。


