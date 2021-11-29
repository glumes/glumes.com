---
title: "Unity Shader 光照基础之Lambert光照模型"
date: 2021-09-02T10:45:46+08:00
subtitle: ""
tags: ["unity"]
categories: ["engine"]
comments: true
bigimg: [{src: "https://image.glumes.com/blog_image/610391b1gy1gmhbipn8w5j208x0sgtk7.jpg", desc: ""}]
draft: false
original: true
---


在标准光照模型中，可以把光照分为四种：

* **自发光**。常用英文 **emissive** 来表示，用于描述当给定一个方向时，一个物体表面会向该方向发射多少辐射量，也就是有多少光照出来，一般计算都忽略这个值了。
* **高光反射**，也叫作**镜面反射**。常用英文 **specular** 来表示，用于描述当光线从光源照射到模型表面时，该表面会在完全镜面发射反向散射多少辐射量，也是就发出多少光。
* **漫反射**。常用英文 **diffuse** 来表示，用于描述当光线从光源照射到模型表面，该表面会向每个方向散射多少辐射量，也就是发出多少光。
* **环境光**。常用英文 **ambient** 来表示，用户描述其他所有间接光照。

用一张图来表示各个光照：

![](https://image.glumes.com/blog_image/light-type.jpg)

而 Lambert 光照模型主要是处理物体漫反射的。

<!--more-->

## 漫反射模型

漫反射光照是用于对那些被物体表面随机散射到各个方向的光线进行建模的。

在漫反射中，**视角**的位置不重要，因为反射是完全随机的，因此可以认为在任何反射方向上的分布都是一样的，但是**入射光线**的角度很重要。所以在计算中不用考虑视角的方向，只用考虑光源方向就好了。


漫反射光照模型符合 Lambert 定律，认为**反射光线的强度与表面法线和光源方向之间夹角的余弦值成正比。**

如图所示，光线强度和图中的夹角成正比。

![](https://image.glumes.com/blog_image/diffuse_light.png)

除了光线强度这个概念之外，还有一个光的颜色，也就是物体反射出来的颜色，它由物体的漫反射颜色乘以光源的颜色得到。

最终可以得到漫反射颜色计算公式如下：

$c_{diffuse} = (c_{light} \cdot m_{diffuse}) \cdot  max (0,n \cdot I)$

漫反射的颜色等于材质的颜色乘以光线强度，避免光线强度为负数，用了 **max** 函数做比较。

接下来就在 Shader 中去实现漫反射光照了。

## 逐顶点光照

漫反射的光照既可以在顶点着色器中去实现也可以在片段着色器中去实现。

顶点着色器中的实现就叫做**逐顶点光照**，按照公式原理在顶点着色器中要拿到模型的法向量和顶点指向光源的方向向量，同时要对这两个向量做归一化，因为要计算两个向量的余弦，但是并不需要它们的长度，归一化之后就等于 1 了，只需要方向就好了。


取模型的法向量比较简单，只要把变量声明为 **NORMAL** 类型，unity 会自动把法向量填充过来的，如下所示：

```cpp
struct appdata
{
    float4 vertex : POSITION;
    float3 normal : NORMAL;
};
```

接下来要得到光源的相关信息，如果是 OpenGL 的话，那就得调用 setUniform 等函数来传递了，但在 unity 中声明好了 **LightMode** 后，就可以拿到对应类型的光照信息了，比如这里只用到了平行光，那么 **LightMode** 为 **ForwardBase** 就好了，后面会慢慢讲到关于 LightMode 的更多内容。


unity 通过 **_LightColor0** 内置变量来得到该 Pass 处理的光源的颜色和强度信息，而光源方向可以由 **_WorldSpaceLightPos0** 来得到，这里只考虑到仅有一个光源而且还是平行光的情况。

接下来要算模型法向量和光源方向之间的夹角了，但是法向量是在模型空间下的，光源方向是在世界空间下的，两个坐标空间不同的话，算出来的结果是没有意义的，需要统一将它们转换到世界空间坐标下。

unit 提供了 **unity_WorldToObject** 矩阵来实现这个转换，法向量乘以该矩阵就能转换到世界空间下，由于法向量是个 3 维向量，所以只需要取 **unity_WorldToObject** 前三行前三列就行。

所以得到世界空间坐标下的法向量如下，别忘了做归一化操作。

```cpp
fixed3 worldNormal = normalize(mul(v.normal, (float3x3)unity_WorldToObject));
```

而光源方向本来就是在世界空间坐标下的，只需要再归一化操作，就可以直接相乘。

```cpp
fixed3 worldLight = normalize(_WorldSpaceLightPos0.xyz);
```

值得一提的是 **_WorldSpaceLightPos0** 从字面意义上来看更像是世界空间光源的位置，这是因为所说的光源方向是从世界空间原点指向光源的方向，而不是从模型的顶点指向光源的方向（这个方向在后面镜面反射中会用到）。

世界空间原点坐标都是 0 ，所以光源位置坐标减去原点坐标就是指向光源方向的向量了，于是直接用坐标值就好了。

有了光源方向向量和模型法向量，并且统一了坐标系，可以直接算出漫反射颜色。

`
```cpp
fixed3 diffuse = _LightColor0.rgb * _Diffuse.rgb * saturate(dot(worldNormal,worldLight));
```

其中，**_LightColor0.rgb** 代表光源的颜色，也是通过 unity 的内置变量直接获取。**_Diffuse.rgb** 需要指定漫反射颜色，通过在 Properties 块中定义属性，方便在控制面板中修改。

**saturate** 函数替代了公式里面的 max 函数，它是 CG 里面提供的一种函数，需要包含对应的头文件才行，作用就是可以把参数截取到 **[0,1]** 范围内。

saturate 函数算出来的是夹角余弦值，还需要乘以光源颜色和漫反射颜色就可以得到最终的漫反射颜色值。

整体代码如下：


```cpp
Shader "Custom/LambertShader"
{
    Properties
    {
        _Diffuse ("Diffuse",Color) = (1,1,1,1)
    }
    SubShader
    {
 
        Pass
        {
            Tags{ "LightMode" = "ForwardBase"}
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            #include "Lighting.cginc"
            fixed4 _Diffuse;
            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };
            struct v2f
            {
                float4 pos : SV_POSITION;
                fixed3 color : COLOR;
            };
            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                
                fixed3 ambient = UNITY_LIGHTMODEL_AMBIENT.xyz;
                fixed3 worldNormal = normalize(mul(v.normal, (float3x3)unity_WorldToObject));
                fixed3 worldLight = normalize(_WorldSpaceLightPos0.xyz);
                fixed3 diffuse = _LightColor0.rgb * _Diffuse.rgb * saturate(dot(worldNormal,worldLight));
                o.color = ambient + diffuse;
                return o;
            }
            fixed4 frag (v2f i) : SV_Target
            {
                return fixed4(i.color,1.0);
            }
            ENDCG
        }
    }
}
```

除了漫反射，还用到了 **UNITY_LIGHTMODEL_AMBIENT.xyz** 变量获取整体的环境光，环境光不需要计算，直接和漫反射颜色值相加即可。

对于片段着色器，就不需要进行计算了，直接展示在顶点着色器中的计算结果就好。

最终的渲染结果如下：

![](https://image.glumes.com/blog_image/20210829141441.png)

由于顶点着色器在顶点和顶点之间的计算是通过插值的，存在精度的问题，逐顶点光照在阴暗交界处会有一些锯齿，如下图所示：

![](https://image.glumes.com/blog_image/20210829141738.png)

想要消除这些锯齿，可以通过逐像素光照来实现，也就是在片段着色器中去计算漫反射光照。

## 逐像素光照

在片段着色器中去实现漫反射光照，同样也需要法向量和指向光源的向量，还需要统一坐标空间。

但是可以在片段着色器中直接获取 unity 定义的光源相关的变量信息，而法向量就得通过顶点着色器传递过来了。

顶点着色器如下：

```cpp
v2f vert (appdata v)
{
    v2f o;
    o.pos = UnityObjectToClipPos(v.vertex);
    o.worldNormal = mul(v.normal,(float3x3)unity_WorldToObject);
}
```
在顶点着色器中完成好法向量的坐标空间转换，片段着色器直接使用就行。

```cpp
fixed4 frag (v2f i) : SV_Target
{
    fixed3 ambient = UNITY_LIGHTMODEL_AMBIENT.xyz;
    fixed3 worldNormal = normalize(i.worldNormal);
    fixed3 worldLightDir = normalize(_WorldSpaceLightPos0.xyz);
    fixed3 diffuse = _LightColor0.rgb * _Diffuse.rgb * saturate(dot(worldNormal,worldLightDir));
    fixed3 color = ambient + diffuse;
    return fixed4(color,1.0);
}
```
片段着色器中也是可以访问环境光等信息的，渲染效果如下：

![](https://image.glumes.com/blog_image/20210829143007.png)

作为对比，下面的逐顶点光照有锯齿，而上面的逐像素光照就没有锯齿了。

完整代码如下：

```cpp
Shader "Custom/LambertFragShader"
{
    Properties
    {
        _Diffuse ("Diffuse",Color) = (1,1,1,1)
    }
    SubShader
    {
 
        Pass
        {
            Tags{ "LightMode" = "ForwardBase"}
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            #include "Lighting.cginc"
            fixed4 _Diffuse;
            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
            };
            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 worldNormal : TEXCOORD0;
            };
            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.worldNormal = mul(v.normal,(float3x3)unity_WorldToObject);
                return o;
            }
            fixed4 frag (v2f i) : SV_Target
            {
                fixed3 ambient = UNITY_LIGHTMODEL_AMBIENT.xyz;
                fixed3 worldNormal = normalize(i.worldNormal);
                fixed3 worldLightDir = normalize(_WorldSpaceLightPos0.xyz);
                fixed3 diffuse = _LightColor0.rgb * _Diffuse.rgb * saturate(dot(worldNormal,worldLightDir));
                fixed3 color = ambient + diffuse;
                return fixed4(color,1.0);
            }
            ENDCG
        }
    }
}
```

## 小结

以上就是关于漫反射的逐顶点和逐像素光照的实现。原理和计算都比较简单，重点就在于法向量和指向光源方向的余弦值，对照着图的话就很容易理解了。


## 参考

1. 《Unity Shader 入门精要》
1. https://learnopengl-cn.readthedocs.io/zh/latest/02%20Lighting/02%20Basic%20Lighting/


