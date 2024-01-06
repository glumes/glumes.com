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

使用指定分支的同步方式，用目前最新的 [M114 版本](https://webrtc.googlesource.com/src.git/+log/refs/branch-heads/5735)，对应的分支名是 `branch-heads/5735` ，commit id 是  `729f79c176c8b4c3a8c1b60f39df5fb43323b27b` 。
```sh
fetch --nohooks webrtc_ios
gclient sync

git checkout -b m114 branch-heads/5735
gclient sync
```

使用 commit id  的同步方式：
```sh
fetch --nohooks webrtc_ios
gclient sync -r 729f79c176c8b4c3a8c1b60f39df5fb43323b27b --force
gclient sync
```
## Demo 编译：

### 编译库文件

~~设置要编译的平台到环境变量中去，没有这一步也可以。~~
```sh
# 32位真机
$ export GYP_DEFINES="OS=ios target_arch=arm"
# 64位真机
$ export GYP_DEFINES="OS=ios target_arch=arm64"
# 32位模拟器
$ export GYP_DEFINES="OS=ios target_arch=ia32"
# 64位模拟器
$ export GYP_DEFINES="OS=ios target_arch=x64"
# OSX
$ export GYP_DEFINES="OS=mac target_arch=x64"
# 配置输出路径
$ export GYP_GENERATOR_FLAGS="output_dir=out_xxx"
```

使用源码中自带的编译脚本进行编译，在 `src/tools_webrtc/ios` 目录下的 `build_ios_libs.sh` 脚本，该脚本实际调用的是 `build_ios_libs.py` 。
```sh
./build_ios_libs.sh
```

运行结束后，在 `out_ios_libs` 目录下有对应的 `WebRTC.xcframework` 文件夹生成。

### 编译 iOS Demo 工程：
Demo 工程 AppRTCMobile 使用 ninja 进行编译，需要有证书才行，否则光执行如下命令，会报错的。
```sh
gn gen out/ios_64 --args='target_os="ios" target_cpu="arm64"' --ide=xcode
```

报错内容：
```sh
gn gen out/ios_64 --args='target_os="ios" target_cpu="arm64"' --ide=xcode
ERROR at //build/config/ios/ios_sdk.gni:138:33: Script returned non-zero exit code.
    ios_code_signing_identity = exec_script("find_signing_identity.py",
```

编译 Mac Demo：
```
gn gen out/mac_64 --args='target_os="mac" target_cpu="arm64"'
```
如果提示 is only available on macOS 10.14 or newer ，在 src/build/config/mac/mac_sdk.gni 文件中修改版本，[参考这里](https://www.cnblogs.com/milliele/p/11019300.html)

如果提示 is deprecated: first deprecated in macOS 10.14 [-Werror,-Wdeprecated-declarations] ，改成 -Wno-deprecated-declarations 。



## 参考
1. https://juejin.cn/post/7028417096526594061
2. https://blog.csdn.net/uianster/article/details/121595205
3. http://www.enkichen.com/2017/05/12/webrtc-ios-build/
4. https://cloud.tencent.com/developer/article/1608871







