---
title: "Python、C++、Android OpenCV 开发环境的配置"
date: 2017-12-22T09:53:04+08:00
description: "setup opencv environment"
categories:
    - "Code"
tags: ["Opencv"]
---


在 Mac 上折腾了一下 OpenCV 的配置，分别配置了 Python 、C++ 和 Android 上的开发环境，中间还遇到点坑，简要记录一下。

<!--more-->


## OpenCV 的安装

OpenCV 的安装有两种方式，可以通过下载源码自行编译，也可以通过`homebrew`来安装。

### 源码编译

通过源码编译可以参考下面这两篇文章：

1、[https://www.pyimagesearch.com/2016/12/05/macos-install-opencv-3-and-python-3-5/](https://www.pyimagesearch.com/2016/12/05/macos-install-opencv-3-and-python-3-5/)

2、[https://www.pyimagesearch.com/2015/06/29/install-opencv-3-0-and-python-3-4-on-osx/](https://www.pyimagesearch.com/2015/06/29/install-opencv-3-0-and-python-3-4-on-osx/)

大致操作都是要从 Github 上下载好源码，然后配置 cmake ，再通过 make 编译出 `cv2.so` 库。

### Homebrew 安装

通过 homebrew 来安装 OpenCV 就相对简单多了。

直接 `brew install opencv` 命令就好了。

不过，要注意的是：下载好的 OpenCV 还在 `/usr/local/Cellar/opencv/3.3.1_1/` 目录下。

这时候，在 Terminal 上，直接运行 Python3 命令，然后在交互式环境中通过 `import cv2`的命令来导入 OpenCV 的库依旧是找不到的。

解决办法就是进入到 `/usr/local/lib/python3.6/site-packages` 目录下，通过 `ln` 命令将 `/usr/local/Cellar/opencv/3.3.1_1/lib/python3.6/site-packages` 目录下的 `cv2.so` 链接到当前目录。

``` sh
///usr/local/lib/python3.6/site-packages 目录下执行如下指令
sudo ln -s /usr/local/Cellar/opencv/3.3.1_1/lib/python3.6/site-packages/cv2.so cv2.so
```

这样就可以完成导入了。

## Python 配置 OpenCV 环境

Python 开发用的 IDE 是 PyCharm。

事实上在 PyCharm 的 Project Interpreter 中可以添加 Python 库的，直接选择 `opencv-python` 库就好了，它最终也是通过 `pip`命令来下载对应的库的。

但却有个问题：

通过这种方式安装的 OpenCV 在运行播放视频的代码时会出错：
 
``` java
import cv2
videoUrl = "/Users/glumes/Desktop/kpt1.mp4"
cap = cv2.VideoCapture('/Users/glumes/Desktop/kpt1.mp4')
while(cap.isOpened()):
    ret, frame = cap.read()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cv2.imshow('frame', gray)
    if cv2.waitKey(0) & 0xFF == ord('q'):
        break
cap.release()
cv2.destroyAllWindows()
```


报错的内容是：` The current event queue and the main event queue are not the same`。

正好在 OpenCV 的 Github 上有个 Issue 也提到了这个问题：[https://github.com/opencv/opencv/issues/7474](https://github.com/opencv/opencv/issues/7474)
给出的原因是因为没有安装好 ffmpeg。

所以还是建议直接通过 brew 的方式安装，然后再创建链接好了。

安装好之后，就可以开始运行我们的 OpenCV 代码了。

简单的展示一张图片代码示例：

``` java
import cv2
print(cv2.__version__)
imgUrl = '/Users/glumes/Desktop/blog_camera_block.png'
img = cv2.imread(imgUrl,0)
cv2.imshow('image',img)
cv2.waitKey(0)
print("waiting")
cv2.destroyAllWindows()
```

## C++ 配置 OpenCV 环境

C++ 开发用的 Mac 的 Xcode。

首先要在 Xcode 中创建一个命令行工程。

![mac-command-line-project](http://7xqe3m.com1.z0.glb.clouddn.com/blog_mac_pro_command_line.png)


然后在工程名处右键，选择 `Add File to Project `，通过快捷键 `Command＋Shift＋G`进入到 `/usr/local/lib`目录下，将所有和 OpenCV 相关的 `dylib` 库添加进来。

完成了之后，再到工程的 `Build Settings`中去添加对应的头文件和库文件。

找到 Search Paths，然后在 Header Search Paths 中添加

*	/usr/local/include
*	/usr/local/include/opencv

在 Library Search Paths 中添加

*	/usr/local/lib

效果图如下：

![xcode_build_setting](http://7xqe3m.com1.z0.glb.clouddn.com/blog_xcode_build_setting.png)


完成之后，就可以开始编写 C++ 代码来开发 OpenCV 了。

同样还是预览一张图片作为示例：

``` c++
//
//  main.cpp
//  OpenCVEnv
//
//  Created by glumes on 2017/11/7.
//  Copyright © 2017年 glumes. All rights reserved.
//

#include <iostream>
#include <opencv2/opencv.hpp>
#include <opencv2/highgui/highgui.hpp>
#include <opencv/cvaux.hpp>
#include <fstream>
using namespace std;
#define BYTE unsigned char

int main(int argc, const char * argv[])
{
    //这个地方的目录需要改成自己的
    IplImage* img = cvLoadImage("/Users/glumes/Desktop/blog_opengl_result_point.png", 1);
    cvNamedWindow("picture", 1);
    cvShowImage("picture", img);
    cvWaitKey(0);
    cvReleaseImage(&img);
    cvDestroyWindow("picture");
    return 0;
}

```

点击运行，当编译成功时，就可以看到多了一个命令行窗口，里面就是我们预览的图片内容。


完成了开发环境的配置之后，就可以愉快地进行 OpenCV 开发咯。


## Android 配置 OpenCV 开发环境

在 Android 上配置 OpenCV 的环境相对就简单多了。

首先要做的就是在官网上 https://opencv.org/releases.html 下载好对应的 SDK ，有 2.x 版本的也有 3.x 版本的。

解压之后，主要有三个目录：`apk`、`sdk`、`samples`，要关心的就是`sdk`目录了。


在 AS 上新建一个 Android 工程，创建时最好先勾选了 C++ Support 选项，后面会在 CMakeLists.txt 文件中进行更改。

 然后选择 Import Module，在弹出的框中，选择下载好的 SDK 的 java 文件夹，如下图：

![import_opencv_module](http://7xqe3m.com1.z0.glb.clouddn.com/blog_import_opencv_module.png)


这会将 OpenCV 提供的对 NDK 调用封装的库以依赖的形式导入到我们的工程。

别忘了在工程的 build.gradle 添加如下代码来导入

``` gradle
  implementation project(':OpenCVLibrary330')
```


之后，就是导入 `so` 动态库。

将 OpenCV-android-sdk\sdk\native\libs 目录下的内容拷贝到应用的 jibLibs 目录下。

![import_opencv_sp](http://7xqe3m.com1.z0.glb.clouddn.com/blog_import_opencv_so.png)


接下来修改 CMakeLists.txt 文件，将头文件和库进行导入。


``` cmake
# 包含头文件
 include_directories(/Users/glumes/Downloads/OpenCV-android-sdk/sdk/native/jni/include)
# 添加 lib_opencv 动态库
 add_library( lib_opencv SHARED IMPORTED )
# 设置库的导入路径
 set_target_properties(lib_opencv PROPERTIES IMPORTED_LOCATION ${CMAKE_CURRENT_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI}/libopencv_java3.so)

```

这里仅仅是导入了 libs 目录下的动态 so 库，也可以将静态的 `.a` 库导入。

完成了这一步后，就可以用 C++ 进行 OpenCV 的开发了。

在默认的 native-lib 动态库中，添加 opencv 的动态库，这样就可以链接到了。

``` cmake
target_link_libraries( # Specifies the target library.
                       native-lib
					   # 链接 opencv 的动态库
                       lib_opencv

                       # Links the target library to the log library
                       # included in the NDK.
                       ${log-lib} )
```

具体的详细配置 Demo 可以参考我的 Github 地址  https://github.com/glumes/AndroidOpenCV



## 参考

1、http://www.jianshu.com/p/11959977589a



