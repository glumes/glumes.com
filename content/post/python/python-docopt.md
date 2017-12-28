---
title: "Python 命令行参数解析工具 docopt"
date: 2017-12-22T16:08:45+08:00
categories: ["python"]
tags: ["Python"]
---


正如标题所言，docopt 是一个用来解析命令行参数的工具，当想要在 Python 程序后面附加参数时，就不需要再为此而发愁了。

docopt 是一个开源的库，代码地址：[https://github.com/docopt/docopt](https://github.com/docopt/docopt)。它在 README 中就已经做了详细的介绍，并且还附带了很多例子可供学习，这篇文章也是翻译一下 README 中内容......

<!--more-->

docopt 最大的特点在于不用考虑如何解析命令行参数，而是当你把心中想要的格式按照一定的规则写出来后，解析也就完成了。


## docopt 的实现简单分析

在 Python 中有这么一个属性 `__doc__`，它的值是字符串，一般表示帮助信息，而 docopt 正是利用了这一属性，把帮助信息替换成命令行参数解析说明，再对它进行解析即可。

举个 docopt 中的例子来说明：
``` python
"""Naval Fate.

Usage:
  naval_fate.py ship new <name>...
  naval_fate.py ship <name> move <x> <y> [--speed=<kn>]
  naval_fate.py ship shoot <x> <y>
  naval_fate.py mine (set|remove) <x> <y> [--moored | --drifting]
  naval_fate.py (-h | --help)
  naval_fate.py --version

Options:
  -h --help     Show this screen.
  --version     Show version.
  --speed=<kn>  Speed in knots [default: 10].
  --moored      Moored (anchored) mine.
  --drifting    Drifting mine.
"""
from docopt import docopt
if __name__ == '__main__':
    arguments = docopt(__doc__, version='Naval Fate 2.0')
    print(arguments)
```

上述代码段中，很大一段帮助信息就是我们的命令行参数解析说明，在函数入口处调用`docopt`函数进行解析，返回的`arguments`变量是一个字典型变量，它记录了选项是否被选用了，参数的值是什么等信息，当程序从命令行运行时，我们就是根据`arguments`变量的记录来得知用户输入的选项和参数信息。

所以如何写好命令行参数解析说明就变得至关重要了，命令行解析信息包含两部分，分别是使用模式格式和选项描述格式。

## 使用模式格式（Usage pattern format）

使用模式以`usage:`开始，以空行结束，如上代码段所示，它主要描述了用户添加命令行参数时的格式，也就是使用时的格式，解析也是按照此格式来进行的。

每一个使用模式都包含如下元素：
*	参数
参数使用大写字母或者使用尖括号`<>`围起来。
*	选项
选项以短横线开始`-`或者`--`。只有一个字母时格式`-o`，多于一个字母时`--output`。同时还可以把多个单字母的选项合并，`-ovi`等同于`-o`、`-v`、`-i`。选项也能有参数，此时别忘了给选项添加描述说明。

接下来是使用模式中用到的一些标识的含义，正确地使用他们能够更好的完成解析任务：
*	`[]`
代表可选的元素，方括号内的元素可有可无
*	`()`
代表必须要有的元素，括号内的元素必须要有，哪怕是多个里面选一个。
*	`|`
互斥的元素，竖线两旁的元素只能有一个留下
*	`...`
代表元素可以重复出现，最后解析的结果是一个列表
*	`[options]`
指定特定的选项，完成特定的任务。


## 选项描述格式（Option description format）

选项描述同样必不可少，尤其是当选项有参数，并且还需要为它赋默认值时。

为选项添加参数的格式有两种：
``` sh
-o FILE --output-FILE     # 不使用逗号，使用 = 符号
-i <file>, --input <file> # 使用逗号，不使用 = 符号
```

为选项添加描述说明，只需要用两个空格分隔选项和说明即可。

为选项添加默认值时，把它添加到选择描述后面即可，格式如下`[default: <my-default-value>]`
``` sh
--coefficient=K  The K coefficient [default: 2.95]
--output=FILE    Output file [default: test.txt]
--directory=DIR  Some directory [default: ./]
```

如果选项是可以重复的，那么它的值`[default: ...]`将会一个 `list`列表，若不可以重复，则它的值是一个字符串。

## 使用

理解了 使用模式格式 和 选项描述格式 之后，再配合给出的例子就能较好的理解了。

接下来就是得到输入的信息了。

在前面提到`arguments`参数是一个字典类型，包含了用户输入的选项和参数信息，还是上面的代码段例子，假如我们从命令行运行的输入是
``` python
python3 test.py ship Guardian move 100 150 --speed=15
```
那么打印`arguments`参数如下：

``` sh
{'--drifting': False,
 '--help': False,
 '--moored': False,
 '--speed': '15',
 '--version': False,
 '<name>': ['Guardian'],
 '<x>': '100',
 '<y>': '150',
 'mine': False,
 'move': True,
 'new': False,
 'remove': False,
 'set': False,
 'ship': True,
 'shoot': False}
```
从打印信息可以看到，对于选项，使用布尔型来表示用户是否输入了该选项，对于参数，则使用具体值来表述。

这样一来，程序就可以从`arguments`变量中得到下一步的操作了。若是用户什么参数都没输入，则打印`Usage`说明提示输入内容。






