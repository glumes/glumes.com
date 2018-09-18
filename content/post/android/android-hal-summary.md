---
title: "Android 硬件抽象层调用流程小结"
date: 2017-12-22T10:31:13+08:00
categories: ["android"]
tags: ["Android"]
comments: true
original: true
addwechat: true
---


Android 从 5.0 开始使用新的相机 API Camera2 来代替之前的旧版本，从而支持更多的特性。

在学习新的 API 调用之外，也还是要了解一下 Android 底层发生了哪些变化，从而能够让我们对 API 的调用流程更加的清晰，知其所以然。

<!--more-->

## 由 上层应用 到 底层驱动 的 调用流程


当我们打开相机应用时，会打开摄像头，通过摄像头来采集数据，并将数据呈现在 Android 软件界面上。

这看似简单的一个流程，实际上就包含了从我们上层软件到底层硬件驱动的一系列调用流程。


简单的理解可以按照如下的流程：

![http://7xqe3m.com1.z0.glb.clouddn.com/blog_hal_java_to_kernel.jpeg](http://7xqe3m.com1.z0.glb.clouddn.com/blog_hal_java_to_kernel.jpeg)

图片来自于 [老罗的 Android 之旅](http://blog.csdn.net/luoshengyang) 中关于 [硬件抽象层（HAL）概要介绍和学习计划](http://blog.csdn.net/luoshengyang/article/details/6567257)。

我们的调用流程：

应用程序框架层 --> 运行时库 --> 硬件抽象层 --> 硬件驱动层 。

> 关于硬件抽象层 HAL 是什么？

HAL 是对硬件设备的抽象和封装，它定义了一个标准接口以供硬件供应商实现，这可让 Android 忽略较低级别的驱动程序实现，为 Android 在不同硬件设备上提供统一的访问接口。

简单说来就是，我们控制硬件设备时，调用的是硬件抽象层，由硬件抽象层去调用驱动程序操控硬件设备。就好比之前学过的 OpenGL 一样， 它也是一套接口标准，具体的实现交给厂商去完成了，我们只是调用接口方法。

HAL 是以动态链接库的形式提供的。


这样的好处在于把 HAL 的具体实现交给硬件厂商去完成，同时由于开源协议的原因，硬件厂商的  HAL 实现部分不用开源出来，把厂商的核心内容，如算法等可以隐藏起来。

总结一下老罗写的 HAL 系列文章会对 HAL 有一个更深的认识：

*	[在 Android 内核源代码工程中编写硬件驱动程序](http://blog.csdn.net/luoshengyang/article/details/6568411)

在学习这篇博客之前，还是得有一些预备知识，不然就是一头雾水。

首先要知道，在 Linux 中所有设备都是以文件的形式存在的，不管是普通文件还是硬件设备。

> 了解 Linux 的驱动

Linux 内核中采用可加载的模块化设计（LKMs，Loadable Kernel Modules）。

一般情况下编译的 Linux 内核是支持可插入式模块的，也就是将最基本的核心代码编译在内核中，其他的代码可以选择是在内核中，或者编译为内核的模块文件。

在内核的配置过程中，有很多设备驱动程序和其他内核元素都被编译成了模块。

我们常见的驱动程序就是作为内核模块动态加载的，比如声卡驱动和网卡驱动等，而 Linux 最基础的驱动，如 CPU、PCI 总线 等驱动程序则编译在内核文件中。


如果一个驱动程序被直接编译到了内核中，那么即使这个驱动程序没有运行，它的代码和静态数据也会占据一部分空间。

但如果这个驱动程序被编译成一个模块，就只有在需要内存并将其加载到内核时才会真正占用内存空间。

对于 LKM 来说，可以根据硬件和连接的设备来加载对应的模块。

> 模块

模块是在内核空间运行的程序，实际上是一种目标对象文件（`.o` 文件）没有链接，不能独立运行，但是可以装载到系统中作为内核的一部分运行，从而可以扩充内核的功能，模块最主要的用处就是用来实现设备驱动程序。

Linux 下对于一个硬件的驱动，可以有两种方式：

*	直接加载到内核代码中，启动内核时就会驱动此硬件程序
*	以模块的方式启动，编译生成一个 `.o` 文件，当应用程序需要时再加载到内核空间运行。

所以我们所说的一个硬件的驱动程序，通常指的就是一个驱动模块。


> 设备文件

Linux 中的设备文件分为三种：

*	Block（块）型设备文件
*	Character（字符）型设备文件
*	Socket（网络）型设备文件

对于一个设备，它可以在 `/dev` 下面存在一个对应的逻辑设备节点，这个节点以文件的形式存在，但它不是普通意义上的文件，它是设备文件，更确切的说，它是设备节点。这个节点是通过 mknod 命令建立的，其中指定了主设备号和次设备号。

*	主设备号表明了某一类设备，一般对应着确定的驱动程序，用于内核把文件和它的驱动链接在一起。

*	次设备号一般是区分不同属性，例如不同的使用方法，不同的位置，不同的操作。

这个设备号是从 `/proc/devices` 文件中获得的，所以一般是先有驱动程序在内核中，才有设备节点在目录中。这个设备号（特指主设备号）的主要作用，就是声明设备所使用的驱动程序。驱动程序和设备号是一一对应的，**当你打开一个设备文件时，操作系统就已经知道这个设备所对应的驱动程序**。

> proc 文件系统

一种用户程序和内核通讯最简单和流行的方式是通过使用 `/proc` 下文件系统进行通讯。

`/proc` 是一个伪文件系统，从这里的文件读取的数据是由内核返回的数据，并且写入到这里面的数据将会被内核读取和处理。

使用 `/proc` 目录中的文件监视驱动程序的状态。访问设备文件时，操作系统通常会通过查找 `/proc/devices` 目录下的值，也就是根据主设备号，确定由哪些驱动模块来完成任务。如果 `proc` 文件系统没有加载，访问设备文件就会出现错误。


总结一下上面的大摞文字：


![http://7xqe3m.com1.z0.glb.clouddn.com/blog_driver_concept.png](http://7xqe3m.com1.z0.glb.clouddn.com/blog_driver_concept.png)


首先，内核加载我们的驱动程序，会生成对应的模块和主设备号。

其次，插入设备文件时，会根据文件类型分配一个对应的主设备号，标识用哪种驱动打开。

最后，打开设备文件，实质上就是通过驱动程序来打开设备文件，在 `/proc/devices`
 中找到驱动。

有了上面的知识储备，再来了解看老罗的博客，就明白一些了。


老罗是把驱动编译成了内核模块，动态加载，并且在模块加载函数内部去执行了设备注册和初始化操作，主要有两个函数 `device_create` 和 `hello_create_proc`。

这样一来，在模块加载时，就创建了对应设备文件，打开设备文件时，也会去加载对应的驱动。

同时，还可以对设备文件执行相应的操作了，读和写变量的值，这些操作都是交给了驱动程序去完成读写的。

对于驱动程序，就先了解到这里了，有时间再去深究。

*	[在Ubuntu上为Android系统内置C可执行程序测试Linux内核驱动程序](http://blog.csdn.net/luoshengyang/article/details/6571210)

这篇文章的主要操作就是通过 C 程序的可执行文件来读写设备文件中的值。

如果执行成功了，则代表 C 可执行程序通过访问驱动程序来访问硬件寄存器的值了。


*	[在Ubuntu上为Android增加硬件抽象层（HAL）模块访问Linux内核驱动程序](http://blog.csdn.net/luoshengyang/article/details/6573809)

在这里就涉及到重点 硬件抽象层 HAL 了，通过设备文件来连接硬件抽象层和 Linux 内核驱动模块。

硬件抽象层有两个重要的数据结构：硬件模块结构体 `hw_module_t` 和 硬件接口结构体 `hw_device_t`。

Android HAL 将各类硬件设备抽象为硬件模块，使用 `hw_module_t` 来描述这一模块，每个硬件抽象模块都对应一个动态链接库，这一般是由厂商提供的。

而每一类硬件抽象模块又包含多个独立的硬件设备，使用 `hw_device_t` 结构体描述硬件模块中的独立硬件设备。


HAL 规定每个硬件模块必须包含一个 `HAL_MODULE_INFO_SYM` 的结构体，这个结构体的第一个元素必须为 `hw_module_t`，然后后面可以增加模块相关的其他信息。其中，`tag`属性也必须为 `HARDWARE_MODULE_TAG` 常量。

对应老罗博客中的：

``` c++
/*硬件模块结构体*/  
struct hello_module_t {  
    struct hw_module_t common;  
};  
```


HAL 规定每个硬件设备都必须定义一个硬件设备描述结构体，该结构体必须以 `hw_device_t` 作为第一个成员变量，后跟设备相关的公开函数和属性。


对应老罗博客中的：

``` c++
/*硬件接口结构体*/  
struct hello_device_t {  
    struct hw_device_t common;  
    int fd;  
    int (*set_val)(struct hello_device_t* dev, int val);  
    int (*get_val)(struct hello_device_t* dev, int* val);  
};  
```

这里关于硬件模块和硬件设备有点绕，大概就是一类硬件模块包含许多硬件设备，一个硬件设备属于某一类硬件模块。

Android 对于硬件抽象层有一些规定，这里就不去深入了，包括 HAL 命名规范、如何加载 HAL 等等。

除此之外，还需要在 HAL 中定义一些需要的方法函数来执行操作。这些方法函数就类似于接口，可以供外部调用，而自己要完成其内部实现。


在老罗的博客中定义了如下的方法：

*	hello_device_open     打开设备
*	hello_device_close     关闭设备
*	hello_set_val     写入值
*	hello_get_val     读取值

其中，hello_device_open 函数中有一个  `open` 方法就是在执行打开文件操作，也就是打开 `/dev/hello` 设备文件，这就和上面用 C 程序验证测试 Linux 内核程序相同了。


而 hello_set_val 和 hello_get_val 函数就是设备的访问函数，对应于硬件接口结构体中的 `*set_val` 和 `*get_val` 函数指针。它们的读写也是通过 hello_device_open 函数打开设备之后来执行的。


最后将硬件抽象层编译成模块，也就是一个 `so` 动态链接库。

这样就完成了一个简单的硬件抽象层，对外有提供函数进行方法调用，对内则和硬件驱动打交道。

接下来就是在应用层通过 JNI 方法来调用硬件抽象层的接口函数，使得上层应用访问硬件设备。

*	[在Ubuntu为Android硬件抽象层（HAL）模块编写JNI方法提供Java访问硬件服务接口](http://blog.csdn.net/Luoshengyang/article/details/6575988)
*	[在Ubuntu上为Android系统的Application Frameworks层增加硬件访问服务](http://blog.csdn.net/Luoshengyang/article/details/6578352)
*	[在Ubuntu上为Android系统内置Java应用程序测试Application Frameworks层的硬件服务](http://blog.csdn.net/Luoshengyang/article/details/6580267)


通过 JNI 方法来访问硬件抽象层，首先要去通过 Android 硬件抽象层提供的 `hw_get_module` 方法来加载模块 ID 为指定的 HELLO_HARDWARE_MODULE_ID 的硬件抽象层，Android 硬件抽象层会根据 ID 值在系统中找到对应的模块，然后加载起来，并返回 `hw_module_t` 接口给调用者使用，通过 `hw_module_t` 的 `common` 变量的 `methods` 方法最后得到了 `hello_device_t` 硬件接口结构体。

 
有了 `hello_device_t` 这个变量就可以执行之前定义的相关读写操作了。

有了 JNI 方法之后，还需要提供一个独立的硬件访问服务来为应用提供服务。应用需要通过 Binder 代理来访问硬件服务。由于是跨进程通信，还是需要 AIDL 来定义接口了。


在独立进程的硬件访问服务中，还是要通过上面的 JNI 方法来访问硬件设备。

最后，我们在应用进程里面 BindService 就可以跨进程通信了，读写硬件设备中的值。

这样就实现了从应用程序到底层硬件的整个流程的调用。

 复习一下整个流程：

![http://7xqe3m.com1.z0.glb.clouddn.com/blog_hal_java_to_kernel.jpeg](http://7xqe3m.com1.z0.glb.clouddn.com/blog_hal_java_to_kernel.jpeg)

有了老罗的分析，对于相机的上层软件到底层硬件的调用流程就不难分析了。

更复杂具体的流程可以参考如下流程：

![http://7xqe3m.com1.z0.glb.clouddn.com/blog_camera_java_to_kernel.png](http://7xqe3m.com1.z0.glb.clouddn.com/blog_camera_java_to_kernel.png)


## 参考

1. http://www.jianshu.com/p/0d155f267589
2. https://www.ibm.com/developerworks/cn/linux/l-proc.html
3. https://www.ibm.com/developerworks/cn/linux/l-usb/index1.html
4. http://www.jinbuguo.com/kernel/device_files.html
5. https://coolshell.cn/articles/566.html
6. http://read.pudn.com/downloads119/ebook/506573/Linuxdevicedriver.pdf
7. https://www.ibm.com/developerworks/cn/linux/l-cn-sysfs/index.html


