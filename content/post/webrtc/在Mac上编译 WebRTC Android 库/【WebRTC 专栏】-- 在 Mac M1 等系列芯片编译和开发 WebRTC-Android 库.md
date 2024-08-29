---
title: 【WebRTC 专栏】-- 在 Mac M1 等系列芯片编译和开发 WebRTC-Android 库
date: 2024-04-27T14:21:37+08:00
slug: mac-apple-silicon-compile-webrtc-library-for-android
subtitle: ""
tags:
  - webrtc
categories:
  - media-development
comments: true
draft: false
original: true
image: /banner/satellite-6799317.svg
author: 星陨
---

众所周知，编译 WebRTC-Android 库是需要在 Linux 系统上的，这是由于源码里编译脚本限制导致。

当然也可以在 Mac 平台上进行编译，不过就需要对源码进行魔改了，毕竟拉取的是 Linux 下的源码和相关配置，要把这些配置替换成 Mac 平台上的，比如 Linux 下的 C++ 编译配置、Android NDK 配置等，这种方式**侵入性比较大，而且还相当折腾，费时费力**。

<!--more-->

## Docker 容器配置

> **有一种更好的方式就是使用 Docker 。**
> 
> **在 Docker 上配置 Linux 环境，然后拉取 WebRTC 源码进行编译，再把编译好的产物（库文件）拉取到本地即可。**

在 Mac 上使用 Docker 直接下载安装就行了，但创建 Linux 容器时要注意对应的芯片平台。

现在大多数 Mac 应该都是苹果自研的 ARM64 架构的 Apple 芯片，不再是英特尔平台的芯片了。

在 Apple 芯片上直接通过 docker 命令创建容器的话，可能还是 arm64 架构的，这样即使拉取了 WebRTC 源码，在编译库的时候还是会提示不支持 arm64 架构，导致编译失败，这也是实际踩过坑后的经验教训。

需要借助 Docker 的 `--privileged=true` 选项（特权模式）来指定平台。

使用如下命令来创建容器：

```shell
docker run --privileged -ti --rm --platform linux/amd64 ubuntu:18.04
```

并且通过该命令来查看对应的镜像是什么平台：
```shell
> docker inspect f9a80a55| grep Architecture

"Architecture": "amd64",
```

f9a80a55 是镜像的 id ，输出是 amd64 的架构。如果没有 `--privileged` 参数，输出就是 arm64 了。

## WebRTC  源码编译

有了镜像之后，接下来就是常规操作，下载 [depot tools](https://chromium.googlesource.com/chromium/tools/depot_tools.git) 并拉取对应源码 。

```shell 
fetch --nohooks --no-history webrtc_android  
# 同步下依赖  
gclient sync
```

再执行如下命令拉取相关的依赖：

```shell
# 安装WebRTC基础的依赖  
./build/install-build-deps.sh
```

通过如下命令编译对应架构的 libwebrtc.aar 文件：

```shell
./tools_webrtc/android/build_aar.py --build-dir Build --arch arm64-v8a
```

编译后的 libwebrtc.aar 文件在 src 目录下，在 Build 目录下有对应的编译产物，此时的 aar 还是 Release 版本的。

要编译 Debug 版本的，找到 `src/build/toolchain/android/BUILD.gn` 文件，修改如下配置：

```shell
# 注释掉下面两行配置，即可实现 unstrip  
# strip = rebase_path("//buildtools/third_party/eu-strip/bin/eu-strip",  
#                     root_build_dir)  
# use_unstripped_as_runtime_outputs = android_unstripped_runtime_outputs
```

编码命令也对应调整：

```shell
./tools_webrtc/android/build_aar.py --build-dir=Build --arch arm64-v8a --extra-gn-args "is_debug=true symbol_level=2 android_full_debug=true"
```

这时编译出的 `libjingle_peerconnection_so.so` 就有几百 M 了，带了 Debug 信息。

这时候通过 `docker cp` 命令将 libwebrtc.aar 文件拉取到本地就可以用来开发了。

```shell
docker cp {container-id}:path/src/libwebrtc.aar ~/}
```

## VSCode 远程开发

可以编译出 libwebrtc.aar  之后，只需要每次改动代码然后编译一次就行了，但是在 Docker 镜像里面用 Vim 来写代码太不方便。

有一种办法是将镜像里的代码同步到本地，然后本地修改了再同步到镜像中，来回倒腾效率也很低，而且还占存储空间。

有更好的办法是使用 VSCode 的远程开发，通过 VSCode 链接到 Docker 容器，直接访问容器中的磁盘目录内容，在 VSCode 中进行可视化的开发，这样效率就提升很多了，并且还能搭配 VSCode 的各种插件来辅助开发。

具体的操作在 VSCode 中下载对应的 Docker 和 Dev Containers 这两个插件。

![](https://image.glumes.com/image/vscode-debug-webrtc-code.webp)


然后在左侧红框中就能看到目前有的容器，在右侧红框中选择要关联的容器，之后在选择要开发的目录，找到 webrtc 下载的源码目录就行，效果如下：
![](https://image.glumes.com/image/vscode-remote-webrtc-folder.webp)



这样一来，就可以在 VSCode 中远程开发 WebRTC  代码，而 Docker 容器只用来编译对应的 libwebrtc.aar  库就行了。



