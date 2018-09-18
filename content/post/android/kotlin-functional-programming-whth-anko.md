---
title: "Kotlin 函数式编程与 Anko 构建布局实现原理分析"
date: 2017-12-22T10:26:57+08:00
categories: ["android"]
tags: ["Android","Kotlin"]
comments: true
original: true
addwechat: true
---



之前讲到了如何在 [Kotlin 开发中使用 Anko 构建布局](http://www.glumes.com/kotlin-anko-usage/)。

这一篇将是分析其原理。

<!--more-->

在分析其实现原理之前还是要补一下 Kotlin 函数式编程的相关知识：

## 函数式编程

之前有写过一篇文章介绍 Python 的函数式编程。

函数式编程并不是哪门语言所独有的，它是一种编程范式，就像面向对象编程一样。

在函数式编程中，函数是作为一等公民存在的。Kotlin 也可以使用函数式编程。

最直接的表现就是可以声明一个变量，它的类型就是函数。

``` java
    val arg = fun(a:Int,b:Int) = a+b // 变量 arg 是一个函数类型
    println(arg)    // 打印类型 (kotlin.Int, kotlin.Int) -> kotlin.Int
    println(arg(1,2))    // 调用该函数，打印结果为 3
```

对应函数类型的变量，如果在后面添加了小括号`()`则表示调用该函数，没有则当做变量来使用。

接下来介绍 Kotlin 的几个例子：

### 拓展函数

拓展函数是 Kotlin 中比较灵活的东西了，可以给类添加各种各样的拓展函数。

最常见的就是给 Context 添加 Toast 的拓展函数。

``` java
	fun Context.showToast(msg: String) {
	    Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
	}
	// Activity 中调用
   override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        showToast("this is toast")
    }
```

注意 **子类可以调用父类的拓展函数**。

``` java
open class A
class B:A()
fun A.add(a:Int,b:Int):Int{
    return a + b
}
// 子类调用父类的拓展函数
fun main(args: Array<String>) {
    println(B().add(1,2))
}
// 输出 3 
```


## Lambda 表达式

Kotlin 对 Lambda 表达式添加了好多语法糖。

一个 Lambda 表达式是一个 `函数字面值`，即一个未声明的函数，但立即作为表达式传递。

Lambda 表达式的语法应该都很熟悉的：

1、Lambda 表达式总是被大括号括着。
2、在 `->` 符号之前是参数，参数类型可以省略
3、在 `->` 符号之后是函数体

### 若 Lambda 表达式没有指定返回类型，函数体的最后一个表达式视为返回值

如果 Lambda 的返回类型不是 Unit，那么该 Lambda 主体中的最后一个表达式会视为返回值。

就比如在 Kotlin 中使用 while 语句，while 中不能再使用赋值表达式了。

``` java
while( (i=2) < 3) {}  // while 中不能执行 i = 2 的操作了
```

上述代码在 Kotlin 中是编译不过的了，这个时候就可以使用 Lambda 表达式。

``` java
 while ({ i=4; i }() > 0){ } // 使用 lambda 表达式，最后还要添加小括号（），表示调用该函数
```

因为没有指定类型，所以最后的变量 `i`被视为了返回值，在添加小括号表示调用，就实现了将`i`赋值并且与 0 进行判断的比较。

### 最后一个参数是 Lambda 表达式可以放在圆括号之外

如果函数的最后一个参数是一个函数，并且你传递一个 Lambda 表达式作为相应的参数，那么可以在圆括号之外指定它。

比如有如下函数，它只有一个参数，当然就是最后一个参数了。

``` java
fun passLambda(init:() -> Int){
    println("lambda expression as argument")
    println(init())
}

fun main(args: Array<String>) {
	// 在圆括号之内调用的方式
    val args = fun() :Int = 2 // 声明一个函数作为变量
    passLambda(fun():Int = 2)
    passLambda(args)
    // 使用 Lambda 表达式在圆括号之外的调用
    passLambda { -> 3 }    // 没有参数可以直接省略
    passLambda { 3 }       // 直接省略箭头
}
```

### Lambda 表达式只有一个参数，使用 `it` 替代

如果函数字面值只有一个参数，那么可以把它连同`->`一起省略掉，直接用`it`来代替。

``` java
fun singleArgument(init: (a:Int) -> Int){ // 作为参数的函数只有一个参数
    println("use it to replace single argument")
    println(init(3))
}

fun main(args: Array<String>) {
    // 常规的调用，传递一个 lambda 表达式，需要定义好参数和函数体
    singleArgument { a: Int -> a+1 }
    // 使用 it 代替只有一个参数的情况，省略了去定义一个参数的情况，直接定义函数体
    singleArgument { it + 1 }
}
```

## 带接收者的函数字面值

Kotlin 提供了使用指定的 **接收者对象** 调用函数字面值的功能。

在函数字面值的**函数体**中，可以调用该接收者对象上的方法而无需任何额外的限定符，这就类似于拓展函数。

带接收者的函数字面值的表达形式如下：

``` java
class ReceiveObject // 定义一个类作为接收者对象
fun exec(init: ReceiveObject.() -> Int){}
fun exec(init: ReceiveObject.(a:Int) -> String){}
fun exec(str:String,init: ReceiveObject.(a:Int,b:Int) -> Int){}
```

可以看到，与之前的函数定义不同的是，在 函数的参数 前多加了一个类型 ReceiveObject ，这个类型就是指定的接受者对象。有点像是给这个类添加了拓展函数。

``` java
class ReceiveObject{
    fun show(){
        println("access")
    }
}
fun exec(init: ReceiveObject.() -> Int){
    val receObj = ReceiveObject()
    receObj.init() // 接收者对象调用函数字面值，调用方法一,类似于拓展函数的调用
}

fun exec(init: ReceiveObject.(a:Int) -> String){
    val receObj = ReceiveObject()
    init(receObj,3) // 接收者对象调用函数字面值，调用方法二，在函数字面值中传入接收者对象
}

fun exec(str:String,init: ReceiveObject.(a:Int,b:Int) -> Int){
    println(str) // 并没有让 接收者对象调用函数字面值 
}

fun main(args: Array<String>) {
    exec {   -> this.show() ;4 } // 在函数体内调用了 接收者对象 的 show 方法
    exec { a:Int -> println(a.toString());a.toString() } // 没有指定返回类型，返回最后一个表达式
    exec("print"){      // 最后一个参数的 Lambda 表达式，可以放在圆括号之外
        a: Int, b: Int -> this.show()
        a+b
    }
}
```

当接收者类型可以从上下文推断时，Lambda 表达式可以用作带接收者的函数字面值。

这个语法糖特性对于实现 Anko 构建布局至关重要。

> 在函数体内部可以调用接收者对象的方法，那么假若这个方法又是带接收者类型的方法，那么就可以不断的往下调用了。


举个简单的例子：

``` java
class Html{
    fun body(init:Body.() -> Unit){}
    fun head(init:Head.() -> Unit){}
}

class Body{
    fun p(init:P.() -> Unit){}
    fun h1(init:H1.() -> Unit){}
}

class Head{
    fun title(init:Title.() -> Unit){}
}

class Title
class P
class H1

fun html(init:Html.() -> Unit){}

fun main(args: Array<String>) {
    html {
        // body 和 head 函数都是属于函数体内的调用
        body {
            p {  } // p 和 h1 也是属于 Body 内部的函数调用
            h1 {  }
        }
        this.head {  } // this 指接收者 Html 对象
    }
}
```

上面的结构就是调用接收者对象中的方法，而该方法又有其他的接收者对象，如此循环往下。

结合上面提到的语法糖小特性，再来理解这段代码就清晰多了，也能够更好的理解 Anko 构建布局的实现方式。



## Anko 构建布局实现分析


有了上面 Kotlin 基础知识的补充，分析 Anko 的实现方式，把对应的特性和语法糖联系起来就好了。

再来看一个 Anko 实现布局的代码：

``` kotlin
	verticalLayout {
		textView("hello,Anko")
        button()
    }
```

相信这时候再看源码就很简单了。

``` kotlin
inline fun Activity.relativeLayout(init: (@AnkoViewDslMarker _RelativeLayout).() -> Unit): android.widget.RelativeLayout {
    return ankoView(`$$Anko$Factories$Sdk25ViewGroup`.RELATIVE_LAYOUT, theme = 0) { init() }
}

inline fun ViewManager.textView(text: CharSequence?): android.widget.TextView {
    return ankoView(`$$Anko$Factories$Sdk25View`.TEXT_VIEW, theme = 0) {
        setText(text)
    }
}
```

`verticalLayout`是  Activity 的一个拓展函数，它的接收者对象是 `_RelativeLayout`类，而`_RelativeLayout`类正好是继承自 `RelativeLayout`的。

`RelativeLayout`作为一个 ViewGroup 的子类，它也实现了`ViewManager`接口。

而 `textView`和`button`同样是作为拓展函数存在的，只不过它们是对 `ViewManager` 的拓展。

这样一来，就可以在 `verticalLayout`函数中去调用 `textView`和`button`等函数了，因为上面提到过：

子类可以调用父类的拓展函数，可以在函数体内调用接收者对象的方法而无需任何限制。

其他的一些 View 的控件基本都大同小异了，对于我们的自定义 View 也要把它当做 ViewManager 的拓展函数来实现。


理解了 Anko 像层级一样的实现方式，接下来就是看它如何把界面添加到 Activity 上去。

`verticalLayout`拓展函数最终返回的是一个 `ankoView`。

``` kotlin
// verticalLayout 函数实现
inline fun Activity.verticalLayout(theme: Int = 0, init: _LinearLayout.() -> Unit): LinearLayout {
    return ankoView(`$$Anko$Factories$CustomViews`.VERTICAL_LAYOUT_FACTORY, theme, init)
}

// ankoView 函数实现
inline fun <T : View> Activity.ankoView(factory: (ctx: Context) -> T, theme: Int, init: T.() -> Unit): T {
    val ctx = AnkoInternals.wrapContextIfNeeded(this, theme)
    val view = factory(ctx)
    view.init()
    AnkoInternals.addView(this, view)
    return view
}
```
在 ankoView 函数中，第一个参数`factory`是一个函数，并且指定了返回类型，在这里就是 `verticalLayout`。它是由 `Anko.Factories.CustomViews` 这样一个工厂类来提供的。

第三个参数则是带有接收者对象的函数，由 `factory`函数生成 View 之后再调用 `init` 函数。当 view 调用 init 函数之后，我们那些 textView 、button 等拓展函数才会被真正调用。

而最后则是通过 `AnkoInternals` 这个单例类来完成将界面添加到 Activity 中。

它的 addView 方法如下：

``` kotlin
	fun <T : View> addView(activity: Activity, view: T) {
	        createAnkoContext(activity, { AnkoInternals.addView(this, view) }, true)
	}
	// 第二个参数是带接收者类型的函数
    inline fun <T> T.createAnkoContext(
            ctx: Context,
            init: AnkoContext<T>.() -> Unit,
            setContentView: Boolean = false
    ): AnkoContext<T> {
        val dsl = AnkoContextImpl(ctx, this, setContentView)
        dsl.init()
        return dsl
    }

```

实际调用的是 `createAnkoContext` 方法，传入的第二个参数`init`还是一个带接收者类型的函数，只不过这个函数没有参数，而且也不要求返回什么。

最终是由`AnkoContextImpl`调用了`init`函数，`AnkoContextImpl`是`AnkoContext`是一个子类。

`init`函数是实际内容是` AnkoInternals.addView(this, view)`。

这里参数 `this`比较重要，因为`init`函数是一个带接收者类型的函数，所以这里的`this`指的就是接收者类型`AnkoContext`。

``` kotlin 
    fun <T : View> addView(manager: ViewManager, view: T) {
        return when (manager) {
            is ViewGroup -> manager.addView(view)
            is AnkoContext<*> -> manager.addView(view, null)
            else -> throw AnkoException("$manager is the wrong parent")
        }
    }
```

当`init`被调用时，实际调用的就是上面的代码，在`when`语句中，因为 manager 参数正好是 `AnkoContext`类型，最终进入到第二个 case 中去。

由于`manager`参数代表了接收者类型，而我们使用的接收者类型是 `AnkoContextImpl`，所以最后的添加布局工作代码在 `AnkoContextImpl` 类中。
 
``` kotlin
    override fun addView(view: View?, params: ViewGroup.LayoutParams?) {
        if (view == null) return
        if (myView != null) {
            alreadyHasView()
        }
        this.myView = view
        if (setContentView) {
            doAddView(ctx, view)
        }
    }
    
    private fun doAddView(context: Context, view: View) {
        when (context) {
            is Activity -> context.setContentView(view)
            is ContextWrapper -> doAddView(context.baseContext, view)
            else -> throw IllegalStateException("Context is not an Activity, can't set content view")
        }
    }
    
    open protected fun alreadyHasView(): Unit = throw IllegalStateException("View is already set: $myView")
```

上述代码就比较简单理解， 先判断之前是否添加过，没有则添加，有则报错。

到这里，就分析完了 Anko 类似层级一样的调用方式以及将布局界面添加到 Activity 中去。

至于 Anko 是如何将一个 View 添加到一个 ViewGroup 中去的，也是大同小异了。

## 总结

学习一门语言最好的方式之一就是看他人的优秀代码了。

Kotlin 的语法糖不理解到位了，还是会有点绕的，但是理解了之后，还是觉得挺有意思的，或许能够开拓自己写代码的一种思路，要是能在工程实践中灵活运用就更好了。










