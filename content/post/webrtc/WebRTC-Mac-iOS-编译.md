---
title: WebRTC-Mac-iOS-编译
date: 2024-01-06T21:28:28+08:00
slug: "url"
subtitle: ""
tags: [webrtc]
categories: ["android"]
comments: true
draft: true
original: true
image: ""
author: "星陨"
---
## 配置工作：
### depot_tools 安装

源码下载：

```sh
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
```

配置坏境变量

```sh
$ echo "export PATH=$PWD/depot_tools:$PATH" > $HOME/.bash_profile

$ source $HOME/.bash_profile
```

检测配置是否成功

```sh
$ echo $PATH
```
### ninja 安装

源码下载和编译：
```sh
$ git clone https://github.com/ninja-build/ninja.git
```

在 ninja 的主页上查看编译方式：

```
./configure.py --bootstrap
```

然后也把 ninja 配置到系统环境变量中。

## 源码下载

WebRTC  的版本迭代在这里找：
https://chromium.googlesource.com/external/webrtc/+/refs/heads/master/docs/release-notes.md

拉取源码：
```sh
fetch --nohooks webrtc_ios
gclient sync
```

指定分支，用目前最新的 [M114 版本](https://webrtc.googlesource.com/src.git/+log/refs/branch-heads/5735)，对应的分支名是 `branch-heads/5735` 。
```sh
git checkout -b m114 branch-heads/5735
gclient sync
```

## Demo 编译：

使用源码中自带的编译脚本进行编译：
```sh
python tools_webrtc/ios/build_ios_libs.py  --output-dir  out/ios  --arch arm64  --extra-gn-args rtc_include_tests=false rtc_build_tools=false rtc_build_examples=false

```


## 参考
1. https://juejin.cn/post/7028417096526594061
2. https://blog.csdn.net/uianster/article/details/121595205







