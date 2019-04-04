---
title: "进击的 Vulkan 移动开发之 Command Buffer"
date: 2019-01-09T09:50:20+08:00
subtitle: ""
tags: ["Vulkan"]
categories: ["Vulkan"]
comments: true
bigimg: [{src: "https://ws1.sinaimg.cn/large/bc32fd77gy1fz03j7xdslj22n01rcb29.jpg", desc: ""}]
draft: false
original: true
addwechat: true

---

> Vulkan 开发的系列文章：

> 1. [进击的 Vulkan 移动开发（一）之今生前世](https://glumes.com/post/vulkan/vulkan-tutorial-concept/)

> 2. [进击的 Vulkan 移动开发（二）之谈谈对渲染流程的理解](https://glumes.com/post/vulkan/vulkan-tutorial-renderer/)

> 3. [进击的 Vulkan 移动开发之 Instance & Device & Queue](https://glumes.com/post/vulkan/vulkan-tutorial-instance-device-queue/)


此篇文章继续学习 Vulkan 中的组件：Command-Buffer 。

![](https://ws1.sinaimg.cn/large/bc32fd77gy1fytl33ku2vj21c40r4n49.jpg)


<!--more-->

在前面的文章中，我们已经创建了 `Instance`、`Device`、`Queue` 三个组件，并且知道了 `Queue` 组件是用来和物理设备沟通的桥梁，而具体的沟通过程就需要 `Command-Buffer` （命令缓冲区）组件，它是若干命令的集合，我们向 `Queue` 提交 `Command-Buffer`，然后才交由物理设备 GPU 进行处理。


## Command-Pool 组件

在创建  `Command-Buffer` 之前，需要创建 `Command-Pool` 组件，从 `Command-Pool` 中去分配 `Command-Buffer` 。

还是老套路，我们需要先创建一个 `VkXXXXCreateInfo` 的结构体，结构体每个参数的释义还是要多看官方的文档。

```cpp
    // 创建 Command-Pool 组件
    VkCommandPool command_pool;
    VkCommandPoolCreateInfo poolCreateInfo = {};
    poolCreateInfo.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
    // 可以看到 Command-Pool 还和 Queue 相关联
    poolCreateInfo.queueFamilyIndex = info.graphics_queue_family_index;
    // 标识命令缓冲区的一些行为
    poolCreateInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
    // 具体创建函数的调用
    vkCreateCommandPool(info.device, &poolCreateInfo, nullptr, &command_pool);
```

有几个参数需要注意：

1. `queueFamilyIndex` 参数为创建 `Queue` 时选择的那个 `queueFlags` 为 `VK_QUEUE_GRAPHICS_BIT` 的索引，从 `Command-Pool` 中分配的的 `Command-Buffer` 必须提交到同一个 `Queue` 中。
2. `flags` 有如下的选项，分别指定了 `Command-Buffer` 的不同特性：

```cpp
typedef enum VkCommandPoolCreateFlagBits {
    VK_COMMAND_POOL_CREATE_TRANSIENT_BIT = 0x00000001,
    VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT = 0x00000002,
    VK_COMMAND_POOL_CREATE_FLAG_BITS_MAX_ENUM = 0x7FFFFFFF
} VkCommandPoolCreateFlagBits;
```

*   VK_COMMAND_POOL_CREATE_TRANSIENT_BIT
    *   表示该 `Command-Buffer` 的寿命很短，可能在短时间内被重置或释放

*   VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT
    *   表示从 `Command-Pool` 中分配的 `Command-Buffer` 可以通过 `vkResetCommandBuffer` 或者 `vkBeginCommandBuffer` 方法进行重置，如果没有设置该标识位，就不能调用 `vkResetCommandBuffer` 方法进行重置。



## Command-Buffer 组件


接下来就是从 `Command-Pool` 中分配 `Command-Buffer`，通过 `VkCommandBufferAllocateInfo` 函数。

首先需要一个 `VkCommandBufferAllocateInfo` 结构体表示分配所需要的信息。

```cpp
typedef struct VkCommandBufferAllocateInfo {
    VkStructureType         sType;
    const void*             pNext;
    VkCommandPool           commandPool;    // 对应上面创建的 command-pool
    VkCommandBufferLevel    level;
    uint32_t                commandBufferCount; // 创建的个数
} VkCommandBufferAllocateInfo;
```

这里有个参数也要注意：

*   `VkCommandBufferLevel` 指定 `Command-Buffer` 的级别。

有如下级别可以使用：

```cpp
typedef enum VkCommandBufferLevel {
    VK_COMMAND_BUFFER_LEVEL_PRIMARY = 0,
    VK_COMMAND_BUFFER_LEVEL_SECONDARY = 1,
    VK_COMMAND_BUFFER_LEVEL_BEGIN_RANGE = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
    VK_COMMAND_BUFFER_LEVEL_END_RANGE = VK_COMMAND_BUFFER_LEVEL_SECONDARY,
    VK_COMMAND_BUFFER_LEVEL_RANGE_SIZE = (VK_COMMAND_BUFFER_LEVEL_SECONDARY - VK_COMMAND_BUFFER_LEVEL_PRIMARY + 1),
    VK_COMMAND_BUFFER_LEVEL_MAX_ENUM = 0x7FFFFFFF
} VkCommandBufferLevel;
```

一般来说，使用 `VK_COMMAND_BUFFER_LEVEL_PRIMARY` 就好了。


具体创建代码如下：

```cpp
    VkCommandBuffer commandBuffer[2];
    VkCommandBufferAllocateInfo command_buffer_allocate_info{};
    command_buffer_allocate_info.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    command_buffer_allocate_info.commandPool = command_pool;
    command_buffer_allocate_info.commandBufferCount = 2;
    command_buffer_allocate_info.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    vkAllocateCommandBuffers(info.device, &command_buffer_allocate_info, commandBuffer);
```


## Command-Buffer 的生命周期

创建了 `Command-Buffer` 之后，来了解一下它的生命周期，如下图：

![](https://ws1.sinaimg.cn/large/bc32fd77gy1fytmcwfgywj20wl0e5myz.jpg)



*   Initial 状态

在 `Command-Buffer` 刚刚创建时，它就是处于初始化的状态。从此状态，可以达到 `Recording` 状态，另外，如果重置之后，也会回到该状态。

*   Recording 状态

调用 `vkBeginCommandBuffer` 方法从 `Initial` 状态进入到该状态。一旦进入该状态后，就可以调用 `vkCmd*` 等系列方法记录命令。

*   Executable 状态

调用 `vkEndCommandBuffer` 方法从 `Recording` 状态进入到该状态，此状态下，`Command-Buffer` 可以提交或者重置。

*   Pending 状态

把 `Command-Buffer` 提交到 `Queue` 之后，就会进入到该状态。此状态下，物理设备可能正在处理记录的命令，因此不要在此时更改 `Command-Buffer`，当处理结束后，`Command-Buffer` 可能会回到 `Executable` 状态或者 `Invalid` 状态。

*   Invalid 状态

一些操作会使得 `Command-Buffer` 进入到此状态，该状态下，`Command-Buffer` 只能重置、或者释放。


## Command-Buffer 的记录与提交

现在可以尝试着记录一些命令，提交到 `Queue` 上了，命令记录的调用过程如下图：

![](https://ws1.sinaimg.cn/large/bc32fd77gy1fytn1nbd2gj20q30fgah3.jpg)

在 `vkBeginCommandBuffer` 和 `vkEndCommandBuffer` 方法之间可以记录和渲染相关的命令，这里先不考虑中间的过程，直接创建提交。


#### begin 阶段

```cpp
        VkCommandBufferBeginInfo beginInfo = {};
        beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
        beginInfo.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
        vkBeginCommandBuffer(commandBuffer[0], &beginInfo);
```

首先，还是需要创建一个 `VkCommandBufferBeginInfo` 结构体用来表示 `Command-Buffer` 开始的信息。

这里要注意的参数是 `flags` ，表示 `Command-Buffer` 的用途，

```cpp
typedef enum VkCommandBufferUsageFlagBits {
    VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT = 0x00000001,
    VK_COMMAND_BUFFER_USAGE_RENDER_PASS_CONTINUE_BIT = 0x00000002,
    VK_COMMAND_BUFFER_USAGE_SIMULTANEOUS_USE_BIT = 0x00000004,
    VK_COMMAND_BUFFER_USAGE_FLAG_BITS_MAX_ENUM = 0x7FFFFFFF
} VkCommandBufferUsageFlagBits;
```

*   VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT
    *   表示该 Command-Buffer 只使用提交一次，用完之后就会被重置，并且每次提交时都需要重新记录


#### end 阶段

直接调用 `vkEndCommandBuffer` 方法就可以结束记录，此时就可以提交了。

```cpp
    vkEndCommandBuffer(commandBuffer[0]);
```

#### buffer 提交

通过 `vkQueueSubmit` 方法将 `Command-Buffer` 提交到 `Queue` 上。

同样的还是需要创建一个 `VkSubmitInfo` 结构体：

```cpp
typedef struct VkSubmitInfo {
    VkStructureType                sType;
    const void*                    pNext;
    uint32_t                       waitSemaphoreCount;  // 等待的 Semaphore 数量
    const VkSemaphore*             pWaitSemaphores;     // 等待的 Semaphore 数组指针
    const VkPipelineStageFlags*    pWaitDstStageMask;       // 在哪个阶段进行等待
    uint32_t                       commandBufferCount;  // 提交的 Command-Buffer 数量
    const VkCommandBuffer*         pCommandBuffers;      // 具体的 Command-Buffer 数组指针
    uint32_t                       signalSemaphoreCount;    //执行结束后通知的 Semaphore 数量
    const VkSemaphore*             pSignalSemaphores;       //执行结束后通知的 Semaphore 数组指针
} VkSubmitInfo;
```

它的参数比较多，并且涉及到 `Command-Buffer` 之间的同步关系了，这里简单说一下，后面再细说这一块。

如下图，Vulkan 中有 `Semaphore`、`Fences`、`Event`、`Barrier` 四种机制来保证同步。

![](https://ws1.sinaimg.cn/large/bc32fd77gy1fyubwo7iaqj21is0umjzo.jpg)


简单说一下 `Semaphore` 和 `Fence` 。

*   `Semaphore` 
    *  `Semaphore`  的作用主要是用来向 `Queue` 中提交 `Command-Buffer` 时实现同步。比如说某个 `Command-Buffer-B` 在执行的某个阶段中需要等待另一个 `Command-Buffer-A` 执行成功后的结果，同时 `Command-Buffer-C` 在某阶段又要要等待 `Command-Buffer-B` 的执行结果，那么就应该使用 `Semaphore` 机制实现同步；
    *  此时 `Command-Buffer-B` 提交到 `Queue` 时就需要两个 `VkSemaphor` ，一个表示它需要等待的 `Semaphore`，并且指定在哪个阶段等待；一个是它执行结束后发出通知的 `Semaphore`。

*   `Fence`
    *   `Fence` 的作用主要是用来保证物理设备和应用程序之间的同步，比如说向 `Queue` 中提交了 `Command-Buffer` 后，具体的执行交由物理设备去完成了，这是一个异步的过程，而应用程序如果要等待执行结束，就要使用 `Fence` 机制。


`Semaphore` 和 `Fence` 有相同之处，但是使用场景却不一样，就如图所示。

`Semaphore` 和 `Fence` 的创建过程如下，和以往的 Vulkan 创建对象的调用方式没有太大区别：

```cpp
    // 创建 Semaphore
    VkSemaphore imageAcquiredSemaphore;
    VkSemaphoreCreateInfo semaphoreCreateInfo = {};
    semaphoreCreateInfo.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;
    vkCreateSemaphore(info.device, &semaphoreCreateInfo, nullptr, &imageAcquiredSemaphore);

    // 创建 Fence
    VkFence drawFence;
    VkFenceCreateInfo fenceCreateInfo = {};
    fenceCreateInfo.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    // 该参数表示 Fence 的状态，如果不设置或者为 0 表示 unsignaled state
    fence_info.flags = 0; 
    vkCreateFence(info.device, &fenceCreateInfo, nullptr, &drawFence);
```

继续回到 `VkSubmitInfo` 结构体中，如果只是简单的提交 `Command-Buffer`，那就不需要考虑 `Semaphore` 这些同步机制了，把相应的参数都设置为 `nullptr`，或者直接不设置也行，最后提交就好了，代码如下:

```cpp
    // 简单的提交过程
    // 开始记录
    VkCommandBufferBeginInfo beginInfo1 = {};
    beginInfo1.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    beginInfo1.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
    vkBeginCommandBuffer(commandBuffer[0], &beginInfo1);

    // 省略中间的 vkCmdXXXX 系列方法
    // 结束记录
    vkEndCommandBuffer(commandBuffer[0]);

    VkSubmitInfo submitInfo1 = {};
    submitInfo1.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    // pWaitSemaphores 和 pSignalSemaphores 都不设置，只是提交
    submitInfo1.commandBufferCount = 1;
    submitInfo1.pCommandBuffers = &commandBuffer[0];

    // 注意最后的参数 临时设置为 VK_NULL_HANDLE，也可以设置为  Fence 来同步
    vkQueueSubmit(info.queue, 1, &submitInfo1, VK_NULL_HANDLE);
```

以上就完成了 `Command-Buffer` 提交到 `Queue` 的过程，省略了 `Semaphores` 和 `Fences` 的同步机制，当然也可以把它们加上。

在 `vkQueueSubmit` 的最后一个参数设置为了 `VK_NULL_HANDLE` ，这是 Vulkan 中设置为 `NULL` 的一个方法（其实是设置了一个整数 0 ），也可以设置了 `Fence` ，表示我们要等待该 `Command-Buffer` 在 `Queue` 执行结束，虽说 `Command-Buffer` 也可以通过 `Semaphore` 来表示执行结束，但这两种方式的使用场景不一样。

回到 `Fence` 的创建过程，其中有一个 `flags` 参数表示 `Fence` 的状态，有如下两种状态：

*   signaled state
    *   如果 flags 参数为 VK_FENCE_CREATE_SIGNALED_BIT 则表示创建后处于该状态。
*   unsignaled state
    *   默认的状态。

当 `vkQueueSubmit` 的最后参数传入 `Fence` 后，就可以通过 `Fence` 等待该 `Command-Buffer` 执行结束。

```cpp
// wait fence to enter the signaled state on the host
//  错误的 waitForFences 使用，因为它并不是一个阻塞的方法
//  VkResult res = vkWaitForFences(info.device, 1, &fence, VK_TRUE, UINT64_MAX);
    VkResult res;
    do {
        res = vkWaitForFences(info.device, 1, &fence, VK_TRUE, UINT64_MAX);
    } while (res == VK_TIMEOUT);
```


`vkWaitForFences` 方法会等待 `Fence` 进入 `signaled state` 状态，该方法的调用要放在 `while` 循环中，因为它并不是一个阻塞的方法，可以理解成一个状态查询，如果结果不对，返回的是 `VK_TIMEOUT`，结果满足要求才返回 `VK_SUCCESS` 。


当  `Command-Buffer` 执行结束后，传入的 `Fence` 参数就会从 `unsignaled state` 进入到 `signaled state` ，从而触发 `vkWaitForFences` 调用结束循环，表明执行结束了。

这就是 `Fence` 的使用，至于 `Command-Buffer` 之间通过 `Semaphore` 来同步的示例，详见后续文章。


## 总结

本篇文章主要讲解了 `Command-Buffer` 的使用和提交，并且涉及到了 Vulkan 的一些同步机制。

具体和渲染有关的操作，都要在 `Command-Buffer` 之间记录，结束记录之后提交给 `Queue` ，让 GPU 去执行具体的操作，当然具体执行是一个异步的过程，需要用到同步机制。

`Semaphore`  和  `Fence` 都可以实现同步，但使用场景不同。





