---
title: "【喜大普奔】域名终于备案通过啦"
date: 2020-08-03T20:22:39+08:00
subtitle: ""
tags: ["Life"]
categories: ["android"]
comments: true
bigimg: [{src: "https://ae01.alicdn.com/kf/U63974cc923674332ab8751e2b18d9b9fd.jpg", desc: ""}]
draft: false
original: true
---

前段时间博客网站一直无法访问，还有不少朋友特意发微信告诉我，感谢大家的好意了!

> 网站是：https://glumes.com

其实是博客域名在备案啦。

之前博客搭建用的是 Github Pages 方案，访问速度一直被人诟病。

上个月就决定把服务器换成阿里云了，访问速度如火箭般提升🚀🚀🚀~~

<!--more-->

下面是 ping glumes.com 的数据：

![](https://glumes2blog.oss-cn-shenzhen.aliyuncs.com/ping-glumes.com.png)

不到 10ms 的耗时，这可比 github 不知道高到哪里去了。

速度的提升，带来心情的愉悦，这也更有写博客的欲望了。

而且阿里云用户首次购买还是挺优惠的，我用的服务器是下面这个配置：

![](https://glumes2blog.oss-cn-shenzhen.aliyuncs.com/aliyun-server-type.png)

新用户只要一百多一年，一年三百六十五天，这么一算平均每天约等于不要钱呀。


如果你也想使用阿里云首次购买优惠的话，欢迎使用我的推广链接进行注册：

> https://www.aliyun.com/activity/daily/cloud?userCode=au8zjczl

使用如上链接登录购买主机商品，还能获赠云存储 OSS 和 MySQL 数据库哦。

---

当然，因为使用了阿里云，服务器位于国内，域名就必须要备案，提交资料审查。

咱这也是正经技术博客网站，域名备案也没啥，而且还能享受其他厂商的云存储服务，比如 七牛 或者 又拍云 的图床服务就要求域名备案才行。

就是要吐槽这个域名备案速度**太慢了**。

7 月 2 号提交的初审：

![](https://glumes2blog.oss-cn-shenzhen.aliyuncs.com/first-domain-check.png)


因为域名备案期间网站是不允许访问的，所以 7 月 2 号就关闭网站了。

中间需要把资料给阿里云审核人员进行初审，通过了再提交给工信部备案系统进行审核，审核通过后会受到一条短信告诉你备案号是多少。

然而我提交完资料等来的却是 **拒绝三连** 。

![](https://glumes2blog.oss-cn-shenzhen.aliyuncs.com/domain-notify.jpeg)


中间多次询问阿里云客服人员咋回事，明明初审过了，怎么还被接入商给退回来。

阿里云审核人员给的回复也是资料没问题，就是要再确认一下网站的用途，是否符合所说的个人技术博客，这当然是的啦~~

连续三次被驳回，就在要失去耐心之际，终于第四次管局审核通过了，拿到了我的备案号：

> 粤ICP备20067247号

这时候访问网站，也能在底部看到备案号的标识。

![](https://glumes2blog.oss-cn-shenzhen.aliyuncs.com/domain-mark.png)

耗时一个月，备案总算是过了。

阿里云有项服务就是备案用时多久，服务器就送多久，把服务器的时间也延长了一个月，这算是好消息了。

坏消息是网站关闭这段时间，暂停访问导致 Google 搜索一些关键词已经找不到我的网站了，之前做的 SEO 优化白费了。

早先用 Google 搜索 yuv 、vulkan 、camerax 等关键字，前五个结果里面必有一个是我的网站链接，现在估计搜不到了，看来以后还得多写干货，提高曝光度才行。

---

最后服务器搭建了。

服务器还是用的 Nginx，博客还是用的 Hugo 。

Hugo 生成的博客内容位于 public 目录下，把 Nginx 的网站目前改成 public 所在目录就行了。

不过为了在 Github 上备份一下博客内容，就需要用到 Github 的 WebHook 了。

大概操作就是在自己的服务器上监听 Github 仓库的提交 push 动作，一旦有了提交，就更新自己服务器的文件，从而达到更新网站的目的。

具体怎么操作就不阐述了，网上基本一搜一大把。

另外就是 https 服务，这个签名用阿里云免费的，在 Nginx 上配置一下，改监听端口就行。

还有，使用阿里云一定要记得修改安全组里面的设置，有些端口需要自己去修改规则手动开放的，别因为这个导致设置没有生效。


