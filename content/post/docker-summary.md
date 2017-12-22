---
title: "Docker 基础知识"
date: 2017-12-22T16:24:03+08:00
tags: ["Docker"]
---


可以简单地将 Docker 理解为一种沙盒 Sandbox 。每个容器内运行一个应用，不同的容器相互隔离，容器之间也可以建立通信机制。

容器的创建和停止都十分快速，容器自身对资源的需求也十分有限，远远低于虚拟机，甚至把容器当做应用本身也没问题。

Docker 容器在启动速度、硬盘使用、性能、系统支持量、隔离性等方面与传统的虚拟机相比都有明显的优势。

<!--more-->

## 虚拟化与 Docker

虚拟化技术是什么？假设现在我只有一台电脑，但是我既想使用 Windows 操作系统也想使用 Ubuntu 操作系统，那么我可以选择再买一台电脑，也可以考虑安装虚拟机来使用 Ubuntu，而安装虚拟机就是使用了虚拟化技术，有了虚拟机，甚至可以安装使用多个 Ubuntu 系统了。每个虚拟机之间都各自独立，但服务器、网络、内存和存储等资源则是虚拟器软件进行统一管理。相当于一个多对一的模型了。

在计算机科学领域中，虚拟化代表着对计算资源的抽象，它是一种资源管理技术，目标往往是为了在同一个主机上运行多个系统或应用，从而提高系统资源的利用率，同时降低成本。


虚拟化技术可以分为基于 *硬件的虚拟化* 和 *基于软件的虚拟化*。前者使用并不常见，后者从对象所在的层次，又可以分为 *应用虚拟化* 和 *平台虚拟化* 。

在平台虚拟化中，主要有两类：
*	完全虚拟化。虚拟机模拟完整的底层硬件环境和特权指令的执行过程，客户操作系统无需进行修改。
	*	常用的 VMware Workstation、VirtualBox 等。
*	操作系统级虚拟化。内核通过创建多个虚拟的操作系统实例（内核和库）来隔离不同的进程。
	*	Docker 容器等。

Docker 容器是在操作系统层面上实现虚拟化，而不是在硬件层面实现虚拟化，直接复用本地主机的操作系统，不需要有额外的虚拟机管理应用，因此更加轻量级。


## Docker 基本概念

Docker 支持 Ubuntu、CentOS、Windows 和 MacOS 等系统，具体的安装可以参考 StackOverFlow 。

一篇不错的理解 Docker 相关概念的文章：[10张图带你深入理解Docker容器和镜像](http://dockone.io/article/783)

### Docker 镜像（Image）

Docker 镜像类似于虚拟机镜像，可以将它理解为一个面向 Docker 引擎的只读模板，包含了文件系统。

镜像是创建 Docker 容器的基础。通过版本管理和增量的文件系统，Docker 提供了一套十分简单的机制来创建和更新现有的镜像。

#### 获取镜像

使用`docker pull`命令从网络上下载镜像。该命令的格式为：
```
docker pull NAME[:TAG]
docker pull ubuntu		// 最新版本
docker pull ubuntu: 14.04	// 标签为 14.04 版本
```
如果不显式地指定 TAG ，则默认会选择 latest 标签，下载最新版本。

#### 查看镜像信息

使用`docker images`命令可以列出本地主机上已有的镜像。

其中镜像的 ID 信息唯一标识了镜像，而镜像的 TAG 信息用于标记来自同一个仓库的不同镜像。

可以使用`docker tag`命令为本地镜像添加新的标签，而不是修改原来的标签。相当于是多了一个别名，本质还是原来的标签。

```
docker tag ubuntu:latest ubuntu:newTag	// 新的标签
docker inspect dockerId		// 通过 ID 查看具体信息
```

使用`docker inspect`命令可以获取镜像的详细信息，以 JSON 的格式返回。

#### 搜寻镜像

使用`docker search`命令可以搜索远程仓库中共享的镜像。

#### 删除镜像

使用`docker rmi`命令删除镜像。

根据镜像的标签来删除：
```
docker rmi ubuntu:newTag 	//删除 newTag 标签的镜像
```
当一个镜像文件有多个标签时，则只是删除标签，若只有一个标签了，那么就是删除镜像文件了。

根据镜像的 ID 删除镜像：
```
docker rmi e4415b714b	// 删除对应 ID 的镜像
```
首先会删除指向该镜像的标签，然后再删除镜像文件本身。


### Docker 容器（Container）

Docker 容器类似于一个轻量级的沙箱，Docker 利用容器来运行和隔离应用。

容器是从镜像创建的应用运行实例，可以将其启动、开始、停止、删除，而这些容器都是相互隔离的、互不可见的。

镜像自身是只读的。容器从镜像启动的时候，Docker 会在镜像的最上层创建一个可写层，镜像本身将保持不变。

#### 新建容器

可以使用`docker create`命令新建一个容器，但此时容器处于停止状态，使用`docker start`命令来启动它。
```
docker create -it ubuntu:latest		// 新建一个容器
docker start 8ca2dd62ec24		//  根据容器 ID 来启动它
```

还可以使用`docker run`命令来新建并启动容器，相当于把之前的两步合为一步了。

```
docker run -t -i ubuntu:latest /bin/bash	// 启动一个 bash 终端
```

上述命令就创建了一个容器，并且启动了一个 bash 终端，允许用户进行交互。其中，`-t`选项让 Docker 分配一个伪终端并绑定到容器的标准输入上，`-i`则让容器的标准输入保持打开。

使用 Ctrl+d 或者输入 `exit`命令来退出容器，当使用`exit`命令退出后，该容器就自动处于终止状态了。


#### 守护态运行

当需要 Docker 容器在后台以守护态形式运行时，可以通过添加`-d`参数来实现。

```
docker run -d ubuntu:latest /bin/bash -c "while true;do echo hell world;sleep 1;done"	// 后台运行，打印日志

docker logs abc19f3d5fd1	// 通过容器 ID 查看输出信息
```
容器启动后会返回唯一的 ID，也可以通过 `docker ps`命令查看容器信息，通过`docker logs`命令查看输出信息。


#### 终止容器

使用`docker stop`来终止一个运行中的容器，当 Docker 容器中指定的应用终结时，容器也自动终止。而`docker kill`命令会直接强行终止容器。

使用`docker ps -a -q`命令可以查看处于终止状态的容器 ID 信息，并且可以通过 `docker start`命令来重新启动。

#### 进入容器

当使用`-d`参数时，容器启动后会进入后台运行，这时想再进入容器，可以使用 `docker attach`命令、`docker exec`命令。

`docker attach`是 Docker 自带的命令。
```
docker run -idt 0ef2e08ed3fa	// 后台运行容器
docker attach 299ea4d823fb		// 再次进入到容器中
```

使用`docker exec`命令可以直接在容器内运行新的命令。
```
docker run -idt 0ef2e08ed3fa	// 后台运行容器
docker exec -ti 299ea4d823fb /bin/bash		// 在容器内创建一个 bash
```


#### 删除容器

使用`docker rm`命令删除处于终止状态的容器。

如果要删除一个运行中的容器，可以添加`-f`参数来强制删除。



### Docker 仓库（Repository）

Docker 仓库类似于代码仓库，是 Docker 集中存放镜像文件的场所。

由于众所周知的原因，Docker Hub 中的镜像不通过科学上网的话是无法直接下载的。在这里，推荐使用 [DaoCloud](https://www.daocloud.io/mirror) 来加速下载。



## 参考
1. https://www.ibm.com/developerworks/cn/linux/l-cn-vt/
2. 《Docker 技术入门与实战》

