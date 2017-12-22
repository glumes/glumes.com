---
title: "Android 系统服务启动 SystemServer"
date: 2017-12-22T15:30:26+08:00
tags: ["Android"]
---



在之前 [Android 系统服务管理 ServiceManager](http://www.glumes.com/android-servicemanager/) 中学习了各种系统服务 Service 都是通过 `ServiceManager` 来管理的，从 ServiceManager 中来获得系统服务的 Binder 对象引用。这内容涉及到了 `ContextImpl` 类、`SystemServiceRegistry` 类、`ServiceManager` 类、`ServiceManagerNative` 类等等。

那么问题就来了，ServiceManager 所管理的那些 Service 的 Binder 对象引用又是何时注册添加的呢？

事实上这些服务 Service 是 SystemServer 进程中启动的。

<!--more-->

## SystemServer 系统服务

SystemServer 是由 Zygote 孵化的第一个进程，它和系统服务有着重要关系，通过 ps 命令，可知其进程名为 `system_server` 。Zygote 的进程名称为`app_process`。

Android 系统中几乎所有的核心服务都在这个进程中，如 ActivityManagerService，PowerManagerService 和 WindowManagerService 等。

Zygote 为启动 SystemService 提供了专门的函数 `forkSystemServer`，而不是标准的`forkAndSpecialize`函数。


而 SystemServer 的执行主要在其 main 方法中，Android 6.0 的源码中不再是以前 Android 4.x 的 init1，init2 方法了。

```
 /**
     * The main entry point from zygote.
     */
    public static void main(String[] args) {
        new SystemServer().run();
    }
```

继续跟进 run 方法查看：
```
 private void run() {
        try {
           
	        // 如果当前系统时间比 1970 年更早，就设置当前系统时间为 1970 年
            if (System.currentTimeMillis() < EARLIEST_SUPPORTED_TIME) {
                Slog.w(TAG, "System clock is before 1970; setting to 1970.");
                SystemClock.setCurrentTimeMillis(EARLIEST_SUPPORTED_TIME);
            }

        
            // Here we go!
            Slog.i(TAG, "Entered the Android system server!");
            EventLog.writeEvent(EventLogTags.BOOT_PROGRESS_SYSTEM_RUN, SystemClock.uptimeMillis());

            // Ensure binder calls into the system always run at foreground priority.
            // 确保当前系统进程的 binder 调用，总是运行在前台优先级
            BinderInternal.disableBackgroundScheduling(true);

            // Prepare the main looper thread (this thread).
            android.os.Process.setThreadPriority(
                android.os.Process.THREAD_PRIORITY_FOREGROUND);
            android.os.Process.setCanSelfBackground(false);
            
            Looper.prepareMainLooper();

            // Initialize native services.加载本地服务
            System.loadLibrary("android_servers");

            // Check whether we failed to shut down last time we tried.
            // This call may not return.
            performPendingShutdown();

            // Initialize the system context.初始化系统上下文
            createSystemContext();

            // Create the system service manager.创建系统服务管理
            mSystemServiceManager = new SystemServiceManager(mSystemContext);
            // 将 mSystemServiceManager 添加到本地服务 LocalServices 的成员 sLocalServiceObjects
            LocalServices.addService(SystemServiceManager.class, mSystemServiceManager);
        } finally {
            Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
        }

        // Start services.
        try {
            Trace.traceBegin(Trace.TRACE_TAG_SYSTEM_SERVER, "StartServices");
            // 启动服务代码
            startBootstrapServices();
            startCoreServices();
            startOtherServices();
        } catch (Throwable ex) {
            Slog.e("System", "******************************************");
            Slog.e("System", "************ Failure starting system services", ex);
            throw ex;
        } finally {
            Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
        }

        // Loop forever.
        Looper.loop();
        throw new RuntimeException("Main thread loop unexpectedly exited");
    }
```

在 main 方法中删除了一些与虚拟机有关的代码，只关心系统服务的启动就好。

在启动系统服务之前还初始化了系统环境上下文 `createSystemContext()`，执行了此方法之后`mSystemContext`变量才不会为 null ，关于如何初始化系统环境的上下文 Context ，必须得在写一篇博客单独学习了。

初始化 mSystemContext 之后，就是启动服务了：

*	startBootstrapServices();    // 启动引导服务
*	startCoreServices();    // 启动核心服务
*	startOtherServices();    // 启动其他服务


## SystemServer 进程启动系统服务方式

SystemServer 进程启动系统服务有两种方式，分别是 SystemServiceManager 的`startService` 方式和 ServiceManager 的 `addService` 方式。

```
       ServiceManager.addService("scheduling_policy", new SchedulingPolicyService());
       Trace.traceEnd(Trace.TRACE_TAG_SYSTEM_SERVER);
       mSystemServiceManager.startService(TelecomLoaderService.class);
```
### startService 方式

通过 SystemServiceManager 的`startService(Class<T> serviceClass)`用于启动继承于`SystemService`抽象类的服务。

主要功能如下：

*	通过反射创建对应的 SystemService ，并调用其 `onStart` 方法。
*	同时将创建是 SystemService 添加到 SystemServiceManager 的 `mService` 集合变量中。


### addService 方式

通过 ServiceManager 的`addService(String name, IBinder service)`用于初始化继承于 IBinder 的服务。

主要功能如下：

*	将对应服务的 Binder 对象添加到 SystemManager 中去。

之前有学习到 ServiceManager 是系统服务的管家，通过它来获得其他服务。然而，在启动系统服务时，有些服务竟然没有 addService 注册到 ServiceManager 中去。

事实上，有些服务即使在启动时没有注册进去，在启动之后也会注册到 ServiceManager 中去。

通过查看 `SystemService`这个抽象类的源码可知，有如下方法：
```
 /**
     * Publish the service so it is accessible to other services and apps.
     */
    protected final void publishBinderService(String name, IBinder service) {
        publishBinderService(name, service, false);
    }

    /**
     * Publish the service so it is accessible to other services and apps.
     */
    protected final void publishBinderService(String name, IBinder service,
            boolean allowIsolated) {
        ServiceManager.addService(name, service, allowIsolated);
    }

``` 

而 ServiceManager 的对应方法为，最后一个变量设置 true 的话，则表示允许隔离的沙盒进程访问该服务。

```
/**
     * Place a new @a service called @a name into the service
     * manager.
     * 
     * @param name the name of the new service
     * @param service the service object
     * @param allowIsolated set to true to allow isolated sandboxed processes
     * to access this service
     */
    public static void addService(String name, IBinder service, boolean allowIsolated) {
        try {
            getIServiceManager().addService(name, service, allowIsolated);
        } catch (RemoteException e) {
            Log.e(TAG, "error in addService", e);
        }
    }
```

## ServiceManager 启动时机

SystemServer 是一个进程，由 Zygote 孵化的第一个进程，而 ServiceManager 也是一个进程，并且 SystemService 启动系统服务时，可以向 ServiceManager 中注册服务，那么可想而知，ServiceManager 是比 SystemService 先启动的。

ServiceManager 是由 `init.rc` 进程启动的。

在`init.rc`中有如下代码启动 ServiceManager 。
```
service servicemanager /system/bin/servicemanager
    class core
    user system
    group system
    critical
    onrestart restart healthd
    onrestart restart zygote
    onrestart restart media
    onrestart restart surfaceflinger
    onrestart restart drm
```

由于我编的 Android 源码里面竟然死活没找到上面的代码，附上源码链接地址为：
https://android.googlesource.com/platform/system/core/+/android-6.0.0_r1/rootdir/init.rc

就这样，虽然跳过了很多细节的部分，但还是大概的明白了 Android 系统服务管理（ServiceManager）和启动（SystemServer）的流程。

其他的细节部分，每个部分都可在再继续深入学习了。

最后还是附图一张：
![android-SystemServer-function](http://7xqe3m.com1.z0.glb.clouddn.com/blog-android-SystemServer-function.png)

## 参考
1. 《Android内核剖析》
2. 《深入理解Android》
3. http://blog.csdn.net/nightduke1/article/details/44201317
4. http://ticktick.blog.51cto.com/823160/1659473
5. http://gityuan.com/2016/02/20/android-system-server-2/
