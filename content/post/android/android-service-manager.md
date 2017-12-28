---
title: "Android 系统服务管理 ServiceManager"
date: 2017-12-22T15:27:11+08:00
categories: ["android"]
tags: ["Android"]
---


在应用程序编程时，经常使用到 getSystemService(String serviceName) 方法来获得一个系统服务，它的实现也是在 ContextImpl 中的，根据不同的参数返回不同的系统服务，这些系统服务都是由 ServiceManager 管理的。

<!--more-->

在看 ContextImpl 具体实现代码之前，我们有必要了解一下 ServiceManager 这个概念。

ServiceManager 是一个独立的进程，它管理各种系统服务，如下图所示：


![android_service_manager](http://7xqe3m.com1.z0.glb.clouddn.com/blog-android_service_manager.png)


ServiceManager 本身也是一个 Service ，Framework 提供了一个系统函数，可以获取该 Service 对应的 Binder 引用，那就是 `BinderInternal.getContextObject()` 。该静态函数返回 ServiceManager 后，就可以通过 ServiceManager 提供的方法获取系统其他 Service 的 Binder 引用。


这样的好处就是系统中仅暴露一个全局 Bindre 引用，那就是 ServiceManager ，而其他的系统服务则可以隐藏起来，从而有助于系统服务的拓展，以及调用系统服务的安全检查。其他系统服务在启动时，首先要把自己的 Binder 对象传递给 ServiceManager ，即所谓的注册（addService）。


说白了，ServiceManager 就相当于一个总机，需要其他系统服务时再转接获得其他服务，理解了这样的模型之后，再去看源码就会清楚很多了。


## ServiceManager 相关源码

由于我编译的是 Android 6.0 的源码，和书上的基于 Android 4.0 及更早的代码已经有些不一样了，所以还是以 6.0 的源码为主。


首先从 ContextImpl 的 getSystemService 方法入手：

``` java
    @Override
    public Object getSystemService(String name) {
        return SystemServiceRegistry.getSystemService(this, name);
    }
```

可以看到 ContextImpl 返回的服务是通过 `SystemServiceRegistry`类的静态方法返回的。

而 `SystemServiceRegistry` 的 getSystemService 方法内容如下：
``` java
/**
     * Gets a system service from a given context.
     */
    public static Object getSystemService(ContextImpl ctx, String name) {
        ServiceFetcher<?> fetcher = SYSTEM_SERVICE_FETCHERS.get(name);
        return fetcher != null ? fetcher.getService(ctx) : null;
    }
```

`SYSTEM_SERVICE_FETCHERS` 是一个 HashMap 类型，存储的内容为 `HashMap<String,ServiceFetcher<?>>` 。而在 getSystemService 方法中得到的就是一个 `ServiceFetcher` 类型。

而 ServiceFetcher 是一个接口类型，定义如下，它的 getService 方法就是返回所需的 Service 。
``` java
    /**
     * Base interface for classes that fetch services.
     * These objects must only be created during static initialization.
     */
    static abstract interface ServiceFetcher<T> {
        T getService(ContextImpl ctx);
    }
```

这样，就通过`SYSTEM_SERVICE_FETCHERS`这个容器得到`ServiceFetcher`，再调用它的`getService`方法得到了需要的 Service 。

但只是理清了如何得到 Service 还是不够，还要明白何时注册的 Service 。

在 SystemServiceRegistry 源码里有个 `registerService` 方法，它就是向`SYSTEM_SERVICE_FETCHERS`添加 `ServiceFetcher`。

``` java
/**
     * Statically registers a system service with the context.
     * This method must be called during static initialization only.
     */
    private static <T> void registerService(String serviceName, Class<T> serviceClass,
            ServiceFetcher<T> serviceFetcher) {
        SYSTEM_SERVICE_NAMES.put(serviceClass, serviceName);
        SYSTEM_SERVICE_FETCHERS.put(serviceName, serviceFetcher);
    }
```
代码的注释里同样提到了该方法只能在静态初始化时调用，而 SystemServiceRegistry 类有个 `static 代码块`， 按照 Java 代码的执行顺序，静态代码块肯定在静态方法 getSystemService 之前执行，这样就保证了`SYSTEM_SERVICE_FETCHERS`容器不至于为空了。


而最终通过 `ServiceFetcher`的 getService 方法返回的 Service 也是在 registerService 方法中传入的，查看其中某个 Service 代码如下：

``` java
 registerService(Context.ALARM_SERVICE, AlarmManager.class,
            new CachedServiceFetcher<AlarmManager>() {
            @Override
            public AlarmManager createService(ContextImpl ctx) {
                IBinder b = ServiceManager.getService(Context.ALARM_SERVICE);
                IAlarmManager service = IAlarmManager.Stub.asInterface(b);
                return new AlarmManager(service, ctx);
            }});
```

可以看到，这里通过 ServiceManager 的 getService 方法得到了对应服务的 Binder 对象，再通过 `Stub.asInterface(b)` 方法得到 Service 的代理对象。这正和前面提到的一样，ServiceManager 总管了所有的服务，然后具体需要返回对应的 Service 。

ServiceManager 返回 Service 的 Binder 对象的代码如下：
``` java
 /**
     * Returns a reference to a service with the given name.
     * 
     * @param name the name of the service to get
     * @return a reference to the service, or <code>null</code> if the service doesn't exist
     */
    public static IBinder getService(String name) {
        try {
            IBinder service = sCache.get(name);
            if (service != null) {
                return service;
            } else {
                return getIServiceManager().getService(name);
            }
        } catch (RemoteException e) {
            Log.e(TAG, "error in getService", e);
        }
        return null;
    }
```

首先是从缓存 mCache 去查看，如果没有的话，再从`BinderInternal.getContextObject()`返回的 Service 引用中取对应的 Service 。

查看`ServiceManagerNative`源码，看到这里面 getService 方法就是一个跨进程地请求，向系统发起请求返回所需的 Service 的 Binder 对象。

总结一下上面的源码，画一张 UML 类图如下所示：


![systemServiceRegisty-class](http://7xqe3m.com1.z0.glb.clouddn.com/blog-systemServiceRegisty-class.png)


https://android.googlesource.com/platform/system/core/+/android-6.0.0_r1/rootdir/init.rc


## 参考

1. 《Android内核剖析》
2. 《深入理解Android》

