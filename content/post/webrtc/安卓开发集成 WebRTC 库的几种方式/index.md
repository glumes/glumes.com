---
title: 【WebRTC 专栏】-- Android 开发集成 WebRTC 库的几种方式
date: 2024-06-18T22:56:24+08:00
slug: android-webrtc-module
subtitle: ""
tags:
  - webrtc
categories:
  - media-development
comments: true
draft: true
original: true
image: "computer-mouse-160032.svg"
author: 星陨
---


在 [Mac M1 等系列芯片编译和开发 WebRTC-Android 库](https://glumes.com/mac-apple-silicon-compile-webrtc-library-for-android/) 中介绍了如何编译 WebRTC-Android 库，分别是编译动态库 `so` 和 `AAR` ，对应着在 Android 开发中也有不同的接入方式。

## AAR 接入： libwebrtc.aar 

通过 AAR 接入是最基础的，需要使用 WebRTC 提供的 Java 接口来完成功能开发。

在 build.gradle 中引入 aar 文件和直接使用 google 提供的包差不多。

```sh
implementation 'org.webrtc:google-webrtc:1.0.+'
```

这种方式接入，如果有 `Java` 或者 `C++` 代码改动都需要编译完成的 `AAR` 才行，不太适合频繁更改的业务需求。

如果 WebRTC 提供的现成 API 接口能满足要求，那倒是可以这样接入，省时省力。


## 动态库接入： libjingle_peerconnection_so.so 

编译动态库 libjingle_peerconnection_so.so 是在 AAR 接入方式上的优化。

如果只是改动 C++ 代码，那么直接替换 so 就行，但前提要把 Java 层相关的接口也挪到项目中去，不然 so 的 JNI 方法和包名对不上了。


## 静态库接入： libwebrtc.a 

更高阶的方式就是静态库集成，只使用 WebRTC 的 C++ 能力，自己封装对外接口。

这种方式需要自定义编译脚本，打包出对应 .a 文件，另外还需要把 WebRTC 相关的头文件都移出来，这样才能够外面调用 .a 的方法。

好在网上都有不少开源实现了，参考如下的脚本：

> https://github.com/callmekendy/build-webrtc-android-static-library

具体代码如下：



```cpp
#!/bin/sh

# This script is used to build the webrtc static library.
# You need to put it into the webrtc source code root directory.

rm -rf out

# check the params
if [ $# != 1 ]; then
    echo "Usage:"
    echo "  sh build_webrtc_static_lib.sh STATIC_MODULE_NAME"
    echo "For example:"
    echo "  sh build_webrtc_static_lib.sh audio_processing"
    exit 1
fi

lib_name=$1

# build the 32bit static library
gn gen out/intermediate/arm --args='target_os="android" target_cpu="arm" use_custom_libcxx=false'

ninja -C out/intermediate/arm ${lib_name}

rm -rf out/intermediate/arm/tmp
mkdir -p out/intermediate/arm/tmp

# copy all .o files to a temp directory
find out/intermediate/arm/obj -name *.o | xargs -n1 -I {} cp {} ./out/intermediate/arm/tmp

cd out/intermediate/arm/tmp

# use the .o files to generate static library
ar rc lib${lib_name}.a *.o

cd ../../../..

mkdir -p out/lib/armeabi-v7a

cp out/intermediate/arm/tmp/lib${lib_name}.a out/lib/armeabi-v7a


# build the 64bit static library
gn gen out/intermediate/arm64 --args='target_os="android" target_cpu="arm64" use_custom_libcxx=false'

ninja -C out/intermediate/arm64 ${lib_name}

rm -rf out/intermediate/arm64/tmp
mkdir -p out/intermediate/arm64/tmp

# copy all .o files to a temp directory
find out/intermediate/arm64/obj -name *.o | xargs -n1 -I {} cp {} ./out/intermediate/arm64/tmp

cd out/intermediate/arm64/tmp

# use the .o files to generate static library
ar rc lib${lib_name}.a *.o

cd ../../../..

mkdir -p out/lib/arm64-v8a

cp out/intermediate/arm64/tmp/lib${lib_name}.a out/lib/arm64-v8a

rm -rf out/intermediate

# copy the header files
mkdir -p out/include
headers=`find . -name '*.h'`
for header in $headers
do
  echo "copy header path: ${header}"
  cp --parents ${header} out/include
done
```




以上代码的具体使用:

```sh
sh build_webrtc_android_static_lib.sh webrtc
```

在 out 目录下就有对应的库了，整体拷贝到项目中接入即可，项目的 CMakeList.txt 配置如下:

```cmake
cmake_minimum_required(VERSION 3.22.1)

project("nativelib")

add_library(${CMAKE_PROJECT_NAME} SHARED
        nativelib.cpp)

include_directories(include/webrtc)
include_directories(include/webrtc/sdk)
include_directories(include/webrtc/sdk/android/src/jni)
include_directories(include/webrtc/third_party/abseil-cpp)

add_definitions(-DWEBRTC_POSIX=1 -DWEBRTC_ANDROID=1 -DWEBRTC_LINUX=1)

target_link_libraries(${CMAKE_PROJECT_NAME}
        android
        log
        ${CMAKE_SOURCE_DIR}/lib/arm64-v8a/libwebrtc.a)
```

接下来就可以直接调用 libwebrtc.a 中的相关方法了，举个例子：

```cpp
#include <rtc_base/thread.h>
extern "C" JNIEXPORT jstring JNICALL
Java_com_glumes_nativelib_NativeLib_stringFromJNI(
    JNIEnv *env,
    jobject /* this */) {
  std::string hello = "Hello from C++";
  auto thread = rtc::Thread::Create();
  thread->Start();

  thread->BlockingCall([] { LOGI("RUN BLOCK CALL"); });
  thread->Stop();

  return env->NewStringUTF(hello.c_str());
}
```

**后续会基于这个工程进行更多 WebRTC API 的探索，争取将 WebRTC 相关的代码设计应用到我们的项目中。**


对源码感兴趣的，可以联系我或者加入知识星球，相关资源都会放在知识星球里面。




