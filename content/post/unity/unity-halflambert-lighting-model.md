---
title: "Unity Shader 光照基础之 Half Lambert 光照模型"
date: 2021-09-02T10:45:56+08:00
subtitle: ""
tags: ["unity"]
categories: ["unity"]
comments: true
bigimg: [{src: "https://image.glumes.com/blog_image/610391b1gy1gmhbipn8w5j208x0sgtk7.jpg", desc: ""}]
draft: false
original: true
---

Half Lambert 模型（也叫作半兰伯特模型）在 Lambert 模型的基础之上做了一些优化。

在 Lambert 模型中，光照无法到达的区域，比如模型的背面，模型外观通常是全黑的，没有任何明暗变化，而 Half Lambert 模型就是改善这一状况。

![](https://image.glumes.com/blog_image/20210829145830.png)

回顾 Lambert 模型的计算公式如下：

$c_{diffuse} = (c_{light} \cdot m_{diffuse}) \cdot  max (0,n \cdot I)$

<!--more-->

当光源和法向量夹角的余弦值为负数的时候，所得到的结果始终都是 0 了，所以就会有图中看到的一片黑。

Half Labmert 模型的计算公式如下：

$c_{diffuse} = (c_{light} \cdot m_{diffuse}) \cdot ( a  (n \cdot I) + b)$

同样会计算余弦值，但是会把余弦值先缩放 a 倍，再偏移 b 大小，不再用 max 函数避免为负值。

绝大多数情况下，a 和 b 的值都是 0.5，所以也是为什么叫 half 了。

$c_{diffuse} = (c_{light} \cdot m_{diffuse}) \cdot ( 0.5  (n \cdot I) + 0.5)$

余弦值的取值范围是 [-1,1] ，经过缩放和偏移后就是 [0,1] 了，这样一来原本余弦值为负数导致直接取 0 的点，变成了取值结果在 [0,0.5] 了，从而就可以体现出明暗变化，不同的点积结果会映射到不同的值上。

对于 unity shader 的计算，也不会有太大的改变，主要如下：

```cpp
fixed3 worldNormal = normalize(mul(v.normal, (float3x3)unity_WorldToObject));
fixed3 worldLight = normalize(_WorldSpaceLightPos0.xyz);                
fixed halfLambert = dot(worldNormal,worldLight) * 0.5 + 0.5;
```

原本用 **saturate** 函数对点积结果做取值范围约束，现在直接通过映射来保证范围了。

具体的 shader 代码如下，以逐顶点着色为例：

```cpp
Shader "Custom/HalfLambertShader"
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
                
                fixed halfLambert = dot(worldNormal,worldLight) * 0.5 + 0.5;
                fixed3 diffuse = _LightColor0.rgb * _Diffuse.rgb * halfLambert;
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

渲染效果如下：

![](https://image.glumes.com/blog_image/20210829151329.png)

可以看到 Half Lambert 模型在背面有了明显的亮暗变化。

![](https://image.glumes.com/blog_image/20210829151456.png)

同时 Half Lambert 模型在正面也会更加明亮一点。

## 小结

Half Lambert 模型在 Lambert 基础之上做了优化，而这正是应了图像渲染里面的那就话：**如果看起来是对的，那么它就是对的**。