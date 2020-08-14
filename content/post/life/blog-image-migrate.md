---
title: "博客图床迁移记"
date: 2019-05-02T21:21:40+08:00
subtitle: ""
tags: ["Python"]
categories: ["life"]
comments: true
bigimg: [{src: "https://image.glumes.com/images/2019/05/02/WechatIMG513.jpg", desc: ""}]
draft: false
original: true
---

> 微博图床一时爽，迁移火葬场


前几天在群里看到说新浪微博图床挂掉了，图床上的图片链接单独访问还可以，但是在博客文章上就显示不出来了。

去自己网站上看一下，果然，连博客首页图片都加载不出来了，极大地影响了阅读体验呀。

还好图片链接是可以访问的，这就意味着图片还在，还来得及做迁移和备份。

回顾之前用了好多免(hao)费(yang)图(mao)床，从最早的 [七牛](https://www.qiniu.com/)，到 [Cloudinary](https://cloudinary.com/)，再到 微博图床。七牛由于是临时域名，没有及时备份图片，导致图都没了，而 [Cloudinary](https://cloudinary.com/) 和 微博图床 倒还是可以继续访问的。不过这种薅羊毛总不是个办法，万一服务商政策变了，又得再迁移图片了。

果然，免费的才是最贵的。

<!--more-->

## 利用 VPS 搭建图床

考虑到还有个 VPS 主机每个月都在续费呢，并且 15 G 的存储空间和 1T 的流量也完全够用了，就在 VPS 上面搭建 [自己的图床](https://image.glumes.com/) 。


正式搭建之前，还有一些准备工作，首先就是要有自己的 VPS ，如果你也想使用 [Vultr](https://www.vultr.com/) 的主机，可以通过如下的链接进行注册，获得 $50 的优惠~~~

```sh
https://www.vultr.com/?ref=7845784-4F
```

将自己的域名解析到服务器地址，同时还需要安装配置好 `Nginx`、`PHP` 等环境。

服务器的配置可以使用 [LNMP一键安装包](https://lnmp.org/) 一键安装包。

域名的话，我在万网注册的，但是 DSN 解析使用的是 [cloudflare](https://www.cloudflare.com/) ，这样就可以使用 `HTTPS` 了，由于我是在子域名上搭建的图床程序，所以还得在 [cloudflare](https://www.cloudflare.com/) 中添加子域名的解析才行。

完成以上工作，就可以利用 [Chevernote](https://chevereto.com/) 程序来搭建图床了。

Chevernote 的安装过程还是比较简单的，基本上按照步骤就好了，中间可能要设置一些权限问题和 `Nginx` 配置。


## 自动迁移图片到 Chevernote 图床

安装好 Chevernote 之后就可以开始将图片迁移到图床上了。

Chevernote 有个 API 接口，正好可以通过图片链接，将图片上传到图床上，通过这个接口就能搞定迁移了，前提的要拿到自己的 api key 。

```sh
// 通过该接口上传图片
GET http://mysite.com/api/1/upload/?key=12345&source=http://somewebsite/someimage.jpg&format=json
```

简单地写了个 Python 脚本来实现自动替换：

```python
import os
import re
import requests

class ReplaceImage:

    path = ''
    lineNum = 0
    s = r'http[s]?://(?:ws1.sinaimg.cn|res.cloudinary.com)/.*?(?:jpg|png)'
    subpath = ''
    key=''
    upload_url = ''
    failednum = 0
    payload = {'key': key, 'source': upload_url, 'format': 'json'}

    website = 'https://image.glumes.com/api/1/upload/'

    def __init__(self):
        self.url_re = re.compile(self.s)

    def search(self, path,key):
        self.path = path
        self.handleDir(path)
        self.key = key

    def handleDir(self, path):
        dirs = os.listdir(path)
        for d in dirs:
            subpath = os.path.join(path, d)
            if os.path.isfile(subpath) and subpath.endswith(".md"):
                self.handleFile(subpath)
            elif os.path.isdir(subpath):
                self.handleDir(subpath)

        print("program end")

    def handleFile(self, fileName):
        print("\n")
        print("start read file %s..." % fileName)
        self.subpath = fileName

        f = open(fileName, 'r+')
        self.lineNum = 1
        data = ""
        while True:
            line = f.readline()
            if not line:
                break
            line = self.replaceImage(line)
            self.lineNum = self.lineNum + 1
            data += line
        f.close()

        with open(fileName, "w+") as f:
            f.writelines(data)

    def replaceImage(self, line):

        searchResult = self.searchImage(line)

        if not searchResult:
            return line
        oldline = line

        for result in searchResult:
            replace_url = self.uploadImage(result)
            line = self.replaceLine(line, result, replace_url)

        print("before replace is %s" % oldline)
        print("after replace is %s" % line)

        return line

    def searchImage(self, line):
        if self.url_re.search(line):
            all_search = search.url_re.findall(line)
            return all_search
        else:
            return []

    def replaceLine(self, line, search, url):
        return line.replace(search, url)

    def uploadImage(self, url):

        print("start uploadImage and file name is %s line num is %d..." % (self.subpath, self.lineNum))

        self.payload['source'] = url
        r = requests.get(self.website, self.payload)
        res = r.json()

        statuscode = res['status_code']

        if statuscode == 400:
            print("upload failed and code is %d and msg is %s" % (statuscode,res['error']['message']))
            print("upload image failed is %s and linenum is %d" % (url, self.lineNum))
            self.failednum += 1
            return url
        else:
            print("upload success and code is %d" % statuscode)
            print("upload img %s to %s" % (url, res['image']['url']))
            return res['image']['url']

if __name__ == "__main__":
    search = ReplaceImage()
    print("please input dir path and api key:\n")
    dir = input("dir:")
    key = input("key:")
    search.search(dir, key)
```

实现思路也比较简单：

1. 首先是要遍历给定目录中的所有文件夹和文件。
2. 逐行读取文件内容，然后利用正则表达式匹配 Cloudinary 和微博图床的图片链接，找到该行中符合条件的链接。
3. 再使用 `requests` 库做网络请求，向 Chevernote 的 API 发送 GET 请求，解析返回的 JSON 数据，得到上传图床后的链接。
4. 将该行中匹配的图片链接替换成上传图床后得到的链接，并写入文件中。
5. 读取完当前文件后，重复步骤二，继续读取文件，直到读取结束。


代码的实现也比较简单，主要就是一个正则表达式的匹配了：

```python
    s = r'http[s]?://(?:ws1.sinaimg.cn|res.cloudinary.com)/.*?(?:jpg|png)'
```

使用上面的表达式，就可以匹配到想要的内容，要注意在括号 `()` 表示或的匹配前面有 `?:` ，否则拿到的匹配内容不对。


执行上述的代码，输入正确的文件地址和 api key，然后等待一段时间，就完成了上传到图床并自动转换的功能。


## 不足之处

用自己的图床也有不足之处，除了访问速度没有国内的图床速度快，还有就是万一 VPS 挂了，那图床又 GG 了，一个方案就是：把 GitHub 当做备份的图床。


因为图片是存储在 VPS 具体目录下的，可以把图片所在目录当做工程，然后上传到 Github ，万一哪天 VPS 挂了，就把文章中的链接替换成 Github 上的链接就好了。




