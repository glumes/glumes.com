---
title: "UE 4.27 添加自定义 ShadingModel"
date: 2022-12-27T22:24:27+08:00
slug: "ue4.27-add-custom-shading-model"
subtitle: ""
tags: ["UE4"]
categories: ["engine"]
comments: true
bigimg: [{src: "/img/banner.jpg", desc: ""}]
draft: false
original: true
image: ""
---

基于 UE 4.27 的版本添加自定义的 ShadingModel ，大致分为两步：

**1. 在 UE Editor 中添加自定义的 ShadingModel 入口。这样在创建材质时可以选择对应的 ShadingModel 。**

**2. 在 Shader 中对自定义的 ShadingModel 做渲染上的处理。比如自定义的 BxDF 函数，以及对光照的特殊处理等。**

<!--more-->

## Editor 中添加 ShadingModel 入口

### 定义 ShadingModel 宏

首先是找到 EngineTypes.h 文件，在这里添加自定义 ShadingModel 对应的宏。

![](/image/engine/372A3215-A025-48AC-A986-0D1D5A8E5F16.png)


同时要注意下面红框中的内容，提示 ShadingModel 数量要小于等于 16 个，这样一来留给我们拓展的数量就有限了。

通过全局搜索，可以找到 ShadingModel 对应的宏都在哪里被引用了，比如 MSM_ThinTranslucent 的搜索结果：

![](/image/engine/0952E851-44C2-45B1-995D-E3BDE116A41A.png)

照着这个引用方式进行处理就可以。

### 材质添加自定义数据

接下来为自定义的 ShadingModel 添加额外的自定义数据，会在创建材质时多出额外的连接节点。

找到 Material.cpp 文件 IsPropertyActive_Internal 的函数，添加如下代码：

![](/image/engine/5D079E05-5305-43FD-A44E-0E2CB05595B9.png)

在 MP_CustomData1 和 MP_CustomData0 中添加自定义 ShadingModel 的宏。

同时在 MaterialShared.cpp 文件的 GetAttributeOverrideForMaterial 函数中添加如下代码：

![](/image/engine/A3D954BF-DBE4-4842-BFDE-57D594AF9821.png)

这一步是为自定义的数据添加相关的描述，添加好了之后编译引擎会得到如下效果。

![](/image/engine/3E51D01A-C0FF-49C6-B9FC-353B06F399C3.png)

ShadingModel 中有了我们定义的宏，连接节点中有了我们自定义的数据。


### 定义材质中的宏

添加了自定义 ShadingModel 的宏之外，还需要添加一个材质的宏，可以在材质中进行对该 ShadingModel 进行判断处理。

找到 HLSLMaterialTranslator.cpp 文件中的 GetMaterialEnvironment 函数，添加如下代码：

![](/image/engine/AF16E344-8099-4556-A00E-4DA0A0ADF097.png)


## ShadingModel 渲染处理

### 添加 ShadingModelID

除了 Editor 中添加自定义 ShadingModel 的宏之外，还需要添加 ShadingModelID ，在后续的 Shader 中更多的是用这个宏来做判断，找到 ShadingCommmon.ush 文件，添加如下代码：

![](/image/engine/2F537631-7F12-4A38-B100-C45E31ED56D0.png)

### 定义 ShadingModel 的调试显示颜色

在 ShadingCommon.ush 文件中还可以定义 ShadingModel 调试时的显示颜色，在 GetShadingModelColor 函数中，添加如下代码：

![](/image/engine/74B1675E-A564-4DA1-AD33-CF8B509B9078.png)

默认的 DEFAULT_LIT 调试颜色是绿色，上面定义的是黄色，效果如下：

![](/image/engine/1C2A0F9B-9855-468E-8ACF-0E1A83429DD1.png)

### 自定义数据写入 GBuffer 

要是 ShadingModel 中添加了自定义数据节点，要把它添加到 GBuffer 上，需要开启对应的选项才行，在 BassPassCommon.ush 文件中，添加如下代码：

![](/image/engine/2BECA407-35B7-4F57-8F35-0D178857B586.png)

WRITES_CUSTOMDATA_TO_GBUFFER 宏定义中添加预先定义好的数据。

除此之外，在 DeferredShadingModel.ush 文件的 HasCustomGBufferData 函数中增加自定义的 ShadingModelID 。

![](/image/engine/4F25FBEB-8DA6-4F9B-9B7F-0712F73EBF8D.png)

HasCustomGBufferData 函数是在解码 GBuffer 数据时根据 ShadingModelID 判断该 GBuffer 上有没有自定义的数据内容。

接下来就是往 GBuffer 中写入自定义数据，在 ShadingModelsMaterial.ush 文件的 SetGBufferForShadingModel 函数中添加如下代码：

![](/image/engine/9A6756F7-5FE5-49BF-A896-BD45D3456F9C.png)

该代码会先判断材质中有没有定义相应的宏，其次是判断 ShadingModelID 对不对，所以这两个宏都是必须要定义的。

通过 GetMaterialCustomData0 函数去获取蓝图连接点上的数据并且通过 saturate 函数将返回值限定在 0~1 之间，如果小于 0 就返回 0 ，如果大于 1 就返回 1 。

SetGBufferForShadingModel 函数会在 BasePassPixelShader.usf 中进行调用，写入 GBuffer 数据为延迟渲染使用。

### 自定义渲染效果 BxDF

接下来是最重要也最灵活多变的自定义渲染效果了，核心在于定义 BxDF 函数。

![](UE 4.27 添加自定义 ShadingModel.resources/4854FADB-4E01-45E0-9B58-076F2922A471.png)

在 DeferredLightPixelShaders.usf 文件中的如下代码：

```cpp
FRectTexture RectTexture = InitRectTexture(DeferredLightUniforms.SourceTexture);
float SurfaceShadow = 1.0f;

const float4 Radiance = GetDynamicLighting(WorldPosition, CameraVector, HairScreenSpaceData.GBuffer, HairScreenSpaceData.AmbientOcclusion, HairScreenSpaceData.GBuffer.ShadingModelID, LightData, LightAttenuation, Dither, PixelCoord, RectTexture, SurfaceShadow);

const float  Attenuation = ComputeLightProfileMultiplier(WorldPosition, DeferredLightUniforms.Position, -DeferredLightUniforms.Direction, DeferredLightUniforms.Tangent);
```

GeyDynamicLighting 函数中的 GetDynamicLightingSplit 函数会调用 IntegrateBxDF 来计算各个 ShadingModelID 对应的 BxDF 函数。

这里作为对比，定义了一个简单的 BxDF 函数，将漫反射颜色设置为 0 。

```cpp
FDirectLighting CustomBxDF(FGBufferData GBuffer, half3 N, half3 V, half3 L, float Falloff, float NoL, FAreaLight AreaLight, FShadowTerms Shadow )
{
	BxDFContext Context;
	
	Init(Context, N, V, L);
	SphereMaxNoH(Context, AreaLight.SphereSinAlpha, true);
	
	Context.NoV = saturate(abs( Context.NoV ) + 1e-5);

	FDirectLighting Lighting;
	// Lighting.Diffuse  = AreaLight.FalloffColor * (Falloff * NoL) * Diffuse_Lambert( GBuffer.DiffuseColor );
	Lighting.Diffuse  = 0;
	
	Lighting.Specular = AreaLight.FalloffColor * (Falloff * NoL) * SpecularGGX(GBuffer.Roughness, GBuffer.SpecularColor, Context, NoL, AreaLight);
	Lighting.Transmission = 0;
	return Lighting;
}
```

在只有 DirectionalLight 光照情况下的效果如下：

![](/image/engine/4C38D0A2-2C60-4CAB-873A-5926B0979202.png)

可以看到高光效果还是有的，缺少了漫反射效果，整个物体都偏黑了。

作为对比，把高光颜色设置为 0 ，正常使用漫反射颜色效果如下：

![](/image/engine/A6047772-A300-445D-9588-251A8B8A7EBB.png)

可以看到有正常的颜色，但是没有了高光效果。

更多效果都可以在 BxDF 函数中去定义了，作为添加自定义 ShadingModel 的流程基本就完成了。