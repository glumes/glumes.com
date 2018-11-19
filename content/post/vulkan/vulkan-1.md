---
title: "Vulkan 1"
date: 2018-11-13T20:19:34+08:00
subtitle: ""
tags: []
categories: ["android"]
comments: true
bigimg: [{src: "https://ws1.sinaimg.cn/large/bc32fd77gy1fxd7qunbo9j20zk0m8jtx.jpg", desc: ""}]
draft: true
original: true
addwechat: true
---

捋一捋 Vulkan 。

## Vulkan 是什么 ？

文章开始之前先来讲一讲《王者荣耀》，作为曾经珠海市香洲区第五十号鲁班七号，可是有着辉煌的战绩。

18年9月份的时候，小米出了小米8青春版，采用高通骁龙660处理器，并且支持《王者荣耀》Vulkan 版；同年11月，老东家魅族也出了魅族 X8，采用710处理器，开始支持《王者荣耀》Vulkan 版。

可见这年头，没有个支持 Vulkan 的手机，玩起游戏来都不好意思再闪现交大、越塔强杀了。

那么 Vulkan 到底是何方神圣，让各路手机厂商在发布新品时都会强调它呢？

正如 [维基百科](https://zh.wikipedia.org/wiki/Vulkan_(API)) 中写道：

> Vulkan是一个低开销、跨平台的二维、三维图形与计算的应用程序接口（API）。
> 
> 与 OpenGL 类似的是，Vulkan 针对全平台即时3D图形程序（如电子游戏和交互媒体）而设计，并提供高性能与更均衡的CPU与GPU占用。
> 
> 与 OpenGL 区别的是，Vulkan是一个底层API，而且能执行并行任务。除此之外，Vulkan还能更好地分配多个CPU核心的使用。


简单来说，Vulkan 与 OpenGL 功能类似，都是二维、三维图形绘制接口，但是 Vulkan 功耗更低，可以节省电量，同时在 CPU 与 GPU 调度上更均衡，发挥硬件的性能，最后的结果就是打《王者荣耀》时帧数更高、更稳定、耗电更低。

口说无凭，一起来看个测评视频吧 [First comparison of Vulkan API vs OpenGL ES API on ARM](https://www.youtube.com/watch?v=rvCD9FaTKCA) ~~~

> 视频地址（科学上网）：https://www.youtube.com/watch?v=rvCD9FaTKCA

视频截图一张，作为示例：

![](https://ws1.sinaimg.cn/large/bc32fd77gy1fx6jfgkeqcj227y0moqv5.jpg)


在 ARM 平台上作为对比，可以看到，渲染同样的场景，OpenGL ES 的 CPU 使用率达到了 50%，并且是单核在高速运行，类似于一核有难，三核围观；反观 Vulkan 版本的绘制，CPU 的使用率目测不到 20%，而且是四核都参与了运算，这样一来，Vulkan 当然更加省电、功耗低了。

## Vulkan 和 OpenGL 的今生前世

难免还是要讲一些历史。

OpenGL 主要是由 `Khronos Group （科纳斯组织）`在进行维护。它最早的版本发布于 1992 年，那时候还是 OpenGL 1.0 固定渲染管线的年代，现在已经到了 OpenGL 4.6 版本，早已经是可编程渲染管线了。并且为了能够在嵌入式设备上使用 OpenGL ，还有了一个子集叫做 OpenGL ES ，同样的技术还得弄两个名字就很不好了（文章中把两者统称 OpenGL ，暂不做详细区分）。

后来这个组织在 18年3月 由发布了 Vulkan 1.1 正式版本。另外，不管是在嵌入式设备上还是 PC 上，它都只有一个名字了。随着 Vulkan 的逐渐发展，也就意味着 OpenGL 的维护将要停止更新了，后续也是添加一些新的拓展在里面。

与 OpenGL 一样，Vulkan 也是支持跨平台的。但不同的平台愿不愿意让它跨就又是另外一回事了。在 iOS 平台上，苹果公司主推自家的 Metal 图形接口；在 Windows 平台上，微软公司主推 DirectX 图形接口。两家大厂都有自己的脾气，Vulkan 想要做到一统江湖还有很长的一段路要走。

但对于 Android Developer 就不一样了，Android 从 7.0(Nougat) 开始加入了对 Vulkan 的支持，可见谷歌对它还是有信心的。

至于 Vulkan 在实际中到底有哪些用处呢？除了熟知的《王者荣耀》，目前市面上的应用中使用 Vulkan 的确实不多，如果有的话，也是在游戏中。

反观 OpenGL ，近年来很火的音视频应用中都能看到它的身影，比如相机滤镜、贴纸、视频特效、多媒体相关特效等等，这些方面等笔者稳定一点之后再来分享了。

不知道 Vulkan 的特性能不能用在视频处理方面，并没有很好的思路，如果你有的话，欢迎一起分享。

另外，基于 Vulkan 在渲染方面的特性，很可能在未来 VR 等应用中大发光彩。总之，对于这一门新的技术，笔者还是很看好它的，更多地去了解它的使用和原理。


## Vulkan 学习之路

> 如果说学程序语言，第一行代码是 Hello World；那么对图形学程序，第一行代码就应该是画个三角形。

这将会是一个系列的文章，去分享关于 Vulkan 的开发学习，国内目前关于 Vulkan 的学习博客还是挺少的。

首先是 `劝退篇`。

并不是所有的应用都需要用到 Vulkan ，如果你的瓶颈在于 CPU 开销太大，那么就可以考虑。另外，对于 Windows 、iOS 程序员，还有不懂 OpenGL ，不会 C/C++ 的同学，强撸 Vulkan 的话只能是一脸懵逼。

本文章主要会偏向于在 Android 设备上使用 Vulkan ，同时也会介绍相关的 OpenGL、图形学理论知识点。


然后是关于 `学习资源` 方面的。

在学习资源上，主要会参考 Vulkan 的 [官网](https://www.khronos.org/vulkan/) 和  Google 给的代码 [官方例子](https://github.com/googlesamples/vulkan-basic-samples) 。 

另外，在知乎上搜索 Vulkan 关键字，也能找到大神们关于 Vulkan 的 [心得](https://www.zhihu.com/search?type=content&q=vulkan) 。这里推荐几位知乎大佬的主页：[Vinjn张静](https://www.zhihu.com/people/vinjn/activities)、[SnowFox](https://www.zhihu.com/people/snowfox-68/activities)、[空明流转](https://www.zhihu.com/people/wuye9036/activities)、[陈勇](https://www.zhihu.com/people/chen-yong-59-86/activities)。从这几位大佬的相关文章中，受益匪浅。


还有，在 Youtube 上有一些关于 Vulkan 的系列视频，推荐这个[系列视频](https://www.youtube.com/user/Nigo40/videos)。


![](https://ws1.sinaimg.cn/large/bc32fd77gy1fx6odtsb5wj211v0dnq6m.jpg)

对照着中文字幕，多看几遍还是能够理解的。

不像学习 OpenGL 那样，可以搞两本书来看看，这次就只能靠自己的学习理解了，还有一定要善用搜索。

这也印证了一句话：

> 你与知识，仅隔了一根网线。


## 参考

这里有一些不错的参考链接：


1. [https://github.com/vinjn/awesome-vulkan](https://github.com/vinjn/awesome-vulkan)

记录了很多关于 Vulkan 的文档，可以选择性地好好看看。

2. [https://renderdoc.org/vulkan-in-30-minutes.html](https://renderdoc.org/vulkan-in-30-minutes.html)

30 分钟了解 Vulkan 开发，显然，30 分钟肯定是不够的。

3. [https://www.khronos.org/registry/vulkan/specs/1.1/pdf/vkspec.pdf](https://www.khronos.org/registry/vulkan/specs/1.1/pdf/vkspec.pdf)

Vulkan 1.1 版本的官方文档，对于各种参数调用，没有比它讲的更详细的了。

4. [https://github.com/googlesamples/android-vulkan-tutorials](https://github.com/googlesamples/android-vulkan-tutorials)

安卓开发者的福音，跟着 Google 的例子一步一个脚印的去学习。

