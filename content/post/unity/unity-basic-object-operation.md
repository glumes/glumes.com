---
title: "Unity 物体的基本操作"
date: 2021-08-14T21:53:16+08:00
subtitle: ""
tags: ["unity"]
categories: ["unity"]
comments: true
bigimg: [{src: "https://image.glumes.com/blog_image/610391b1gy1gmhbipn8w5j208x0sgtk7.jpg", desc: ""}]
draft: false
original: true
---

Unity 的基本操作主要是对游戏对象的操作，包括观察视角、平移、缩放、旋转这些。

更具体一点就是控制面板上这几个按键如何操作：

![](https://image.glumes.com//blog_image/unity_basic_operation.png)

<!--more-->

它们从左到右分别对应 Q、W、E、R、T、Y 这六个快捷键，通过快捷键可以切换当前处于的状态，不同状态进行不同的操作。

## 视觉位置移动

当切换到 Q 快捷键，也就是对应手掌图案时，可以调整当前的观察视角。

按住鼠标左键，上下、左右拖动可以 **平移** 对应的视角，通过鼠标中间滚轮，可以拉近或者远离物体。

按住 Alt 键和鼠标左键再移动鼠标，可以左右旋转、上下旋转观察视角，这时候可以把视角移动到物体背面或侧面，而仅靠按住鼠标左键移动是做不到的。

当然也有更简单的方式，直接通过右上角的坐标轴来调整观察视角。

![](https://image.glumes.com//blog_image/unity-axis-change-view.png)

如图所示，现在所处的是 X 方向，屏幕上下的 Y 轴方向，屏幕左右是 Z 轴方向。

由于 Unity 使用的是左手坐标系，中指指向 Z 轴正方向，食指指向 Y 轴正方向，大拇指指向 X 轴正方向，那么从屏幕指向我们的方向就是 X 轴正方向了。

可以通过点击坐标轴来切换观察视角，切换到 Z 轴就可以观察侧面了。

另外，当处于小手掌状态时，是不可以点击选择物体的。


## 移动物体

当切换到 W 快捷键，也就是对应箭头图案时，可以调整物体的位置。


![](https://image.glumes.com//blog_image/unity-axis-move-object.png)

可以点击坐标轴往指定方向拖动，也可以点击坐标轴之间的矩形面进行移动。

当然也可以更改 Transform 组件的 position 属性值进行修改。



当处于移动物体的状态时，就不可以通过鼠标左键来调整观察视角了。


## 旋转和缩放物体

当切换到 E 快捷键，就可以旋转物体了。

![](https://image.glumes.com//blog_image/unity-axis-rotate-object.png)

物体周围的圈代表不同的旋转方向。

当切换到 R 快捷键，就可以缩放物体了。

![](https://image.glumes.com//blog_image/unity-axis-scale-object.png)

不同的坐标轴代表不同的缩放方向。

## Rect Tool 模式

当切换到 T 快捷键，也就是 Rect Tool 模式了，可以选择多个物体并且根据矩形框来调整他们之间的位置，而蓝圈点就是调整的锚点，有 Center 和 Pivot 两种锚点模式，不过这个目前用的不多，后面用熟了再详细阐述。

![](https://image.glumes.com//blog_image/unity-axis-rect-tool-object.png)

## 小结

当切换到 Y 快捷键，就是将上面的移动、旋转、缩放都综合到一起了，可以选择对应的箭头来完成操作。

![](https://image.glumes.com//blog_image/unity-axis-full-operation.png)


以上就是关于 Unity 的基本操作，比较基础和简单，主要还是要多操作，熟能生巧，就在写这篇博客的时候就已经熟练好几遍了。

