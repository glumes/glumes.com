---
title: "Kotlin 使用 Anko 布局那些事"
date: 2017-12-22T10:21:26+08:00
tags: ["Android"]
---



学习 Kotlin 应该都或多或少听过 Anko 这个开源库。

使用 Anko 来构建界面会更加简单、快捷。

<!--more-->

毕竟以往的布局都是要从 XML 中解析出来，然后再到 LayoutInfalter 里面通过 Constructor.newInstance 反射创建出来的。而 Anko 则是直接创建 View，用代码构建布局，省去了解析 XML 的时间。


## 添加依赖

Anko 的 Github 仓库是：`https://github.com/Kotlin/anko`。

在 Github 仓库的 README 上关于如何添加依赖已经写的很详细了，把要添加的选择性复制粘贴就好了。

Anko 包括四个部分内容：

*	Anko Commons
	*	轻量级的一些帮助类，比如 intent，dialog，logging 等等，其实就是对安卓一些类：Activity、Fragment、Intent 等添加扩展函数。
*	Anko Layouts
	*	动态布局用的最主要的库，将许多 Android 的控件 View 转换成了 Anko 加载的形式。
	*	由于 Android 还有其他的控件库，因此 Anko 也对那些库进行了拓展支持，可以选择添加对应的依赖库。
	*	当然，还可以根据需要对自定义 View 进行改造，让它们也支持 Anko 加载的形式。
*	Anko SQLite
	*	用于 Android SQLite 数据库的查询的库
*	Anko Coroutines
	*	基于 `kotlinx.coroutines` 协程的一个工具库。


## 创建简单布局

使用 Anko 创建布局很简单：

``` kotlin 
class AnkoActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        relativeLayout {
            button("button in center") {
                textSize = sp(18).toFloat()
                onClick {
                   longToast("you click button")
                }
            }.lparams {
                centerInParent()
            }
        }
    }
}
```

效果如下：

![Anko 创建简单界面](http://7xqe3m.com1.z0.glb.clouddn.com/blog_kotlin_anko_simple_ui.png)

在 `relativeLayout` 代码块里我们构建了当前的界面，并把它应用到了 Activity 中。

在这里，并没有使用熟悉的 setContentView 方法，这是因为 Anko 会自动将布局界面 View 设置到 Activity 中。

`relativeLayout`代码块就是 Anko 的主要使用方法。

`relativeLayout` 作为一个容器，在里面添加了一个 `button`，`button` 控件的第一个大括号里设置了它的一些属性和事件，在 `lparams` 大括号里设置了它在相对于容器的一些参数。

就是这样简单的写法完成了界面布局，如同写 xml 文件一样，只要在父容器里面按照排列写好子控件的参数和位置就好。


多实践几次就可以熟练这种写法，通过 Anko 来创建一个登陆界面：

``` kotlin 
	verticalLayout {
            padding = dip(8)
            val account = textView("account") {
                id = R.id.account_text
                textSize = sp(12).toFloat()
                // 设置自己的属性
            }.lparams() {
                // 设置布局的参数
            }
            var name = editText() // 也可以什么都不设置，使用默认的设置
            textView("password") {
                id = R.id.password_text
                onClick {
                    account.setText("change account")
                }
            }
            var pwd = editText {
                hint = "input"
            }.lparams(
                    width = dip(100), 
                    height = ViewGroup.LayoutParams.WRAP_CONTENT
            )
            button("login") {
                onClick {
                    if (name.text.toString().equals("name") 
	                    && pwd.text.toString().equals("pwd")) {
                        longToast("login....")
                    } else {
                        longToast("login failed")
                    }
                }
            }
        }
```

效果如下：

![anko_login_ui](http://7xqe3m.com1.z0.glb.clouddn.com/blog_kotlin_anko_login_ui.png)


## 使用 AnkoComponent 接口创建界面

除了直接在 Activity 里面写布局，还可以使用 AnkoComponent 接口创建布局，这样就可以将界面代码和 Activity 的代码分离了。


``` kotlin
class MyActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?, persistentState: PersistableBundle?) {
        super.onCreate(savedInstanceState, persistentState)
        MyActivityUI().setContentView(this)
    }
}

class MyActivityUI : AnkoComponent<MyActivity> {
    override fun createView(ui: AnkoContext<MyActivity>) = with(ui) {
        verticalLayout {
            val name = editText()
            button("Say Hello") {
                onClick { ctx.toast("Hello, ${name.text}!") }
            }
        }
    }
}
```

需要创建我们的界面类，实现 `AnkoComponent` 接口，在 `createView`方法中返回我们的界面。

最后在 `setContentView` 方法中实际调用的也是 `createView` 方法，返回界面布局，然后再由上面提到的，Anko 会自动把布局填充到 Activity 中。

这里使用到了 Kotlin `with` 的语法糖，使用 `with`，则返回的是最后一行的内容，正好 verticalLayout 就是最后一行的内容。

也可以把它转换一下，使用 `apply` 的语法糖，最后返回的调用该方法的对象，再接着返回该对象的 view 就好了。

``` kotlin
class MyActivityUI : AnkoComponent<MyActivity> {
    override fun createView(ui: AnkoContext<AnkoActivity>) = ui.apply {
        verticalLayout {
            val name = editText()
            button("Say Hello") {
                onClick { ctx.toast("Hello, ${name.text}!") }
            }
        }
    }.view
}
```


## Fragment 中加载界面

在 Fragment 中添加界面稍有不同。

创建  Activity，将 Fragment 添加上来。

``` kotlin
class AnkoFragmentActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        linearLayout {
            id = R.id.fragment_id
            supportFragmentManager.beginTransaction().replace(id, AnkoFragment.newInstance()).commit()
        }
    }
}
```

``` kotlin
class AnkoFragment : Fragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
//        return inflater.inflate(R.layout.fragment_anko, container, false)
        return UI {
            verticalLayout {
                editText()
                button("OK")
            }
        }.view
    }

    companion object {
        fun newInstance(): AnkoFragment {
            return AnkoFragment()
        }
    }
}
```

在 Fragment 的 onCreateView 方法中不在使用 inflater 来加载布局，而是直接使用 `UI` 函数来完成，返回最后的 View 即可。其中 `UI` 也是对 Fragment 的一个拓展函数。


## 自定义 View 的加载


除了 Anko 自带以及支持的控件之外，还可以让自定义的 View 也支持 Anko 的加载方式，在 Anko 的代码块中去更改自定义 View 的设置属性。

比如，自定义 View ，绘制一个矩形：

``` kotlin 
public class RectangleView extends View {
    public int size ;
    public Paint mPaint;
    public RectangleView(Context context) {
        super(context);
        mPaint = new Paint();
        mPaint.setColor(Color.RED);
        mPaint.setAntiAlias(true);
        mPaint.setStrokeWidth(2);
        mPaint.setStyle(Paint.Style.STROKE);
    }
    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        setBackgroundColor(Color.BLUE);
        canvas.drawCircle(getMeasuredWidth() / 2, getMeasuredHeight() / 2, size, mPaint);
    }
}
```

其中，size 变量就是要改变的属性，它控制着圆的半径。

让自定义 View 支持 Anko 的加载方式，还需要添加如下的拓展函数：

``` kotlin
inline fun ViewManager.rectangleView(init: RectangleView.() -> Unit): RectangleView {
    return ankoView({ RectangleView(it) }, theme = 0, init = init)
}
```

由该拓展函数来返回我们的 Rectangle View ，至于这其中是如何实现的，暂时不做深究，下篇文章再来探讨。

最后就可以像使用其他控件一样来添加到布局中了。

``` kotlin
    //加载自定义的 View
        relativeLayout {
            var view = rectangleView {
                id = R.id.custom_view_id
                size = 300  // 自定义 View 的属性设置
            }.lparams {
                width = ViewGroup.LayoutParams.MATCH_PARENT
                height = dip(200)
                centerInParent()
            }

            button("change size") {
                onClick {
                    view.size = Random().nextInt(200) + 100
                    view.invalidate()
                }
            }.lparams {
                below(view)
                centerHorizontally()
            }
        }
```

效果如下：

![anko_custom_view](http://7xqe3m.com1.z0.glb.clouddn.com/blog_anko_custom_view.png)

点击按键来更改圆的半径大小。

## Anko 配合 RecyclerView 的使用

使用 Anko 来构建一个下拉刷新的 RecyclerView 布局。

写法依旧简单：

``` kotlin 
       swipeRefreshLayout {
            setColorSchemeColors(Color.RED, Color.BLUE, Color.GREEN)
            onRefresh {
                mainHandler.postDelayed(Runnable {
                    isRefreshing = false
                }, 3000)
            }
            recyclerView {
                layoutManager = LinearLayoutManager(SampleApp.mContext)
                setHasFixedSize(true)
                adapter = Adapter(dataList)
            }
        }
```

直接在 recyclerView 布局里面设置好相应的 LayoutManager 和 Adapter 就好了。

同时还能够在 swipeRefreshLayout 里面处理刷新的事件，在三秒后更改刷新状态，从而停止刷新就好了。

源码参考 Github 地址：[https://github.com/glumes/AndroidKotlinSample](https://github.com/glumes/AndroidKotlinSample)

## 不足

Anko 好是好，但是依旧不够完美。

在 XML 中能够设置的控件属性更多，更精确的控制布局状态，而 Anko 在构建简单界面的时候才显得快速、便捷。

而且 Anko 支持的控件有限，加载自定义的控件还得添加额外的代码，在更复杂的应用中应该不太会广泛的使用。


## 参考

1、https://github.com/Kotlin/anko/wiki/Anko-Layouts

