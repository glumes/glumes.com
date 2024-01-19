---
title: "Metal 开发 | 使用 C++ 进行接口调用"
date: 2021-11-28T22:06:37+08:00
subtitle: ""
tags: ["iOS"]
categories: ["software-development"]
comments: true
 
draft: false
original: true
image: "/img/banner.jpg"
slug: "start-metal-with-cpp"
---

前两天在群里面看到大佬转发一篇文章：**Getting started with Metal-cpp** 。

链接在此:

> https://developer.apple.com/metal/cpp/

文章大意就是：一顿操作安排上，苹果现在支持用 C++ 开发 Metal 了。

<!--more-->

众所周知，在做渲染后端开发时，OpenGL 和 Vulkan 都是支持 C++ 开发的，可以直接定义 C++ 相关接口并根据平台特性去实现。

而 Metal 则需要支持 Objective-C 才行了，编写的文件也是 .m 文件格式，但是现在就可以直接写 C++ 的渲染实现了。

## 前置准备

根据官方文章中的内容，首先要确保 Xcode 版本在 9.3 以上，并且要使用 C++17 的语法。

同时要下载好 Metal 对应的 C++ 头文件（metal-cpp），链接地址如下：

https://developer.apple.com/metal/cpp/files/metal-cpp_macOS12_iOS15.zip

## 创建工程

创建一个 macOS 上的工程，可以是 App 工程也可以是命令行工程，主要是验证一下环境配置是否正确。

接下来要把下载好的 Metal 头文件（metal-cpp）放在工程搜索路径中的，如下图所示:

![](https://image.glumes.com/blog_image/20211128205156.png)


然后把 C++ 版本改成 std=c++17 。

![](https://image.glumes.com/blog_image/20211128205207.png)

接下来要把 framework 依赖包含进来：

![](https://image.glumes.com/blog_image/20211128205634.png)

主要是：

* Foundation.framework
* QuartzCore.framework
* Metal.framework

把以上的环境依赖都搞定之后，就可以进行代码开发了。

## 代码开发

首先需要把 Metal 相关头文件包含进来，由于它只是一个头文件的库，要生成对应的实现，还要把一些宏配置加上。

核心就是如下一段代码，

```cpp
#define NS_PRIVATE_IMPLEMENTATION
#define CA_PRIVATE_IMPLEMENTATION
#define MTL_PRIVATE_IMPLEMENTATION
#include <Foundation/Foundation.hpp>
#include <Metal/Metal.hpp>
#include <QuartzCore/QuartzCore.hpp>
```

在其他需要用到 Metal 相关对象的地方，就只用包含三个头文件就好了。

三个头文件都是配套一起出现的，当然也可以只包含一个头文件就行。

在下载 metal-cpp 的 SingleHeader 文件夹下，有一个 MakeSingleHeader.py 脚本， 运行它来生成：

```cpp
./SingleHeader/MakeSingleHeader.py Foundation/Foundation.hpp QuartzCore/QuartzCore.hpp Metal/Metal.hpp
```

这样一来，在 SingleHeader 文件夹下会生成 Metal.hpp 文件，它包含了所有会用到的对象，只包含它一个就好了。

```cpp
#define NS_PRIVATE_IMPLEMENTATION
#define CA_PRIVATE_IMPLEMENTATION
#define MTL_PRIVATE_IMPLEMENTATION
#include <Metal/Metal.hpp>
```

成功引入了 Metal 头文件就可以进行开发了，官方也给出了一个 Demo 工程，可以运行下这个工程：

https://developer.apple.com/documentation/metal/rendering_a_scene_with_deferred_lighting_in_c

另外，用 Metal 做渲染引擎的开发，比用 OpenGL 写要快多了，因为它本身就提供了很多封装工具类，比 OpenGL 从零开始写要省不少事，而且说不定性能还强不少。