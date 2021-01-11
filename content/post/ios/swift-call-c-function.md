---
title: "iOS开发 - 在 Swift 中去调用 C/C++ 代码"
date: 2021-01-11T09:54:15+08:00
subtitle: ""
tags: ["ios"]
categories: ["ios"]
comments: true
bigimg: [{src: "https://image.glumes.com/blog_image/610391b1gy1gmhbipn8w5j208x0sgtk7.jpg", desc: ""}]
draft: false
original: true
---

众所周知，Swift 是不能直接调用 C/C++ 代码的，而 Objective-C 是可以直接调用的。

想要 Swift 调用 C++ 方法，需要走 Objective-C 中转才行，类似于 Java 调用 C++ 代码需要走 JNI 一样。

反而 Swift 调用 C 方法还要简单一些，不需要 Objective-C 中转，以下就是具体操作详情~

<!--more-->

## Swift 调用 C 代码

首先定义好 C 语言对应 .h 头文件和 .c 实现文件。

头文件如下：

```c
#ifndef CTest_h
#define CTest_h

#include <stdio.h>

// 定义一个方法
void test();

#endif /* CTest_h */
```

实现文件如下：

```c
#include "CTest.h"

void test(){
    printf("swift call from c\n");
}
```

内容很简单，就是打印一个字符串而已。

注意，当我们通过 XCode 来创建 C 文件时，会有如下的弹框：

![](https://image.glumes.com/blog_image/swift-call-c-bridging-header.png)

这个弹框非常重要啦，它会帮我们实现 Swift 和 C 之间的链接。

在项目配置里面能看到对应的链接文件说明，在 Swift 编译时会把它编译进去的。

![](https://image.glumes.com/blog_image/objective-c-bridging-header.png)

我们要在这个弹框创建的头文件里把上面的 C 代码头文件通过 import 包含进入，也就是实现下面的代码：

```cpp
#import "CTest.h"
```

然后就可以在 Swift 中愉快地调用 C 函数啦~~

![](https://image.glumes.com/blog_image/swift-call-c-function.png)

Swift 里面直接调用 C 语言函数就好啦，也不需要额外 import 什么库了。

## Swift 调用 C++ 代码

Swift 调用 C++ 代码和调用 C 代码基本一致，就是要通过 Objective-C 来做一下中转了，如下图所示：

![](https://image.glumes.com/blog_image/1_5T55sdkgloZANf92PGXyDA.png)

首先还是先创建好对应的 C++ .h 头文件和 .cpp 实现文件。

头文件如下：

```cpp
#ifndef CppTest_h
#define CppTest_h

#include <iostream>
class CppTest{
public:
    void test();
};
#endif /* CppTest_h */
```

实现文件如下：

```cpp
#include "CppTest.h"

void CppTest::test(){
    printf("swift call from c++\n");
}
```

重点来了，在 XCode 中创建 Objective-C 文件来做中转，同时要将创建的 `.m` 文件后缀改成 `.mm` ，也就是后缀两个 m 的文件，这是告诉 XCode 编译该文件时要用到 C++ 代码。

在中转的 Objective-C 文件代码中实现如下内容：

Objective-C 的头文件声明一个方法：

```cpp
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface CppTestWrapper : NSObject

-(void) testcpp;

@end

NS_ASSUME_NONNULL_END
```

Objective-C 的 .mm 文件实现该方法：

```cpp
#import "CppTestWrapper.h"
#import "CppTest.h"
#import <memory>

@implementation CppTestWrapper

-(void)testcpp{
    auto sp = std::make_shared<CppTest>();
    sp->test();
}
@end
```

这里用到了 C++ 文件，所以要用 import 包含进来，然后就可以声明并创建 C++ 类了。

接下来要在负责链接的头文件中导入上面的 Objective-C，主要是导入 Objective-C 头文件而不是 C++ 的头文件，这和调用 C 语言方法还是不一样的。

```cpp
// 调用 C 就导入 C 头文件
#import "CTest.h"
// 调用 C++ 导入 Objective-C 头文件
#import "CppTestWrapper.h"
```

接下来就可以在 Swift 中调用 Objective-C 从而间接调用 C++ 代码啦。

![](https://image.glumes.com/blog_image/swift-call-c++-function.png)

如上图所示，先是创建了 Objective-C 对象，然后再调用其方法。

通过上述操作就可以愉快地调用 C++ 代码啦~~

以上方案经过实践在 iOS 和 macOS 开发中都可以使用。

## 参考

1. https://medium.com/@anuragajwani/how-to-consume-c-code-in-swift-b4d64a04e989
2. https://www.youtube.com/watch?v=SsqsRfvbJOI




