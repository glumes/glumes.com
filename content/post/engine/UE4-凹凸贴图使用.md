---
title: "UE4 材质练习 之 凹凸贴图偏移的使用"
date: 2022-09-12T11:58:15+08:00
slug: "ue4-dump-offset"
subtitle: ""
tags: ["UE4"]
categories: ["engine"]
comments: true
bigimg: [{src: "/img/banner.jpg", desc: ""}]
draft: false
original: true
image: ""
author: "星陨"
---

UE 中提供了 `凹凸贴图偏移` 的贴图来实现修改 UV 坐标达到提升表面细节，使材质产生深度错觉。凹凸贴图偏移是 UE4 中的术语，其实就对应于 LearnOpenGL 网站上的 `视差贴图`。

<!--more-->

## 视差贴图原理

理解了视差贴图的含义就很容易明白凹凸贴图偏移的作用了，它的原理如下图所示：

![](/image/engine/parallax_mapping_scaled_height.png)

首先需要提供一张代表高度图的纹理，这样每个像素点都对应一个高度值，上图中的红线可以理解成高度值分布，点 A 对应的高度值就是 H(A)。

以视线方向看向点 A 时，由于高度的遮挡实际看见的是点 B，所以在纹理采样时只要在点 A 的坐标基础上加上点 B 的坐标偏移就行了，但是实际上很难准确预测点 B 的存在，它只是粗略估算得到的。

所以在实际操作时，一般采样点 A 对应的高度值，然后在视线方向以高度值大小进行缩放，向量 P 就是缩放后的结果，这个时候再用点 A 的坐标加上向量 P 在坐标轴上的偏移就行了。

视差贴图存在一定的局限性，主要在于点 B 和向量 P 之间有时候变化很块导致预测误差较大，所以才有了后面的陡峭视差映射和视差遮蔽映射，在 UE 中也提供了视差遮蔽映射的计算，不过本篇先使用简单的视差映射。

理解了视差映射的基础概念后，就很容易明白 UE 中凹凸贴图偏移的对外参数含义了。

## BumpOffset 使用

![](/image/engine/ue-mat-bump-offset.png)

首先针对每个像素都要有个高度值，这一般用个高度图来表示就行了，对应 BumpOffset 中的 Height 节点，其实也可以用一个常量来表示高度值。

一般都是用一张高度度来表示每个像素的高度信息，不过 BumpOffset 并不接受 RGB 通道作为连接节点，因为高度信息使用 R、G、B 单个通道来表示就行了。

同时由于高度图要进行纹理采样，那么务必涉及到对纹理坐标 UV 的操作了，BumpOffset 中的 Coordinate 节点就是对应 UV 的调整。

最后的输入节点 HeightRationInput 就是对采样的高度值进行比例系数的缩放，可让外部调整放大的倍数。不光是 BumpOffset 有这系数操作，在涉及到纹理采样的操作中都会有对采样后的 RGB 数据进行相应的调节操作，比如对采样后的 RGB 数据乘以 1 保持原始状态，也可以把要乘的数作为参数暴露给外界进行调整。

根据视差贴图的原理可知，BumpOffset 的输出结果就是对纹理采样坐标的偏移，通过这个偏移实现深度错觉，所以要把输出节点连接到 Diffuse、Roughness、Normal 节点的 UV 上。


## 视差遮蔽映射

UE 还提供了视差遮蔽映射的方法，如下图所示：

![](/image/engine/parallax_occlusiont_mapping.png)

它同样也是用来实现高度效果的，原理就是 LearnOpenGL 网站上的 `视差遮蔽映射` 。

其中输入参数 Heightmap Texture 对应高度图纹理对象，不再是纹理采样，而 Heightmap Channel 表示选择纹理对象的哪个通道作为高度值，UVs 表示对高度图纹理坐标进行相关操作

输入参数 Min Steps 和 Max Steps 表示分层最小和最大数目，输出参数 Parallax UVs 和 BumpOffset 的输出参数一致，表示对纹理采样的偏移值。

视差遮蔽映射会比简单的视差贴图实现更好的效果，但是性能上也会损耗多一些。