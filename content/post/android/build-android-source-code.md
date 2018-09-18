---
title: "编译安卓源码"
date: 2018-01-31T15:31:44+08:00
subtitle: ""
tags: ["Android"]
draft: false
categories: ["android"]
comments: true
original: true
addwechat: true
---

花了一两天时间终于在 Mac 上成功编译了 Android 主线最新代码，中间遇到了不少问题，也查阅了好多资料，总算是成功了，看到模拟器启动的那一刻还是挺激动的。

<!--more-->

## 环境准备

由于我编译的是安卓主线的最新代码，版本是安卓 6.0 的，而网上有些博文是基于 Android 4.0 版本的，这两者之间的编译还是有些差距的，这里列举一下我的环境。

*    Mac 一台，16 G 内存（版本：10.11.5）。
*    Java 8
*    Xcode 安装（包含命令行工具等等）
*    Android 开发环境安装

如果本身就是开发安卓的，那么这些环境准备工作应该都可以略过了，之前就应该配好了的，只要电脑足够强劲就行了。

## 大小写区分的文件系统
在 Mac 电脑上需要创建一个大小写区分的文件系统，而 Mac 默认是大小写不区分的。

### 使用磁盘工具创建

Mac 自带了磁盘工具软件来创建磁盘，也就是我们平时安装软件时的 ```.dmg``` 格式的文件。不过，在我使用的时候，明明选择了 ```OS X 拓展（区分大小写，日志式）``` ，可创建出的磁盘镜像依旧还是不区分大小写的，试了两次之后还是不行，干脆放弃了，转用命令行。

### 使用命令行创建 

在安卓的官方教程中都已经给出了具体的命令了：https://source.android.com/source/initializing.html#setting-up-a-mac-os-x-build-environment

*    创建一个大小是 40 G 的，区分大小写的，稀疏磁盘映像的文件系统。

```sh 
hdiutil create -type SPARSE -fs 'Case-sensitive Journaled HFS+' -size 40g ~/android.dmg
```

然而，当我用了这个命令行之后，发现的确创建了磁盘，但却是只读的，不能写入，这就很尴尬了。
解决方法就是干脆不创建稀疏磁盘映像了，创建一个固定大小的可读写的磁盘映像。

使用 ```hdiutil create -help``` 命令，读/写磁盘映像的命令对应的是 ```UDIF``` ，更换命令行如下：

```sh 
hdiutil create -type UDIF -fs 'Case-sensitive Journaled HFS+' -size 80g ~/android.dmg
```
将 ```SPARSE``` 替换成 ```UDIF``` ，并且将容量扩大到 80 G 。

*    调整磁盘映像文件大小

```sh
hdiutil resize -size <new-size-you-want>g ~/android.dmg.sparseimage
```

由于创建的固定大小的，也就没什么需要再改变的了。

*    挂载磁盘映像

```sh
# mount the android file imagefunction mountAndroid { hdiutil attach ~/android.dmg -mountpoint /Volumes/android; }
```

将此 function 写入到 ```~/.bash_profile``` 文件中，就可以直接在命令行使用 mountAndroid 命令了。其实，创建了磁盘映像之后，直接双击也可以将其挂载上去了。

*    卸载磁盘映像

```sh 
# unmount the android file imagefunction umountAndroid() { hdiutil detach /Volumes/android; }
```

## 下载 Android 源码

由于众所周知的原因，Android 源码是在 [清华大学 TUNA 镜像源](https://mirrors.tuna.tsinghua.edu.cn/help/AOSP/) 上下载的。

我使用的是每月更新的初始化包。首先需要进入到自己挂载的区分大小写的磁盘镜像中去，然后按照清华大学的 Android 镜像使用帮助给的命令执行即可。

```sh
//下载 repo 工具
mkdir ~/bin
PATH=~/bin:$PATH
curl https://storage.googleapis.com/git-repo-downloads/repo > ~/bin/repo
chmod a+x ~/bin/repo //使用每月更新的初始化包
wget https://mirrors.tuna.tsinghua.edu.cn/aosp-monthly/aosp-latest.tar # 下载初始化包
tar xf aosp-latest.tar
cd AOSP   # 解压得到的 AOSP 工程目录# 这时 ls 的话什么也看不到，因为只有一个隐藏的 .repo 目录
repo sync # 正常同步一遍即可得到完整目录# 或 repo sync -l 仅checkout代码
```
解压之后，AOSP 文件夹的大小大概是 37.5 G 左右。

## 一波三折的编译过程

下载好了 Android 源码就可以进行编译了，整个编译过程就三个命令：

*    脚本环境初始化
```sh
source build/envsetup.sh
```
*   选择要编译的目标
```sh
lunch // 根据提示的选项用数字来选择
```
*    执行编译
```sh
make -j4// 数字4代表执行的线程，根据个人电脑情况所定
```

然后要顺利执行完这三个命令，中间还会遇到很多问题......

### 使用 bash 而非 zsh

在执行 
```sh
source build/envsetup.sh
``` 
命令时，使用 zsh 并不能把所有的内容都初始化，有些命令还是需要 bash 来完成的。

```sh
echo $SHELL  // 查看当前使用的shell
chsh-s /bin/bash    // 切换到 bash 
```

### 更新 curl 工具

在执行 make 命令时，会遇到如下的问题，需要安装 Jack server。这个东西是不需要再另行安装的，应该编译过程中会搞定的。执行在编译时用到了 curl 工具，而 curl 工具需要支持 ssl 。

![java-server-not-install-2](http://7xqe3m.com1.z0.glb.clouddn.com/blog-java-server-not-install-2.png) 

通过 ```curl --version``` 查看当前 curl 版本，如果是 7.43 或者更低，不能再版本信息中看到 OpenSSL 的字样，说明就要更新了，然而，通过 homerew 更新 curl 之后，会发现，当前的版本仍是之前的版本，解决方法如下：http://stackoverflow.com/questions/31708574/curl-does-not-support-http2-on-mac

```sh
// 安装新版 curlbrew install curl --with-nghttp2 --with-openssl
# link the formula to replace the system cURL
$  brew link curl --force
# now reload the shell
```

这个时候在查看 curl 版本，就会发现已经更新了。

### 空间不足

如果在编译过程中出现了如下图片所示的错误，No space left on device ，说明创建的磁盘空间不足了，需要再扩大一下磁盘空间了。![no-space-left](http://7xqe3m.com1.z0.glb.clouddn.com/blog-no-space-left.png) 

## 编译成功

在解决上面的问题之后，虽说编译过程还是会报出很多错误，但是都可以忽略了，并不影响到最后的编译结果。当然，如果编译到一半停住了，那肯定是要解决问题了。例如网上还有的问题就是报的内存不够之类的。
漫长的等待之后，就会出现编译成功的提示了。
![make-success](http://7xqe3m.com1.z0.glb.clouddn.com/blog-make-success.png) 

### 模拟器

接下来就是启动模拟器了，一个令人激动的时刻了，因为之前选择的编译就是在模拟器上的。
执行 ```emulator``` 命令即可启动模拟器，但还是会收到如下的提示：![system-partition](http://7xqe3m.com1.z0.glb.clouddn.com/blog-system-partition.png) 

因为 Android 最新的版本是 6.0 的，所以我们还要指定一下模拟器的配置信息。```emulator  -partition-size 2048```在经过漫长的等待之后，模拟器就启动了，显示的就是最新的 Android 主分支上的 6.0 的系统了。

## 参考

1. http://www.jianshu.com/p/367f0886e62b# 
2. http://www.cnblogs.com/qianxudetianxia/p/3681890.html
3. http://blog.alexwan1989.com/2016/01/12/Android%E6%BA%90%E7%A0%81%E5%AD%A6%E4%B9%A0%EF%BC%88%E4%B8%80%EF%BC%89/


