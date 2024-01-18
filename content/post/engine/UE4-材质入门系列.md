---
title: "UE4 材质练习系列基础"
date: 2022-09-10T17:08:48+08:00
slug: "UE4-material-practice"
subtitle: ""
tags: ["UE4"]
categories: ["graphics-renderer"]
comments: true
bigimg: [{src: "/img/banner.jpg", desc: ""}]
draft: false
original: true
image: ""
---

学习 UE4 虚幻引擎的一些练习。

<!--more-->

## 基础概念

使用 UE 创建材质后，默认状态如下图所示，这里面有很多参数设置来决定材质的类型和用途。

![创建材质默认状态](/image/engine/create_default_material.png)

右侧是材质连接节点，左侧是材质的相关属性，选择不同的材质着色模型，右侧的连接节点会随之发生变化。

在 UE 文档中，右侧的连接节点称为主材质节点，也是最终的输出节点，负责显示出最后的结果。

主材质节点对外提供了很多输入节点，如图中所示，显示白色的输入表示该输入将影响材质，而显示灰色的输入表示它们对材质没有影响。默认情况下，主材质节点会有一些以灰色显示的输入。

可以将其他节点的输出连接到主材质显示灰色的输入节点上，但是并不会产生任何效果。要有效果的话，需要在左侧的细节面板中调节相关参数才行。

关于主材质节点的更多内容参考这里：

https://docs.unrealengine.com/4.26/zh-CN/RenderingAndGraphics/Materials/HowTo/Main_Material_Node/

主材质节点其实对应了 UE 底层的着色模型，比如默认的着色模型就是 `默认光照`，也是就 PBR 的 ShadingModel 。材质输入参数中的基础颜色、高光度、粗糙度、Metallic 就是 PBR 实现中 BRDF 相关的参数设置。

另外一些参数设置，比如`世界场景位置偏移`，就是 UE 在底层实现渲染时提供的额外输入参数了，掌握这些参数可以更好地实现效果。这就类似于 Shadertoy 网站上写着色器效果，这个网站在每个 Shader 中都提供了默认输入，比如鼠标位置、时间等，开发者在着色器中直接用就好了。

UE 中提供了多种着色模型，除了默认光照之外，还有如下：

![着色模型](/image/engine/ue_shadingmodel.png)

关于着色模型更多内容参考这里：

https://docs.unrealengine.com/4.27/zh-CN/RenderingAndGraphics/Materials/MaterialProperties/LightingModels/


接下来会尝试创建一个简单的材质：

## 材质创建

### 快捷键使用

想要更快的创建材质，很重要的技巧就是使用快捷键。

使用快捷键的一般操作都是先在键盘按住对应的字母，然后使用鼠标在蓝图中点击要放置的位置。

常量创建：

数字键 1、2、3、4 分别对应 1、2、3、4 维的常量，如下图所示：

![](/image/engine/ue-create-vector.png)

运算操作：

快捷键 A、M、D 分别对应于加法、乘法、除法，如下图所示：

![](/image/engine/ue-add-mul-divide-operation.png)

纹理操作：

快捷键 T、U 分别对应于贴图节点、UV 坐标节点，如下图所示：

![](/image/engine/ue-tex-operation.png)


除此之外，还有其他不少快捷键，就不一一列举了。

### 基础材质

如下所示，创建了一个简单的红砖材质，贴上了颜色、高光、粗糙度、法线、AO 等贴图。

![](/image/engine/brick_material.png)

并且把用到的纹理贴图都参数化了，同时增加了一个对 UV 的调整，可以改变 UV 采样的范围。

这是一个很简单的材质，在着色模型不变的情况下，改变的是最终连接到主材质输入节点前的结果，很多的工作都是在输入节点前做的，这也是能积累大量经验的地方，需要不断地打怪升级，目前就做个简单示例。

### 材质函数

在 UE 蓝图中还提供材质函数，类似于编程语言中的函数封装，可以将一些通用计算放到材质函数中去。

比如上图示例中将 UV 坐标乘以常数的操作就可以放到材质函数中去，如下图所示：

![](/image/engine/change-uv-function.png)

不是所有类型的参数都可以作为材质函数的输入，仅有如下的几种类型：

![](/image/engine/mat-function-input-type.png)

点击鼠标右键然后搜索 `FunctionInput` 和 `FunctionOutput` 可以添加输入和输出节点，添加输入节点后去修改输入的类型就可以接收不同参数了，而输出节点没有修改参数类型的地方，由最终计算得到具体类型。

除了自己创建的材质函数之外，UE 还自带了不少材质函数可以使用。

具体链接可以参考这里：

https://docs.unrealengine.com/4.26/zh-CN/RenderingAndGraphics/Materials/Functions/Reference/

这些材质函数涉及到数学运算、纹理操作、图像调整、粒子效果等多个方面。

### 材质参数集合

材质参数集合类似于全局变量，它是一个用来存储任何标量参数和矢量参数集合的资源。可以在多个蓝图中引入相同的材质参数集合，这样一旦修改材质参数集合中的变量，所有的材质实例都会起作用。而创建单独的材质实例，修改参数后只能在该材质实例上起作用，无法改变其他材质实例。

创建材质参数集合如下所示：

![](/image/engine/create-material-parameter-collection.png)

创建了多个参数，但是在使用时一次只能使用一个，因为只有一个输出节点：

![](/image/engine/mat-parameter-usage.png)

在材质参数集合的细节面板中要选择当前用到的参数具体是哪个，否则是识别不到参数的。

最后在关卡中，直接对材质参数集合中的变量进行修改就可以实现改变材质的结果了，不需要在材质实例中修改。

### 材质分层

得益于材质函数的功能，可以将材质函数作为一个完整的材质层，这时候材质函数的输出不再是计算后的单一节点了，而是完整的材质属性列表。

通过 MakeMaterialAttributes 节点创建一个材质属性列表，这列表里面包括了颜色、高光、粗糙度等各种属性，基本上和主材质节点中的属性一样了，如下所示：

![](/image/engine/make_material_attribute.png)

可以直接把创建的材质中的节点全部复制过来，让这个材质函数自身闭环作为一个材质层，然后通过 BreakMaterialAttributes 节点再把这些属性拆分，一个一个的赋值给主材质节点。

![](/image/engine/break_material_attribute.png)

这里只用到了一层材质，如果有多个材质函数构造的材质层，每层都有相同的属性，这时候就需要对这些属性进行混合操作，在 UE 中提供了很多 MatLayerBlend_xxxx 类似的函数进行各种混合操作。

![](/image/engine/MatLayerBlendFunctions.webp)

除了混合之外，还可以对材质层做选择操作，在一定条件下选择相应的材质层。

以上就是关于材质的基本操作总结，还有很多精细的操作后续慢慢摸索了。

## 渲染管线

最后，完成材质创建并且赋给了对应的模型后，可以通过 `profilegpu` 命令查看当前的渲染管线。


![](/image/engine/profile_gpu.png)

关于渲染管线的更多内容，后续再慢慢学习 UE 的源码了！！！



