---
title: "Unity Shader 显示一张图片纹理"
date: 2021-08-23T13:04:19+08:00
subtitle: ""
tags: ["unity"]
categories: ["graphics-renderer"]
slug: "unity-basic-texture"
comments: true
bigimg: [{src: "https://image.glumes.com/blog_image/610391b1gy1gmhbipn8w5j208x0sgtk7.jpg", desc: ""}]
draft: false
original: true
---

用 Unity 去显示一张图片纹理比用 OpenGL 代码去显示图片要简单多了，而这正是因为 Unity 在背后做了很多封装工作。

要显示的图片如下所示：

![](https://image.glumes.com//blog_image/v2-a560282d5e3515d6dc819c0173f9620b_720w.jpg)

它的分辨率是 2560x1600 ，也就是矩形图片，并非正方形。

<!--more-->

## UnityShader 编写

前面已经学习了 UnityShader 的整体结构，在 **Properties**  块中定义属性，可以在参数面板中调节对应的值；在 **SubShader**  的 **Pass** 块中编写具体的渲染代码。

实现图片纹理要写一个**顶点/片元着色器**，不同于 OpenGL 需要两个 Shader 文件，Unity 一个 Shader 文件就可以了。

通过如下宏定义来标识后续的顶点和片元着色器对应哪个函数：

```cpp
#pragma vertex vert
#pragma fragment frag
```

### 顶点着色器

按照写 OpenGL Shader 的经验，在顶点着色器中需要处理外界传过来的顶点坐标和纹理坐标。

而在 Unity 中这些东西都假设给你传好了，只要自己去接收就行。

比如需要顶点坐标，那么就定义在 **POSITION** 中；需要纹理坐标，就定义在 **TEXCOORD0**  中；需要法向量，就定义在 **NORMAL** 中 。

显示图片纹理，当然需要顶点坐标和纹理坐标，那么代码如下：

```cpp
float4 vertex : POSITION;
float2 uv : TEXCOORD0;
```

定义了 vertex 和 uv 两个变量，类型分别是 float4 和 float2 ，代表不同个数的浮点数，后面就指定了这个变量要接收 Unity 传过来的数据含义。

在顶点着色器中就需要上面的数据作为函数参数，Unity 中可以定义一个结构体来包装上面的数据统一作为顶点着色器的参数。

```cpp
struct appdata
{
    float4 vertex : POSITION;
    float2 uv : TEXCOORD0;
};
```

说完了顶点着色器的参数，接下来就是顶点着色器函数的返回值，除了需要把经过 MVP 坐标转换后的顶点坐标返回出去，还需要把纹理采样坐标返回出去，在 OpenGL Shader 中可以通过 **varying** 关键字来实现。


在 Unity 中通过 **SV_POSITION** 关键字来定义着色器之间传递的顶点坐标。而着色器之间传递纹理坐标并没有直接的定义了，可以用符合自己要求的数据结构来表示。

具体代码如下：

```cpp
float4 vertex : SV_POSITION;
// 传递纹理坐标可以用 COLOR 也可以用 TEXCOORD0 
float2 uv : COLOR;
// float2 uv : TEXCOORD0;
```

传递纹理坐标，用 COLOR 和 TEXCOORD0 都是一样的，不过都是用到前面两位的数据。

同样，也可以用结构体将上面的数据包装起来：

```cpp
struct v2f 
{
float4 vertex : SV_POSITION;
float2 uv : COLOR;
};
```

这样，就可以定义顶点着色器的函数了，大致框架如下：

```cpp
v2f vert(appdata v)
{
    // 函数执行内容
}
```

函数输入参数和输出内容都是上面提到过的数据，至于具体的执行内容就和 OpenGL Shader 差不多了，要将顶点坐标经过一系列的转换，另外也要将纹理坐标经过一些转换，不同的是 Unity 中有一些辅助函数帮忙做这些操作。

```cpp
v2f vert (appdata v)
{
    v2f o;
    o.vertex = mul(UNITY_MATRIX_MVP, v.vertex);
    o.uv = v.uv * _MainTex_ST.xy + _MainTex_ST.zw;
    
    // 使用 unity 内置更便捷的函数
    // o.vertex = UnityObjectToClipPos(v.vertex);
    // o.uv = TRANSFORM_TEX(v.uv, _MainTex);
    return o;
}
```

unity 中通过 **UNITY_MATRIX_MVP** 变量指定了坐标转换的 MVP 矩阵，通过 **mul** 函数进行相乘。

另外，纹理坐标也经过了一些操作，实际上也可以不操作，直接传递 **uv** 值就行，多了的这些操作是方便对纹理进行调节，这会在后面内容提到。

除了自己计算之外，还可以直接用 unity 中现成的函数，简单方便。

**UnityObjectToClipPos** 函数实现将坐标转换到裁剪空间，**TRANSFORM_TEX** 函数实现纹理的偏移操作，这些函数都是在 **UnityCG.cginc** 中定义的，所以在 **Pass** 中要它们 **inlucde** 进来。


另外，要在 Shader 中使用纹理，还得在 **Properties** 块中定义一个纹理属性，这样参数面板中就可以选择不同的图片作为纹理。而 **Pass** 中使用 **Properties** 定义的纹理还需要再定义一遍才行，如下代码所示：

```cpp
Properties 
{    
    _MainTex ("Texture", 2D) = "white" {}
SubShader{
    Pass{
        sampler2D _MainTex;
        float4 _MainTex_ST;
    }
}
}
```

### 片段着色器

完成了顶点着色器之后，就是片段着色器了，它要输出一个最终的颜色，而 unity 中通过 **SV_Target** 来标识输出颜色，如下所示：

```cpp
fixed4 frag (v2f i) : SV_Target
{
    //  执行代码
}
```

片段着色器的输出就是一个 fixed4 类型的颜色值，而输入就是顶点着色器的输出，具体的指定内容就很简单了，和 OpenGL Shader 一样，采样坐标点的颜色值即可。

```cpp
fixed4 frag (v2f i) : SV_Target
{
    fixed4 col = tex2D(_MainTex,  i.uv);
    return col;
}
```

### 完整代码

通过如上的学习就可以显示图片纹理了，完整代码如下：

```cpp
Shader "Custom/Shader-1"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
    }
    SubShader
    {
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };
            struct v2f
            {
                float2 uv : COLOR;
                float4 vertex : SV_POSITION;
            };
            sampler2D _MainTex;
            float4 _MainTex_ST;
            v2f vert (appdata v)
            {
                v2f o;
   
                o.vertex = mul(UNITY_MATRIX_MVP,v.vertex);
                o.uv = v.uv * _MainTex_ST.xy + _MainTex_ST.zw;
                // o.vertex = UnityObjectToClipPos(v.vertex);
                // o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                
                return o;
            }
            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, 1.0 -  i.uv);
                return col;
            }
            ENDCG
        }
    }
}
```

显示效果如下：

![](https://image.glumes.com//blog_image/20210822162951.png)


### 纹理设置

另外，参数面板上还有两个参数可以让我们调节纹理显示效果的，分别是  **Tiling** 和 **Offset** 。


![](https://image.glumes.com//blog_image/20210822171441.png)

这两个参数和纹理的设置有关，选中纹理图片，可以看到纹理的平铺模式。

![](https://image.glumes.com/blog_image/20210822172716.png)

平铺模式决定纹理坐标超过 [0,1] 之后是重复还是使用边界值。

而 Tiling 值就是调节纹理的选取范围的，正常是 [0,1] 选取整个图片，也可以 [0.5,0.5] 选取四分之一图片。

而 Offset 就是决定纹理坐标原点的偏移量的，正常是从 [0,0] 开始，也可以从 [0.5,0.5] 中心点开始。

事实上 Tiling 和 Offset 共同决定了纹理的选择范围。要使这两个参数生效，就得在代码中乘以这两个参数，在上面的代码中也有 提到。

```cpp
o.uv = v.uv * _MainTex_ST.xy + _MainTex_ST.zw;
// 或者下面这种
// o.uv = TRANSFORM_TEX(v.uv, _MainTex);
```

## 小结

以上就是 Unity Shader 显示一张图片纹理的操作，和 OpenGL  理论上都一样的，但流程更简单了，可以更快捷的看到 Shader 效果。

流程介绍的比较详细，后面熟悉这个流程，就可以更快速的学习实践了。