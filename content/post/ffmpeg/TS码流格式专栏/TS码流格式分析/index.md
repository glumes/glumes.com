---
title: 【TS流专栏】TS 码流格式分析
date: 2024-03-29T23:00:37+08:00
slug: ts-video-format
subtitle: ""
tags:
  - TS流
categories:
  - software-development
comments: true
draft: true
original: true
image: MPEG-TS-small.webp
author: 星陨
---


TS格式介绍


TS 流的生成过程和解析过程

TS 的 seek 处理
TS 为什么不能快速 seek 操作



## TS 格式介绍

![](ts-stream.png)

TS（Transport Stream）流，也叫传输流，是一个又一个Packet形成，每一个Packet即为一个TS包，由 4 字节的 Header 和 184 字节的 Data 组成。

```cpp
/**
 * TS流:                      
 * +-+-+-+-+     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |  TS   |  =  |  Packet 1 |  Packet 2 |  Packet 3 |    ...    | Packet n-1|  Packet n |
 * +-+-+-+-+     +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * 
 * 一个Packet:             4bytes             184bytes         
 * +-+-+-+-+-+    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * |  Packet | =  | Packet header |       Packet data       |
 * +-+-+-+-+-+    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */
```

TS包大小固定为 188 字节，必须以`0x47`开头，内部有3个部分：`TS Header`、`Adaptation Field`、`Payload`，其中TS固定头（packet header）4个字节，Adaptation Field 可能存在也可能不存在，长度不固定。

```cpp
/**
 *       4 byte         x byte                 184-x byte
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 * | ts header |  adaptation field |          payload(pes)       |
 * +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */
```

其中，TS包中 Payload 所传输的信息包括两种类型：

- 视频、音频、辅助数据的`PES`包；
- 节目专用信息`PSI`；

TS包也可以是空包，空包（0xFF）用来填充TS流，可能在重新进行多路复用时被插入或删除。视频、音频的ES流需进行打包形成视频、音频的 PES流。辅助数据（如图文电视信息）不需要打成PES包。

> PES 包：全称是 Packet Element Stream 。



## 参考：

http://vegetable.wodekouwei.com/2018/02/11/m-f-ts/
https://castr.com/blog/mpeg-transport-stream-mpeg-ts/
https://zhuanlan.zhihu.com/p/526685396


https://zhuanlan.zhihu.com/p/526685396  TS 流的生成过程 和 解析过程

https://blog.csdn.net/andylao62/article/details/120019483 ts 详细的 PSI 格式讲解


https://github.com/xuguangxiao/ts_analyzer ts 格式分析软件 

TS格式不能seek到关键帧。https://github.com/bilibili/ijkplayer/issues/5295

https://blog.csdn.net/lm278858445/article/details/131385046  # TS格式视频的使用，无法进行快速 seek 

