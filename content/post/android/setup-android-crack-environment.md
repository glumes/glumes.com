---
title: "搭建 Android 反编译环境"
date: 2018-01-31T15:47:59+08:00
subtitle: ""
tags: ["android","crack"]
draft: false
categories: ["android"]
comments: true
original: true
addwechat: true
---

在 MAC 上搭建 Android 反编译环境主要就是三个东西：```apktool``` 、```dex2jar``` 、```jd-gui``` 。

<!--more-->

apktool 工具主要是将 apk 文件进行反编译，反编译之后的代码为 ```smali``` 代码。
 dex2jar 工具主要是将 apk 文件文件转成 ```jar``` 文件，最后再使用 jd-gui 工具查看刚刚转成的 ```jar``` 文件。

apktool、dex2jar、jd-gui 这三个工具是跨平台的，不仅能在 Windows 上使用，也可以在 MAC 上使用。

它们的相应的网站地址为：

*    apktool
官网和下载地址：https://ibotpeaches.github.io/Apktool/install/

*    dex2jar
Github 主页：https://github.com/pxb1988/dex2jar
官网和下载地址：https://bitbucket.org/pxb1988/dex2jar/downloads

*    jd-guit
Github 主页：https://github.com/java-decompiler/jd-gui
官网和下载地址：http://jd.benow.ca/

## MAC 上安装 apktool 

安装方法如官网所示：

![install-apktool-on-mac](http://7xqe3m.com1.z0.glb.clouddn.com/blog-install-apktool-on-mac.png)

首先还是需要检查 Java 环境是否配好，需要 Java 1.7 的版本，不过我在 MAC 上 Java 1.8 的版本安装也没问题。

步骤如下：

1. 右键点击下载 ```wrapper script``` 脚本，并将它保存重命名为 ```apktool``` ，不要带任何文件后缀名。
2. 到 https://bitbucket.org/iBotPeaches/apktool/downloads 网站去下载 apktool.jar 文件，并将它重命名为 ```apktool.jar``` 。
3. 将刚刚下载的 ```apktool.jar``` 文件和 ```apktool``` 文件移到到 ```/usr/local/bin``` 目录中去。
4. 使用 ```chmod +x``` 命令赋予上面两个文件执行权限。
5. 运行 ```apktool``` 命令即可验证 apktool 是否安装正确。

如果出现如下图片所示的，则代表安装成功了。

![apktool-install-success](http://7xqe3m.com1.z0.glb.clouddn.com/blog-apktool-install-success.png)

## jd-gui 和 dex2jar 安装

jd-gui 和 dex2jar 工具直接到官网上下载解压缩就可以使用了。

dex2jar 是一个命令行工具，而 jd-gui 是一个有可视化界面的工具。

![jd-gui](http://7xqe3m.com1.z0.glb.clouddn.com/blog-jd-gui.png)

## 测试使用 

### apktool 使用

反编译 apk 的命令为 ：
```sh
apktool d[ecode] [options] <file_apk>
```

编译 apk 的命令为：
```sh
apktool b[uild] [option] <app_path>
```

![apktool-decode](http://7xqe3m.com1.z0.glb.clouddn.com/blog-apktool-decode.png)


如上图，则是将一个 apk 文件进行反编译了，会生成一个与 apk 名称对应的文件夹，这里面就是反汇编之后的东西，其中 smali 文件夹就是汇编代码。

![apktool-build](http://7xqe3m.com1.z0.glb.clouddn.com/blog-apktool-build.png)

如上图，则是将 app-release 目录重新编译生成 apk 文件了。

在 app-release 目录中会多出两个 ```dist``` 和 ```build``` 目录。其中，```dist``` 目录就是生成的 apk 文件目录，而 build 目录就是其他文件目录了。

不过，目前重新编译出来的 apk 文件是不能安装的，因为还没有签名。关于如何给 apk 文件添加签名，应该还需要再来一篇博客学一下才行。

### dex2jar 使用

dex2jar 是将 apk 文件转化成 jar 文件的，其实就是将 apk 里的 ```classes.dex``` 文件转化成 jar 文件。

将下载的 dex2jar 文件解压之后，进入文件夹内，将 ```d2j-dex2jar.sh``` 和 ```d2j_invoke.sh``` 文件赋予可执行权限。

```sh
chmod +x  d2j-dex2jar.sh d2j_invoke.sh
```

之后就可以运行如下脚本来将对应的 apk 文件转化成 jar 文件了。

```sh
 ./d2j-dex2jar.sh /Users/meizu/Demo/Android/AndroidCrackDemo/app/app-release.apk 
```
还在当前目录下会生成一个 ```app-release-dex2jar.jar``` 的文件。这时就需要打开 jd-gui 软件，将生成的 jar 包拖进去即可。

![jd-gui-view-jar](http://7xqe3m.com1.z0.glb.clouddn.com/blog-jd-gui-view-jar.png)

## 参考
http://blog.csdn.net/yanzi1225627/article/details/48215549

