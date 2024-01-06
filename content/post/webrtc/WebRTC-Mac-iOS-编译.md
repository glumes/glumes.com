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
$ git clone git://github.com/martine/ninja.git

$ cd ninja/

$ ./bootstrap.py
```

## 源码下载

```sh

```