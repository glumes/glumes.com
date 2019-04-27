---
title: "进击的 Vulkan 移动开发之 SwapChain"
date: 2019-04-07T15:39:14+08:00
subtitle: ""
tags: ["Vulkan"]
categories: ["Vulkan"]
comments: true
bigimg: [{src: "https://image.glumes.com/images/2019/04/27/bc32fd77gy1g1u4eowfwbj21hc0zk79f.jpg", desc: ""}]
draft: false
original: true
addwechat: true
---

> Vulkan 开发的系列文章：

> 1. [进击的 Vulkan 移动开发（一）之今生前世](https://glumes.com/post/vulkan/vulkan-tutorial-concept/)

> 2. [进击的 Vulkan 移动开发（二）之谈谈对渲染流程的理解](https://glumes.com/post/vulkan/vulkan-tutorial-renderer/)

> 3. [进击的 Vulkan 移动开发之 Instance & Device & Queue](https://glumes.com/post/vulkan/vulkan-tutorial-instance-device-queue/)

> 4. [进击的 Vulkan 移动开发之 Command-Buffer](https://glumes.com/post/vulkan/vulkan-tutorial-command-buffer/)


在之前的文章中，讲到了 `Command-Buffer` 提交给 `Queue` 去执行，也提到了 Vulkan 实现跨平台机制，是有一些拓展的，这里就讲讲 Vulkan 窗口系统的拓展（Vulkan Window System Integration WSI），如下图所示：

![](https://image.glumes.com/images/2019/04/27/bc32fd77gy1fyuhrs5xlwj21j00uywl8.jpg)

<!--more-->

回顾一下在 Android 中我们是需要 `EGL` 机制为 OpenGL ES 建立渲染环境，好让 OpenGL ES 渲染后的结果可以呈现在 Surface 上，而 iOS 上肯定是没有 `EGL` 机制的，当然它肯定也有其他方法呈现 OpenGL ES 渲染结果。

为了实现这一机制的统一，做到跨平台，Vulkan 就把这部分抽出来做成了一个拓展的形式，实现了接口调用上的统一，那么接下来就一起了解一下 Vulkan 的 SwapChain 交换链机制。


## 开启 SwapChain 的拓展

还记得在  [进击的 Vulkan 移动开发之 Instance & Device & Queue](https://glumes.com/post/vulkan/vulkan-tutorial-instance-device-queue/) 文章中创建 `Instance`、`Device` 组件时的 `VkXXXXCreateInfo` 结构体中都有表示拓展的一些字段，之前就没有用到就直接忽略了，现在就得开启这个拓展来启用 `SwapChain` ，需要分别为 `Instance` 和 `Device` 指定拓展。

```cpp
    // 定义两个容器来 指定对应的 拓展
    // instance 的 extension 拓展
    std::vector<const char *> instance_extension_names;
    // device 的 extension 拓展
    std::vector<const char *> device_extension_names;
    
    // 初始化 Instance 和 Device 的拓展
    void vulkan_init_instance_extension_name(struct vulkan_tutorial_info &info) {
        info.instance_extension_names.push_back(VK_KHR_SURFACE_EXTENSION_NAME);
        info.instance_extension_names.push_back(VK_KHR_ANDROID_SURFACE_EXTENSION_NAME);
    }

    void vulkan_init_device_extension_name(struct vulkan_tutorial_info &info) {
        info.device_extension_names.push_back(VK_KHR_SWAPCHAIN_EXTENSION_NAME);
    }
```

要注意，这里的拓展，其实是对应的宏所代表的字符串数组指针，并不是要搞什么特殊的标志位之类的，而且这些字符串宏在都在 `vulkan.h` 和 `vulkan_android.h` 头文件中都包含了。

如果是在 Android 平台上，那么就照着上面的写就好了，并不需要修改什么了，都是固定的。

另外，在创建 `Instance` 组件的时候就可以启用这些拓展了：

```cpp
    VkInstanceCreateInfo instance_info = {};

    // Extension and Layer
    instance_info.enabledExtensionCount = info.instance_extension_names.size();
    instance_info.ppEnabledExtensionNames = info.instance_extension_names.data();
    // 这里没有用到 Layer 就还是设为 null 就好了
    instance_info.ppEnabledLayerNames = nullptr;
    instance_info.enabledLayerCount = 0;
```

接下来在 `VkInstanceCreateInfo` 结构中去声明要启用拓展。

```cpp
    VkInstanceCreateInfo instance_info = {};

    instance_info.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    instance_info.pNext = nullptr;
    instance_info.pApplicationInfo = &app_info;
    instance_info.flags = 0;
    // 在这里启用拓展相关设定
    instance_info.enabledExtensionCount = info.instance_extension_names.size();
    instance_info.ppEnabledExtensionNames = info.instance_extension_names.data();
    // 这里没有用到 Layer 就还是设为 null 就好了
    instance_info.ppEnabledLayerNames = nullptr;
    instance_info.enabledLayerCount = 0;
```

## 创建 SwapChain 的步骤

创建 SwapChain 有的基本步骤如下：

1.  创建 VkSurfaceKHR 组件，解决平台之间的差异。在 Android 上就是根据 Native 中的 `ANativeWindow` 去创建。
2.  从某个物理设备 (也就是 GPU，因为可能存在多个物理设备) 所有的 `Queue` 中找到那个即支持图形（graphics）又支持显示（present）的 `Queue` 的索引（index）。
3.  如果没有 `Queue` 同时支持两者，那么就找到两个各自支持的，分别是：
    1. present queue（用于展示的 Queue）
    2. graphics queue（用于图形的 Queue）
    3. 有了这两个索引之后，要得到索引所对应的 Queue 。
4.  如果连各自支持的都没有，那 SwapChain 也建立不了了，干脆就退出吧。
5.  从某个物理设备 (也就是 GPU，因为可能存在多个物理设备) 找到所有支持 VKSurfaceKHR 的色彩空间格式（VKFormat），并选取第一个。
6.  根据 VKSurfaceKHR 的能力和呈现模式，以及相关参数设定去创建 SwapChain 。
    1.  Surface 能力对应 SurfaceCapabilitiesKHR
    2.  Surface 呈现模式对应于 SurfacePresenttModesKHR
    3.  Surface 旋转的设定，对应于 SurfaceTransformFlagBitsKHR
    4.  Surface 透明度合成的设定，对应于 CompositeAlphaFlagBitsKHT
    5.  Surface 相关的参数设定有很多，但是对于有些不常用的设定基本可以选择固定值了
    6.  相关参数的设定都明确之后，就创建 SwapChain 
7.  创建 SwapChain 之后，获取 SwapChain 支持的 Image 对象列表以及个数，并创建相应数量的 ImageView 数量。

现在，对每一个步骤来添加它的代码实现。

### 创建 VkSurfaceKHR

在开始之前，要根据 Android 上的 Surface 来创建 Vulkan 中的 `VkSurfaceKHR` 。

> 在 Vulkan 中，后缀是 KHR 的大多是拓展功能里面的。


Android 的 Surface 在 Native 中对应的是 `ANativeWindow`，根据它创建 `VkSurfaceKHR` 。

```cpp
    // 宏定义的函数
    GET_INSTANCE_PROC_ADDR(info.instance, CreateAndroidSurfaceKHR);
    VkAndroidSurfaceCreateInfoKHR createInfo{};
    createInfo.sType = VK_STRUCTURE_TYPE_ANDROID_SURFACE_CREATE_INFO_KHR;
    createInfo.pNext = nullptr;
    createInfo.flags = 0;
    // window 参数就是 ANativeWindow
    createInfo.window = window;
    // fpCreateAndroidSurfaceKHR 其实是一个函数指针
    VkResult res = info.fpCreateAndroidSurfaceKHR(info.instance, &createInfo, nullptr, &info.surface);
```

通过 `VkSurfaceKHR` 相当于就屏蔽了不同平台上的实现，统一了调用对象。

要注意一个调用方式：在 `fpCreateAndroidSurfaceKHR` 函数执行之前，要运行 `GET_INSTANCE_PROC_ADDR` 宏函数，它的定义如下：

```cpp
#define GET_INSTANCE_PROC_ADDR(inst, entrypoint)                               \
    {                                                                          \
        info.fp##entrypoint =                                                  \
            (PFN_vk##entrypoint)vkGetInstanceProcAddr(inst, "vk" #entrypoint); \
        if (info.fp##entrypoint == nullptr) {                                  \
            LOGE("entry point is null");                                       \
        }                                                                      \
    }
```

这段宏函数的作用就是将 `fpCreateAndroidSurfaceKHR` 的函数指针指向具体的地址，不然就会报 null pointer exception 。

### present queue 和 graphics queue 的索引

接下来就是从所有的 `Queue` 中找到 `present queue` 和 `graphics queue` 的索引。

```cpp
    // 先将所有的 index 都初始化到一个最大值，好用于后续的判断过程
    info.graphics_queue_family_index = UINT32_MAX;
    info.present_queue_family_index = UINT32_MAX;
```

这里是要找到两个索引，那么就先初始化到最大值，好用于后续的比较过程。

接下来从所有的 `Queue` 找到支持 `呈现（present）` 的 。

```cpp
    // 分配个数为 queue size 大小的数组，数组元素是 VkBool32 类型
    VkBool32 *supportPresent = static_cast<VkBool32 *>(malloc(info.queue_family_size * sizeof(VkBool32)));
    // queue_family_size 为所有 queue 的个数
    for (uint32_t i = 0; i < info.queue_family_size; i++) {
        // physical device 的 queue 是否支持 surface
        vkGetPhysicalDeviceSurfaceSupportKHR(info.gpu_physical_devices[0], i, info.surface, &supportPresent[i]);
    }
```

通过 `vkGetPhysicalDeviceSurfaceSupportKHR` 函数判断该物理设备的某个 `Queue` 是否支持上面创建的 `VkSurfaceKHR` ，也就是该 Queue 是否支持 `呈现（present）`，并把结果记录到 `supportPresent` 数组中。

至于判断该 Queue 是否支持 `图像（Graphics）`，在前面的文章中已经提过了，只要判断 `queueFlags` 与 `VK_QUEUE_GRAPHICS_BIT` 相与 `&` 的结果就好了。

```cpp
    for (uint32_t i = 0; i < info.queue_family_size; ++i) {
        // queue 是否图像，通过 queueFlags 来判断
        if ((info.queue_family_props[i].queueFlags & VK_QUEUE_GRAPHICS_BIT) != 0) {
            if (info.graphics_queue_family_index == UINT32_MAX) {
                info.graphics_queue_family_index = i;
            }

            // 找到了即支持 graphics 也支持 present 的 queue index
            if (supportPresent[i] == VK_TRUE) {
                info.graphics_queue_family_index = i;
                info.present_queue_family_index = i;
                break;
            }
        }
    }
```

在查找 `Queue` 是否支持 `图像（Graphics）` 的同时，也顺便判断一下该 `Queue` 是否支持 `呈现（present）` ，如果两者都满足，那是最好了。

```cpp
   // 没有找到一个 queue 两者都支持，那么找到一个支持 present 的 queue  index
    if (info.present_queue_family_index == UINT32_MAX) {
        for (size_t i = 0; i < info.queue_family_size; ++i) {
            if (supportPresent[i] == VK_TRUE) {
                info.present_queue_family_index = i;
                break;
            }
        }
    }
    // 释放创建的数组，及时释放，后续用不到了
    free(supportPresent);
```

如果 `present_queue_family_index` 仍为初始值，那说明没有 `Queue` 同时满足两者，两个 index 只能各取不同的值了。

```cpp
    // 如果都没找到，就报错了
    if (info.graphics_queue_family_index == UINT32_MAX || info.present_queue_family_index == UINT32_MAX) {
        LOGE("could not find a queue for graphics and present");
    }
```

如果都为初始值，那么就可以报错了。

另外要注意的是，之前创建 Device 需要支持 `图像（Graphics）` 的队列索引，而现在可以把创建 Device 和 Queue 的工作放到完成 `Present` 和 `Graphics` 索引检索之后了。

### 查找 VkFormat 格式

接下来要查询物理设备所支持的 `SurfaceFormat` 格式，也就是用来绘制的 Surface 支持哪些 `色彩空间格式(ColorSpace)` ，查询的操作调用还是 Vulkan 的固定套路：

```cpp
    // 先获得数量
    uint32_t formatCount;
    res = vkGetPhysicalDeviceSurfaceFormatsKHR(info.gpu_physical_devices[0], info.surface, &formatCount, nullptr);
    // 再获得具体内容 VkSurfaceFormatKHR
    VkSurfaceFormatKHR *surfaceFormats = static_cast<VkSurfaceFormatKHR *>(malloc(
            formatCount * sizeof(VkSurfaceFormatKHR)));
    // 获得物理设备的 SurfaceFormat
    res = vkGetPhysicalDeviceSurfaceFormatsKHR(info.gpu_physical_devices[0], info.surface, &formatCount,
                                               surfaceFormats);    
```

 `SurfaceFormat` 结构体包含了如下的信息：
 
```cpp
    typedef struct VkSurfaceFormatKHR {
        VkFormat           format;
        VkColorSpaceKHR    colorSpace;
    } VkSurfaceFormatKHR;
```
主要就是 `VkFormat` 和 `VkColorSpaceKHR` 两个属性。

接下来是对获取的格式做处理，主要是得到 `VkFormat` 格式信息：

```cpp
    if (formatCount == 1 && surfFormats[0].format == VK_FORMAT_UNDEFINED) {
        info.format = VK_FORMAT_B8G8R8A8_UNORM;
    } else {
        assert(formatCount >= 1);
        info.format = surfFormats[0].format;
    }
    free(surfFormats);
```

如果支持的格式数量只有一个，并且它还是 `VK_FORMAT_UNDEFINED` ，说明 Surface 并没有一个首选的格式，此时可以使用任何一个有效的格式。

如果数量大于一个，那使用第一个就好了。


### VkSurfaceCapabilitiesKHR 和 VkPresentModeKHR 以及相关参数的设定

除了 Surface 的 `VkFormat` 格式 ，还需要查询它的`能力(Capabilities)` ，得到 `VkSurfaceCapabilitiesKHR` 对象。

```cpp
    VkSurfaceCapabilitiesKHR surfaceCapabilitiesKHR;
    res = vkGetPhysicalDeviceSurfaceCapabilitiesKHR(info.gpu_physical_devices[0], info.surface,&surfaceCapabilitiesKHR);    
```

`VkSurfaceCapabilitiesKHR` 对象包含了很多属性，如下：

```cpp
typedef struct VkSurfaceCapabilitiesKHR {
    // 交换链 SwapChain 能够创建的最小的 Image 数量，最少是 1
    uint32_t                         minImageCount;
    // 交换链 SwapChain 能够创建的最大的 Image 数量
    uint32_t                         maxImageCount;
    // Surface 当前的宽和高，如果宽高都是是 0xFFFFFFFF，表明宽高由交换链拓展的目标 Surface 来决定
    VkExtent2D                       currentExtent;
    // 最小的
    VkExtent2D                       minImageExtent;
    VkExtent2D                       maxImageExtent;
    uint32_t                         maxImageArrayLayers;
    // 支持的旋转模式
    VkSurfaceTransformFlagsKHR       supportedTransforms;
    // 当前的旋转模式
    VkSurfaceTransformFlagBitsKHR    currentTransform;
    // Surface 透明度的设定
    VkCompositeAlphaFlagsKHR         supportedCompositeAlpha;
    VkImageUsageFlags                supportedUsageFlags;
} VkSurfaceCapabilitiesKHR;
```

当我们创建 SwapChain 的时候，需要设定很多的参数，比如 Surface 旋转和透明度等，而这些参数就要考虑到 `VkSurfaceCapabilitiesKHR` 是不是支持了，这也是为什么要查询 SurfaceCapabilities 的原因。

#### 关于 Surface 透明度合成的设定

关于 Surface 透明度合成的模式，在 Vulkan 中定义了如下几种模式：

```cpp
typedef enum VkCompositeAlphaFlagBitsKHR {
    VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR = 0x00000001,
    VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR = 0x00000002,
    VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR = 0x00000004,
    VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR = 0x00000008,
    VK_COMPOSITE_ALPHA_FLAG_BITS_MAX_ENUM_KHR = 0x7FFFFFFF
} VkCompositeAlphaFlagBitsKHR;
```

我们要根据 `VkSurfaceCapabilitiesKHR` 的支持能力去选择最合适的。

```cpp
    // 预定义 VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR 模式
    VkCompositeAlphaFlagBitsKHR compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
    // 在以下四种模式去选择 VkSurfaceCapabilitiesKHR 所支持的
    VkCompositeAlphaFlagBitsKHR compositeAlphaFlags[4] = {
            VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR,
            VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR,
            VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR,
            VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR,
    };
    // 通过相与 & 的操作去判断，找到合适的就退出
    for (uint32_t i = 0; i < sizeof(compositeAlphaFlags); i++) {
        if (surfaceCapabilitiesKHR.supportedCompositeAlpha & compositeAlphaFlags[i]) {
            compositeAlpha = compositeAlphaFlags[i];
            break;
        }
    }
```

#### 关于 Surface 旋转的设定

关于 Surface 的旋转模式，在 Vulkan 中也定义了如下几种模式：

```cpp
typedef enum VkSurfaceTransformFlagBitsKHR {
    // 不旋转
    VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR = 0x00000001,
    // 旋转 90°
    VK_SURFACE_TRANSFORM_ROTATE_90_BIT_KHR = 0x00000002,
    // 旋转 180°
    VK_SURFACE_TRANSFORM_ROTATE_180_BIT_KHR = 0x00000004,
    // 旋转 270°
    VK_SURFACE_TRANSFORM_ROTATE_270_BIT_KHR = 0x00000008,
    // 水平镜像
    VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_BIT_KHR = 0x00000010,
    VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_ROTATE_90_BIT_KHR = 0x00000020,
    VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_ROTATE_180_BIT_KHR = 0x00000040,
    VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_ROTATE_270_BIT_KHR = 0x00000080,
    VK_SURFACE_TRANSFORM_INHERIT_BIT_KHR = 0x00000100,
    VK_SURFACE_TRANSFORM_FLAG_BITS_MAX_ENUM_KHR = 0x7FFFFFFF
} VkSurfaceTransformFlagBitsKHR;
```

同样也要根据 `VkSurfaceCapabilitiesKHR` 的支持能力去选择最合适的。

```cpp
    // 如果 Surface 支持不旋转，那么就不旋转，否则使用当前的旋转模式
    VkSurfaceTransformFlagBitsKHR preTransform;
    if (surfaceCapabilitiesKHR.supportedTransforms & VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR) {
        preTransform = VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR;
    } else {
        preTransform = surfaceCapabilitiesKHR.currentTransform;
    }
```


接下来是获得 `Surface` 的呈现模式 `VkPresentModeKHR`。

```cpp
    // 呈现模式个数
    uint32_t presentModeCount;
    // 先获取数量
    res = vkGetPhysicalDeviceSurfacePresentModesKHR(info.gpus[0], info.surface, &presentModeCount, NULL);
    assert(res == VK_SUCCESS);
    // 再获取具体值
    VkPresentModeKHR *presentModes = (VkPresentModeKHR *)malloc(presentModeCount * sizeof(VkPresentModeKHR));
    res = vkGetPhysicalDeviceSurfacePresentModesKHR(info.gpus[0], info.surface, &presentModeCount, presentModes);
    assert(res == VK_SUCCESS);
```

#### 关于 Surface 呈现模式的设定

关于 Surface 的呈现模式，在 Vulkan 中定义了很多种：

```cpp
typedef enum VkPresentModeKHR {
    VK_PRESENT_MODE_IMMEDIATE_KHR = 0,
    VK_PRESENT_MODE_MAILBOX_KHR = 1,
    VK_PRESENT_MODE_FIFO_KHR = 2,
    VK_PRESENT_MODE_FIFO_RELAXED_KHR = 3,
    VK_PRESENT_MODE_SHARED_DEMAND_REFRESH_KHR = 1000111000,
    VK_PRESENT_MODE_SHARED_CONTINUOUS_REFRESH_KHR = 1000111001,
    VK_PRESENT_MODE_BEGIN_RANGE_KHR = VK_PRESENT_MODE_IMMEDIATE_KHR,
    VK_PRESENT_MODE_END_RANGE_KHR = VK_PRESENT_MODE_FIFO_RELAXED_KHR,
    VK_PRESENT_MODE_RANGE_SIZE_KHR = (VK_PRESENT_MODE_FIFO_RELAXED_KHR - VK_PRESENT_MODE_IMMEDIATE_KHR + 1),
    VK_PRESENT_MODE_MAX_ENUM_KHR = 0x7FFFFFFF
} VkPresentModeKHR;
```

一般来说，我们就只要使用 `VK_PRESENT_MODE_FIFO_KHR` 模式就行了。

```cpp
    VkPresentModeKHR swapchainPresentMode = VK_PRESENT_MODE_FIFO_KHR;
```

当然，也可以通过 `vkGetPhysicalDeviceSurfacePresentModesKHR` 函数得到所有的呈现模式，通过判断看自己想要的模式是否支持。

除了上面，还有其他很多参数设定，就不一一的阐述了，在创建 SwapChain 的时候都会遇到的。

### SwapChain 创建

完成了相关的准备工作之后，就可以调用 `vkCreateSwapchainKHR` 来创建 SwapChain 了。在此之前，还需要创建 `VkSwapchainCreateInfoKHR` 对象来包含所需要的参数。

`VkSwapchainCreateInfoKHR` 定义了很多的相关参数，有的是上面讨论过的，有的没有讨论但是一般都是用固定值了，想要了解的话，也可以查阅官方的文档。

```cpp
typedef struct VkSwapchainCreateInfoKHR {
    VkStructureType                  sType;
    const void*                      pNext;
    VkSwapchainCreateFlagsKHR        flags;
    VkSurfaceKHR                     surface;
    uint32_t                         minImageCount;
    // format 格式，上面讨论过的
    VkFormat                         imageFormat;
    // colorspace 颜色空间，
    VkColorSpaceKHR                  imageColorSpace;
    VkExtent2D                       imageExtent;
    uint32_t                         imageArrayLayers;
    VkImageUsageFlags                imageUsage;
    VkSharingMode                    imageSharingMode;
    uint32_t                         queueFamilyIndexCount;
    const uint32_t*                  pQueueFamilyIndices;
    // 旋转模式
    VkSurfaceTransformFlagBitsKHR    preTransform;
    // 透明度合成模式
    VkCompositeAlphaFlagBitsKHR      compositeAlpha;
    // 呈现模式
    VkPresentModeKHR                 presentMode;
    VkBool32                         clipped;
    VkSwapchainKHR                   oldSwapchain;
} VkSwapchainCreateInfoKHR;
```

具体的代码和相关参数的设定如下： 

```cpp
    // 包含了创建 SwapChain 所需要的信息
    VkSwapchainCreateInfoKHR swapchain_ci = {};
    swapchain_ci.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
    swapchain_ci.pNext = NULL;
    swapchain_ci.surface = info.surface;
    // swapchain 最小的 image 数量
    // 这里就使用了 VkSurfaceCapabilitiesKHR 的最小数量
    swapchain_ci.minImageCount = desiredNumberOfSwapChainImages;
    // Image 的格式
    swapchain_ci.imageFormat = info.format;
    // Image 的宽高信息
    swapchain_ci.imageExtent.width = swapchainExtent.width;
    swapchain_ci.imageExtent.height = swapchainExtent.height;
    // 旋转模式
    swapchain_ci.preTransform = preTransform;
    // alpha 混合模式
    swapchain_ci.compositeAlpha = compositeAlpha;
    swapchain_ci.imageArrayLayers = 1;
    // 呈现模式
    swapchain_ci.presentMode = swapchainPresentMode;
    swapchain_ci.oldSwapchain = VK_NULL_HANDLE;
    swapchain_ci.clipped = true;
    // Image 颜色空间
    swapchain_ci.imageColorSpace = VK_COLORSPACE_SRGB_NONLINEAR_KHR;
    // Image 的用途
    swapchain_ci.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
    swapchain_ci.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
    // 设定 swapchain 需要的 Queue 信息
    swapchain_ci.queueFamilyIndexCount = 0;
    swapchain_ci.pQueueFamilyIndices = NULL;
    // 如果图像和显示的 Queue 索引不一致，就要设置 Image 为共享模式
    uint32_t queueFamilyIndices[2] = {(uint32_t) info.graphics_queue_family_index,
                                      (uint32_t) info.present_queue_family_index};
    if (info.graphics_queue_family_index != info.present_queue_family_index) {
        // If the graphics and present queues are from different queue families,
        // we either have to explicitly transfer ownership of images between
        // the queues, or we have to create the swapchain with imageSharingMode
        // as VK_SHARING_MODE_CONCURRENT
        swapchain_ci.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
        swapchain_ci.queueFamilyIndexCount = 2;
        swapchain_ci.pQueueFamilyIndices = queueFamilyIndices;
    }
    // 创建 SwapChain 需要用到 Device，创建 Device 又需要用到 图像队列 的索引值
    res = vkCreateSwapchainKHR(info.device, &swapchain_ci, NULL, &info.swap_chain);
    // 判断创建是否成功
    assert(res == VK_SUCCESS);
```

由此，就完成了 SwapChain 的创建。

可以看到创建 SwapChain 在前期还是需要不少的准备工作，猜想是因为 Vulkan 要做到跨平台，所以就会把很多硬件方面的设定暴露出来，导致在 API 层面上更接近于硬件底层，开发者在使用时也要了解更多的细节。比如有一些参数设定有很多个选项，但针对某一特定平台，只有两三个选项是有效的，其他选项是为了给其他平台的。

但是，只要我们完成了一次创建，相对于代码模块来说，就不会再有太多的变化了。把这块做好封装之后，在后续开发中直接复用，把精力专注于更加有意思的方面~~~

## SwapChain 的销毁

当程序运行结束后，就可以通过 `vkDestroySwapchainKHR` 函数来销毁 SwapChain 了，使用起来就和销毁其他组件一样，不再赘述了。

## 参考

文章中的代码地址，具体可以参考我的 Github 项目：

> https://github.com/glumes/vulkan_tutorial

## 总结

比较长的篇幅介绍了 SwapChain 的创建，尤其是创建过程中的一些参数设定，更多的要去理解它的意图。

SwapChain 顾名思义就是交换链，那么拿什么去交换呢？这就是后续内容中会讲到的 `Image` 对象。可以先简单理解成从 SwapChain 中申请一个 Image，然后对它进行渲染绘制，之后再把它放到 SwapChain 中去渲染呈现。

等我继续更新下去，你就会看到的~~~