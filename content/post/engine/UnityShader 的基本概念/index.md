---
title: "UnityShader 的基本概念"
date: 2021-08-15T15:18:06+08:00
subtitle: ""
tags: ["Unity"]
categories: ["graphics-renderer"]
comments: true
slug: "unity-shader-basic-content"
 
draft: false
original: true
---

Unity 中的 Shader 不同于 OpenGL 的 GLSL ，它是通过 ShaderLab 语言编写的。

ShaderLab 是 Unity 为开发者提供的高层级的渲染抽象层，它是一种说明性语言。

<!--more-->

ShaderLab  使用了一些嵌套在花括号内部的语义来描述一个 Unity Shader 文件的结构，这些结构包含了许多渲染所需的数据。


$a_{1}$

一个 Unity Shader 的基本结构如下：

```cpp
Shader "shaderName" {
    Properties{
        // 属性
    }
    
    SubShader{
        // 显卡 A 使用的子着色器
    }
    
    SubShader{
        // 显卡 B 使用的子着色器
    }
    Fallback "VertexLit"
}
```

可以在 Properties 语句块中定义着色器所需的各种属性，这些属性将会出现在材质面板中。

## UnityShader 中的属性


UnityShader 中共有 8 种属性类型，如下代码所示：

```cpp
Shader "Basic/BasicPropertiesShader"
{
    Properties
    {
        _Int ("Int",Int) = 100
        _Float("Float",Float) = 10.0
        _Range("Range",Range(0.0,5.0)) = 3.0
        _Color("Color",Color) = (1,1,1,1)
        _Vector("Vector",Vector) = (2,3,6,1)
        _2D("2D",2D) = ""{}
        _Cube("Cube",Cube) = "while"{}
        _3D("3D",3D) = "black"{}
    }
    Fallback "Diffuse"
}
```

Int、Float、Range 类型对应单独的数字，Color、Vector 类型对应四维向量，2D、3D、Cube 对应纹理类型，默认值通过一个字符串和花括号来指定，字符串要么是空的，要么是内置的纹理名称，比如“while”、“black”、“gray”等。

定义这些属性之后就可以在参数面板里面去调节对应值。

![[9982b5e6d65970f8349220a7bf3b2f1c_MD5.png]]

要想真正使用这些值去调节 Shader 效果，还需要在 SubShader 中再定义一遍。

## SubShader 的使用

每一个 UnityShader 可以包含多个 SubShader 语义块，但最少要有一个。

SubShader 语义块中包含的定义如下：

```cpp
SubShader {
   // 可选
   [Tags] 
   
   // 可选
   [RenderSetup]
   
   Pass{
   
   }
   
   // Other Pass
}
```

SubShader 中定义了一系列 Pass 和可选的状态（RenderSetup）和标签（Tags），每个 Pass 定义了一次完整的渲染流程。

Pass 中也可以定义状态（RenderSetup）和标签（Tags）。

但是 SubShader 中的标签是特定的，和 Pass 中使用的标签是不一样的。

而状态设置的语法是相同的，但 SubShader 中设置了状态，会是全局生效作用于所有的 Pass ，不过 Pass 中不想用全局状态可以在 Pass 另外定义状态来修改。


### 状态设置

ShaderLab 中提供的状态设置主要就是渲染时是否开启深度测试、混合模式等。

如果有了解 OpenGL 渲染的，就应该对这些不陌生了，只是 OpenGL 通过 API 调用来设定，而 ShaderLab 通过在 Shader 中来指定了。

ShaderLab 中提供的渲染状态如下，直接摘抄自 《Unity Shader 入门精要》的附图了。

![[a488e6e1ba1262a518701dbe0a7f9bf7_MD5.png]]


### Tag 标签

SubShader 的标签是一个键值对，键和值都是字符串类型，这些键值对是 SubShader 和渲染引擎之间的沟通桥梁，它们用来告诉 Unity 的渲染引擎：SubShader 希望怎样以及何时渲染这个对象。

具体的标签类型如下，，直接摘抄自 《Unity Shader 入门精要》的附图了。

![[393e39a248c10ffef93dfa8abb303de2_MD5.png]]

### Pass 块

Pass 语义块的结构如下：

```cpp
Pass {
    [Name]
    [Tags]
    [RenderSetup]
    // render code
}
```

在 Pass 语义块进行渲染之前也有一些状态要设置，Name 就是该 Pass 的名字，渲染状态和 SubShader 中提到的渲染状态一致。

Pass 中的标签不同于 SubShader 中的标签，可用的如下：

![[47b2eb0171b46d7445dbafca80b51979_MD5.png]]


### Fallback 

最后的 Fallback 块就是当前面的渲染都不行才会走到这里了，相当于是兜底了。

另外，当 UnityShader 有问题的话，物体的颜色会出现粉红色的异常。

![[37250fe5578c47ac6eb5563234eb486e_MD5.png]]

## Shader 分类

UnityShader 共有三种类型的 Shader ，分别是表面着色器、顶点/片元着色器、固定函数着色器。

### 表面着色器 Surface Shader

表面着色器是 Unity 自己创造的一种着色器代码类型，需要的代码量很少，但渲染的代价很大。

Unity 在表面着色器背后做了很多工作，将它们转换成对应的顶点/片元着色器。

### 顶点/片元着色器 Vertex/Fragment Shader

顶点/片元着色器就是 OpenGL 中常用的着色器了，只不过这里统一在一个文件中描述，而且渲染流程和 OpenGL 的流程也大同小异，代码上会有些区别，原理都是一样的。

### 固定函数着色器

固定函数着色器用的就比较少了，也渐渐淘汰了，实际上它最后也被 Unity 转换成了顶点/片元着色器。

## 小结

以上就是关于 UnityShader 的基本概念，也算是 《UntiyShader入门精要》的读书笔记了。

看完一遍书，再来博客总结一遍内容，用输出促进输入，从而学的更牢固一点，接下来就要进入正式的 UnityShader 编写了。




