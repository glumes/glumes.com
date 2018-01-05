---
title: "Android Binder Summary"
date: 2017-12-22T10:50:43+08:00
categories: ["android"]
tags: ["Android"]
comments: true
---



Binder 是什么？在英文中 Binder 是 粘合剂 的意思，表示将两样东西粘在一起。而在 Android 开发中，Binder 的意思多了去了。不同的角度有着不同的解释。

它既可以是 Android 中实现了 IBinder 接口的一个单纯的类，也可以是 Android 中进程跨进程通信（IPC）的一种方式，还可以看作是工作在内核态的 Linux 驱动 `/dev/binder`。

<!--more-->

## Android 应用层面的 Binder
从 Android 的应用层面来说，Binder 是客户端和服务端进行通信的媒介，当 bindService 的时候，服务端会返回一个包含服务端业务调用的 Binder 对象，通过这个 Binder 对象，客户端就可以获取服务端提供的服务或者数据。

比如，我们在写一个无须跨进程的本地服务 LocalService 时，需要在 Service 定义一个类继承自 Binder ，然后在 onBind() 方法中返回该 Binder 对象。这样在 `ServiceConnection` 接口的 onServiceConnection 方法中就会收到该 Binder 对象，通过该 Binder 对象就可以执行 LocalService 中的公共方法。

``` java
public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
       mLocalBinder = (LocalService.LocalBinder) iBinder;
}
```

那么 onServiceConnection 是如何收到该 Binder 对象的呢？这个就是由 ActivityManagerService 来完成的了。AMS 在启动 Service 的过程中，就会回调 
onServiceConnection 方法，其中的 `IBinder` 参数就是 Service 的 Binder 引用。由于绑定的是无须跨进程的本地服务 LocalService ，那么返回的 Binder 也就是 Service 的 `Binder本地对象`， 执行的方法也是在主线程中了。


而当 Service 组件是一个跨进程的 RemoteService 时，在 onServiceConnected 方法中再如上代码所示的调用返回的 IBinder 对象，则会报如下的转型错误：
``` java
java.lang.ClassCastException: android.os.BinderProxy cannot be cast to com.glumes.ipc_binder.service.LocalService$LocalBinder
```

这是因为 RemoteService 在另外的进程中，而`不同的进程内存资源是不能共享`的，服务端不能将自己的 Binder 本地对象返回过去，只能返回一个 `代理对象 Binder` ，客户端 Client 通过这个代理对象 Binder 来调用 RemoteService 的相关方法。这个代理对象的类型就是 `BinderProxy`。

在 onServiceConnection 方法中通过 `asInterface` 方法来将 Service 返回的代理对象 Binder 转换成代理对象 Proxy，其中，Proxy 持有 Binder 的引用，其变量名为 `mRemote`。
``` java
public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
            // ActivityManagerService 在 bindService 的过程中会回调该方法，将 Service 的 Binder 对象传回来
            // 再调用 asInterface 方法根据是否在同一进程进行转换。
            // 如果在同一进程，返回的是本地对象 Binder 
            // 如果不在同一进程，返回的是代理对象 Binder
            mService = IBookManager.Stub.asInterface(iBinder);
}
```

此时，Client 调用 RemoteService 的方法就是通过跨进程的方式了。而两个进程之间的通信就是通过 Binder 驱动来完成的。这是一个类似 `U 型` 的结构。Client 和 Server 分别在 `U 型` 的两头，而 Binder 驱动则在 `U 型` 的底部连接两者。

盗图一张，如下所示：


![binder_ipc](http://7xqe3m.com1.z0.glb.clouddn.com/blog-binder_ipc.png)

## Binder 框架

所以，当进行跨进程通信时，Binder 就可以看作是一种架构，这种架构提供了 `服务端接口`、`Binder 驱动`、`客户端接口` 三个模块，如下图所示：

![binder_kuangjia](http://7xqe3m.com1.z0.glb.clouddn.com/blog-binder_kuangjia.png)


### 服务端接口

从 Java 层面来看，一个 Binder 服务端实际上就是一个 Binder 类的对象，该对象一旦创建，内部就启动一个隐藏线程。该线程接下来会接收 Binder 驱动发送的消息，收到消息后，会执行 Binder 对象中的 onTransact 函数，并按照该函数的参数执行不同的服务代码。因此，要实现一个 Binder 服务，就必须重载 onTransact 方法。


### Binder 驱动

任意一个服务端 Binder 对象被创建时，同时会在 Binder 驱动中创建一个 mRemote 对象，该对象的类型也是 Binder 类。客户端要访问远程服务时，都是通过 mRemote 对象。

mRemote 对象的 transact 方法最终会调用一个 `native`的 `transactNative`方法，将数据写入 Binder 驱动，并由驱动去完成底层的通信过程。

### 客户端接口

客户端想要访问远程服务，必须获取远程服务在 Binder 驱动中对应的 mRemote 引用。获得该 mRemote 对象后，就可以调用其 transact 方法，而在 Binder 驱动中，mRemote 对象也重载了 transact 方法，重载内容主要包括以下几项：

*	以线程间通信的模式，向服务端发送客户端传递过来的参数。
*	挂起当前线程，当前线程正是客户端线程，并等待服务端线程执行完指定服务函数后通知。
*	接收到服务端线程的通知，然后继续执行客户端线程，并返回客户端代码区。


而客户端获取远程服务在 Binder 驱动中对应的 mRemote 引用，也是在 onServiceConnection 方法中得到的。

onServiceConnection 的方法原型如下，由系统回调该方法，其中的参数 iBinder 就是 Service 的 Binder 代理对象。
 
``` java
public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
```
而在 onServiceConnection 方法内执行 `asInterface` 方法，返回的内部代理类 Proxy 。
``` java
// asInterface 方法原型为，其实参数 obj 为 onServiceConnected 方法的参数 iBinder 。
public static IBookManager asInterface(IBinder obj){
```
返回的内部代理类 Proxy 构造方法如下，其函数调用都是通过该 mRemote 对象的 `transact` 方法来完成的，此 mRemote 对象就是远程服务在 Binder 驱动中对应的 mRemote 引用，它的类型就是 `BinderProxy`，而 Proxy 类只是对 mRemote 对象组合了一下而已。

``` java
   private static class Proxy implements IBookManager{
        private IBinder mRemote ;
        public Proxy(IBinder remote) {
            mRemote = remote;
        }
```

事实上在跨进程的情况下，我们可以不需要使用 Proxy 对象，直接调用 onServiceConnection 方法中 iBinder 对象的 transact 方法也可以完成跨进程通信。



## 小结

对上述内容简单的小结一下：

*	Android 中的跨进程通信是一个 `U 型`的过程，由底层的 Binder 驱动来完成双方通信。
*	客户端 Client 无法得到 Server 的 Binder 本地对象，onServiceConnected 方法返回的是一个 `BinderProxy` 类型的 Binder 代理对象。
*	客户端 Client 通过 Binder 代理对象的 `transact` 方法调用 Binder 驱动，驱动再调用服务端 Server 的 Binder 本地对象的 `onTransact` 方法来执行对应的操作。
*	如果服务端 Server 不需要再向客户端 Client 返回数据，则 IPC 调用结束。如需要返回数据，服务端 Server 再调用 Binder 驱动写入数据，客户端 Client 接收到对应数据，IPC 调用结束。

附《Android艺术开发探索》图：
![binder_note_art](http://7xqe3m.com1.z0.glb.clouddn.com/blog-binder_note_art.png)

### 注意事项：

*	所有可以在 Binder 中传输的接口都需要继承 IInterface 接口。
*	客户端通过 Binder 代理对象发起远程请求时，当前线程会被挂起，所以不应该在 UI 线程中执行。
*	另一进程的服务端 Binder 运行在 Binder 线程池中，无需再异步执行，所以 Binder 方法不管是否耗时都应该采用同步的方式去实现。
*	 AIDL 支持的数据类型：
	*	基本数据类型（int，long，char，boolean，double）
	*	String 和 CharSequence 。
	*	List：只支持 ArrayList，里面每个元素都必须能够被 AIDL 支持。
	*	Map：只支持 HashMap，里面每个元素都必须被 AIDL 支持，包括 key 和 value 。
	*	Parcelable：所有实现了 Parcelable 接口的对象。
	*	AIDL ：所有的 AIDL 接口本身也可以在 AIDL 文件中使用。

代码地址：
[https://github.com/glumes/BinderLearn](https://github.com/glumes/BinderLearn)

## 参考

1. 《Android内核剖析》
2. 《Android开发艺术探索》
3. http://www.codeceo.com/article/aidl-android-binder.html
4. http://weishu.me/2016/01/12/binder-index-for-newer/