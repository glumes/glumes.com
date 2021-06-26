---
title: "进击的 Vulkan 移动开发之 Instance & Device & Queue"
date: 2019-01-07T11:03:18+08:00
subtitle: ""
tags: ["Vulkan"]
categories: ["Vulkan"]
comments: true
bigimg: [{src: "https://image.glumes.com/blog_image/610391b1gy1gmhbipn8w5j208x0sgtk7.jpg", desc: ""}]
draft: false
original: true
addwechat: true
---

> Vulkan 开发的系列文章：

> 1. [进击的 Vulkan 移动开发（一）之今生前世](https://glumes.com/post/vulkan/vulkan-tutorial-concept/)

> 2. [进击的 Vulkan 移动开发（二）之谈谈对渲染流程的理解](https://glumes.com/post/vulkan/vulkan-tutorial-renderer/)


在 Vulkan 的系列文章中出现过如下的图片：


![](https://image.glumes.com/blog_image/vulkan-instance-device-queue.webp)

这张图片很详细的概括了 Vulkan 中的重要组件以及它们的工作流程，接下来的文章中会针对每个组件进行学习讲解并配上相关的示例代码，首先是 Instance、Device 和 Queue 组件。

<!--more-->

## Instance 组件


在开始创建 Device 等组件之前，需要创建一个 `VkInstance` 对象。

通过 `vkCreateInstance` 方法创建 `VKInstance` 对象，以下是函数原型，在 `<vulkan.h>` 头文件中。

```cpp
// 声明的函数指针的形式
typedef VkResult (VKAPI_PTR *PFN_vkCreateInstance)
(const VkInstanceCreateInfo* pCreateInfo, // 提供创建的信息
const VkAllocationCallbacks* pAllocator, // 创建时的回调函数
VkInstance* pInstance);                // 创建的实例
```

<vulkan.h> 的头文件把函数通过 `typedef` 关键字声明成了函数指针的形式，可能会有点难找。


> 在 Vulkan 的 API 中有一些固定的 **调用套路** 。
>
> 1. 要创建某个对象，先提供一个包含创建信息的对象。
> 2. 创建时通过传递引用的方式来传参。

接下来看看这个套路是如何应用在 `VKInstance` 对象上的。

在 `vkCreateInstance` 函数中看到有个名为 `VkInstanceCreateInfo` 类型的参数，这就是包含了 `VKInstance` 要创建的信息。

它的参数信息有点多：

```cpp
typedef struct VkInstanceCreateInfo {
    VkStructureType             sType;  // 一般为方法对应的类型
    const void*                 pNext; // 一般为 null 就好了
    VkInstanceCreateFlags       flags;  // 留着以后用的，设为 0 就好了
    const VkApplicationInfo*    pApplicationInfo; // 对应新的一个结构体 VkApplicationInfo
    uint32_t                    enabledLayerCount; // layer 和 extension 用于调试和拓展
    const char* const*          ppEnabledLayerNames;
    uint32_t                    enabledExtensionCount;
    const char* const*          ppEnabledExtensionNames;
} VkInstanceCreateInfo;
```


除了还需要创建一个 `VkApplicationInfo` 对象，还可以设置 `Layer` 和 `Extension` 。

其中：`Layer` 是用来错误校验、调试输出的。为了提供性能，其中的方法之一就是减少驱动进行状态、错误校验，而 Vulkan 就把这一层单独抽出来了。



![](https://image.glumes.com/blog_image/vulkan-layer.webp)

`Layer` 在整个架构中的位置如上图，Vulkan API 直接和驱动对话，而 `Layer` 处于应用和 Vulkan API 之间，供开发者进行调试。

另外，`Extension` 就是 Vulkan 支持的拓展，最典型的就是 Vulkan 的跨平台渲染显示，就是通过拓展来完成的，比如在 Android、Windows 上使用 Vulkan 都需要使用不同的拓展才可以把内容显示到屏幕上。

关于 `Layer` 和 `Extension` 后续再细说。

接着回到 `VkApplicationInfo` 结构体，也是创建 Instance 的必要参数之一。

```cpp
typedef struct VkApplicationInfo {
    VkStructureType    sType;
    const void*        pNext;
    const char*        pApplicationName;
    uint32_t           applicationVersion;
    const char*        pEngineName;
    uint32_t           engineVersion;
    uint32_t           apiVersion;
} VkApplicationInfo;
```

它的参数释义就比较容易理解了，设置应用的名称、版本号等，有了它们就可以创建 `Instance` 对象了，代码可以参考 [这里](https://github.com/glumes/vulkan_tutorial/blob/master/instance_and_device/src/main/cpp/vulkan_tutorial_1.cpp) 。

具体的代码如下

```cpp
    VkApplicationInfo app_info = {};
    
    app_info.apiVersion = VK_API_VERSION_1_0;
    app_info.applicationVersion = 1;
    app_info.engineVersion = 1;
    app_info.pNext = nullptr;
    app_info.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    app_info.pEngineName = APPLICATION_NAME;
    app_info.pApplicationName = APPLICATION_NAME;

    VkInstanceCreateInfo instance_info = {};
    // type 就是结构体的类型
    instance_info.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    instance_info.pNext = nullptr;
    instance_info.pApplicationInfo = &app_info;
    instance_info.flags = 0;
    // Extension and Layer 暂时不用,可空
    instance_info.enabledExtensionCount = 0;
    instance_info.ppEnabledExtensionNames = nullptr;
    instance_info.ppEnabledLayerNames = nullptr;
    instance_info.enabledLayerCount = 0;

    VkResult result = vkCreateInstance(&instance_info, nullptr, &instance);
```

当每调用一个创建函数后，返回的类型都是 `VkResult` ，只要 VkResult 大于 0 ，那么执行就是成功的。

另外还有个参数是 `VkAllocationCallbacks`，表示函数调用时的回调，需要传递一个函数指针，在后面的各种调用中都会看到它的身影，如果有用到可以传参，一般为 `nullptr` 就好了。

关于每个结构体，它每个参数的具体释义，靠死记硬背是肯定不行的，参考 `vkspec.pdf` 书籍，里面有对每个参数、结构体的详细释义。


## Device 组件


有了 `Instance` 组件，就可以创建 `Device` 组件了，按照调用的套路，肯定还会有一个 `VkDeviceCreateInfo` 的结构体表示 `Device` 的创建信息。

而 `Device` 具体指的是逻辑上的设备，可以说是对物理设备的一个逻辑上的封装，而物理设备就是 `VkPhysicalDevice` 对象。

在某些情况下，可能会具有多个物理设备，如下图所示，因此要先枚举一下所有的物理设备：



![](https://image.glumes.com/blog_image/vulkan-device-image.webp)

```cpp
    LOGI("enumerate gpu device");
    uint32_t gpu_size = 0;
    // 第一次调用只为了获得个数
    VkResult res = vkEnumeratePhysicalDevices(instance, &gpu_size, nullptr);
```

在 `vkEnumeratePhysicalDevices` 方法中，传入的第二个参数为 gpu 的个数，第三个参数为 null，这样的一次调用会返回 gpu 的个数到 `gpu_size` 变量。

```cpp
    vector<VkPhysicalDevice> gpus;
    gpus.resize(gpu_size);
    // vector.data() 方法转换成指针类型
    // 第二次调用获得所有的数据
    res = vkEnumeratePhysicalDevices(instance, &gpu_size, gpus.data());
```

当再一次调用 `vkEnumeratePhysicalDevices` 函数时，第三个参数不为 null，而是相应的 `VkPhysicalDevice` 容器，那么 gpus 会填充 `gpu_size` 个的 `VkPhysicalDevice` 对象。

这也算是 Vulkan API 调用的一个 **固定套路** 了，调用两次来获得数据，在后面的代码中也会经常看到这种方式。

有了 `VkPhysicalDevice` 对象之后，可以查询 `VkPhysicalDevice` 上的一些属性，以下函数都可以查询相关信息：

*   vkGetPhysicalDeviceQueueFamilyProperties
*   vkGetPhysicalDeviceMemoryProperties
*   vkGetPhysicalDeviceProperties
*   vkGetPhysicalDeviceImageFormatProperties
*   vkGetPhysicalDeviceFormatProperties


在这里需要用到的属性是 `QueueFamilyProperties` ，获得该属性的方法调用方式和获得 `VkPhysicalDevice` 数据方式一样，也是一个两次调用。

如果有设备有多个 GPU，那么这里取第一个来获取它的相关属性：

```cpp
    // 第一次调用，获得个数
    uint32_t queue_family_count = 0;
    vkGetPhysicalDeviceQueueFamilyProperties(gpus[0], &queue_family_count, nullptr);
    assert(queue_family_count != 0);
    
    // 第二次调用，获得实际数据
    vector<VkQueueFamilyProperties> queue_family_props;
    queue_family_props.resize(queue_family_count);
    vkGetPhysicalDeviceQueueFamilyProperties(gpus[0], &queue_family_count, queue_family_props.data());
    assert(queue_family_count != 0);
```

`QueueFamilyProperties` 的结构体含义如下：

```cpp
typedef struct VkQueueFamilyProperties {
    VkQueueFlags    queueFlags;      // 标识位：表示 Queue 的功能
    uint32_t        queueCount;         
    uint32_t        timestampValidBits;
    VkExtent3D      minImageTransferGranularity;
} VkQueueFamilyProperties;
```

其中：`queueFlags` 表示该 Queue 的能力，有的 Queue 是用来渲染图像的，这个和我们的使用最为密切，还有的 Queue 是用来计算的。

具体的 Flag 标识如下：

```cpp
typedef enum VkQueueFlagBits {
    VK_QUEUE_GRAPHICS_BIT = 0x00000001,         // 图像相关
    VK_QUEUE_COMPUTE_BIT = 0x00000002,          // 计算相关
    VK_QUEUE_TRANSFER_BIT = 0x00000004,
    VK_QUEUE_SPARSE_BINDING_BIT = 0x00000008,
    VK_QUEUE_FLAG_BITS_MAX_ENUM = 0x7FFFFFFF
} VkQueueFlagBits;
typedef VkFlags VkQueueFlags;
```

一般来说，我们用的是 `queueFlags` 为 `VK_QUEUE_GRAPHICS_BIT` 标识位的 `Queue` 。

那么 `Queue` 究竟是什么？

物理设备可能会有多个 `Queue`，不同的 `Queue` 对应不同的特性。

在文章最开始的图中可以看到，`Command-buffer` 是提交到了 `Queue` ，`Queue` 再提交给 `Device` 去执行。`Queue` 可以看成是应用程序和物理设备沟通的桥梁，我们在 `Queue` 上提交命令，然后再交由 GPU 去执行。

回到本小节的内容，创建 Device 组件，它的函数指针形式如下：

```cpp
// 创建 Device 的函数指针
typedef VkResult (VKAPI_PTR *PFN_vkCreateDevice)
(VkPhysicalDevice physicalDevice,       // 物理设备
const VkDeviceCreateInfo* pCreateInfo,  // 调用套路里面的 CreateInfo
const VkAllocationCallbacks* pAllocator,
VkDevice* pDevice);                   // 要创建的 Device 类
```

创建一个 `Device` 对象，不仅需要指定具体的物理设备 `VkPhysicalDevice`，另外还需要该物理设备上的 `Queue` 相关信息。

在 `VkDeviceCreateInfo` 结构体中需要一个参数是 `VkDeviceQueueCreateInfo` ，它的创建如下：

```cpp
    // 创建 Queue 所需的相关信息
    VkDeviceQueueCreateInfo queue_info = {};
    // 找到属性为 VK_QUEUE_GRAPHICS_BIT 的索引
    bool found = false; 
    for (unsigned int i = 0; i < queue_family_count; ++i) {
        if (queue_family_props[i].queueFlags & VK_QUEUE_GRAPHICS_BIT) {
            queue_info.queueFamilyIndex = i;
            found = true;
            break;
        }
    }

    float queue_priorities[1] = {0.0};
    // 结构体的类型
    queue_info.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
    queue_info.pNext = nullptr;
    queue_info.queueCount = 1;
    // Queue 的优先级
    queue_info.pQueuePriorities = queue_priorities;
```

接下来就可以完成 `Queue` 的创建：

```cpp
    // 创建 Device 所需的相关信息类
    VkDeviceCreateInfo device_info = {};

    device_info.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    device_info.pNext = nullptr;
    // Device 所需的 Queue 相关信息
    device_info.queueCreateInfoCount = 1;   // Queue 个数
    device_info.pQueueCreateInfos = &queue_info;    // Queue 相关信息
    // Layer 和 Extension 暂时为空，不影响运行，后续再补上
    device_info.enabledExtensionCount = 0;
    device_info.ppEnabledExtensionNames = NULL;
    device_info.enabledLayerCount = 0;
    device_info.ppEnabledLayerNames = NULL;
    device_info.pEnabledFeatures = NULL;
    
    res = vkCreateDevice(gpus[0], &device_info, nullptr, &device);
```


## Queue 组件

完成了 `Device` 创建之后，`Queue` 的创建也简单多了，直接调用如下函数就好了：

```cpp
typedef void (VKAPI_PTR *PFN_vkGetDeviceQueue)
(VkDevice device,   // 创建的 Device 对象
uint32_t queueFamilyIndex, // queueFlags 为 VK_QUEUE_GRAPHICS_BIT 的索引
uint32_t queueIndex,        
VkQueue* pQueue);       // 要创建的 Queue

// 代码示例
vkGetDeviceQueue(info.device, info.graphics_queue_family_index, 0, &info.queue);

```


## 组件销毁

完成了 `Instance`、`Device`、`Queue` 组件的创建之后，还有一件要做的事情就是释放它们，销毁组件。

按照先进后出的方式进行销毁，`Instance` 最先创建反而最后销毁，和 `Device` 相关联的 `Queue` 当 `Device` 销毁了，`Queue` 也随之销毁了。

```cpp
    // 销毁 Device
    vkDestroyDevice(info.device, nullptr);
    // 销毁 Instance
    vkDestroyInstance(info.instance, nullptr);
```


## 参考

这里有一些不错的参考地址和书籍：

1. https://www.zhihu.com/people/snowfox-68/activities
2. https://www.zhihu.com/people/chen-yong-59-86/posts

也可以参考我的项目实践代码：

> [https://github.com/glumes/vulkan_tutorial](https://github.com/glumes/vulkan_tutorial)


以上是个人的学习经验，仅供参考，有讲的不对之处，欢迎指出，也可以加我微信一起交流学习: `ezglumes` (备注博客).

## 总结

敲一遍上述的代码，会发现 Vulkan 在 API 调用上还是有迹可循的，重点是要理解了每个参数的含义，多结合官方的文档来学习、实践、











