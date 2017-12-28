---
title: "Android Material Desing 控件小结-2"
date: 2017-12-22T15:22:15+08:00
categories: ["android"]
tags: ["Android"]
---


总结一下 Material Design 控件使用。

<!--more-->


## CoordinatorLayout

CoordinatorLayout 作为一个顶层布局，能够协调它里面子控件的行为。

它需要与其他控件一起搭配才能发挥效果，例如：`AppBarLayout`、`CollapsingToolbarLayout`、`NestedScrollView` 等等。

## AppBarLayout

AppBarLayout 控件的功能让 标题栏内容 和 CoordinatorLayout 合作。AppBarLayout 包裹着 ToolBar 作为 AppBar ，这样就可以响应滑动操作。

``` sh
<CoordinatorLayout>
	<AppBarLayout>
		<Toolbar>
	</AppBarLayout>
	<RecyclerView>
</CoordinatorLayout>
```

如上代码所示，CoordinatorLayout 布局中包裹了两个布局。

要达到手势滑动的效果，在 CoordinatorLayout 布局下方必须包裹一个可以滑动的布局，比如 RecyclerView 或者 NestedScrollView，而 ListView 和 ScrollView 不具有滑动的效果。同时，还得在滑动的组件 xml 中添加如下属性：
``` java
 app:layout_behavior="@string/appbar_scrolling_view_behavior
```

滑动组件添加如上属性后，CoordinatorLayout 会根据传入的 Behavior 行为的类名，通过反射来实例化行为对象，这个属性对应的类是`AppBarLayout.ScrollingViewBehavior`。

有了可以滑动的布局，这样就可以响应它的滑动事件，根据它的上滑，下滑做出效果。

在 Toolbar 的 xml 布局中添加响应滑动的 Flag 。
``` java
app:layout_scrollFlags="scroll|enterAlways"
```

*	`scroll`：所有想要响应滑动的 View 都需要设置这个 Flag 。
*	`enterAlways`：当滑动组件向下滑动，都会导致该 View 可见，类似于快速返回的效果。
*	`enterAlwaysCollapsed`：当 View 设置了最小高度 minHeight 时，使用此标志，则滑动组件向下滑动时，View 会以最小高度出现，只有组件向下滑动到列表的顶部时，View 才会扩大到完整的高度。
*	`exitUntilCollapsed`：滚动退出屏幕，最后折叠在顶端。
*	`snap`：让控件变得有弹性，比如控件显示了 75%的高度，就会弹出显示出来，如果只有 25 显示，就会收缩隐藏起来，总之滑动动画不能停止住了。



## CollapsingToolbarLayout

顾名思义，CollapsingToolbarLayout 是用来包裹 Toolbar 的。

CollapsingToolbarLayout 包裹 Toolbar 时提供一个可折叠的 Toolbar，一般作为 AppbarLayout 的子视图使用。


CollapsingToolbarLayout 使用的布局大致如下：
``` java
<CoordinatorLayout>
	<AppBarLayout>
		<CollapsingToolbarLayout>
			<ImageView/>
			<Toolbar/>
		</CollapsingToolbarLayout>
	</AppBarLayout>
</CoordinatorLayout>
```

CollapsingToolbarLayout 也有很多属性要设置。例如滑动时的折叠效果，toolbar 被折叠到顶部固定时的颜色。

*	`Collapsing Title`：Toolbar 的标题，当 CollapsingToolbarLayout 全屏没有折叠时，Title 显示大字体，随着控件的折叠，title 不断变小。
*	`contentScrim`：Toolbar 被折叠到顶部固定时候的背景颜色。
*	`CollapseMode`：子视图的折叠模式，有两种：
	*	`pin`：固定模式，折叠之后固定在顶端。
	*	`parallax`：视差模式，在折叠的时候会有个视差折叠的效果，值越大，视察效果越大。
* `expandedTitleMarginStart`：设置扩张时候，也就是还没有收缩时，标题 title 向左填充的距离 。

当然，使用 CollapsingToolbarLayout 也可以不用来折叠 Toolbar ，用来单独去折叠一张图片也是可行的。

## NestedScrollView

当有些控件不能当做滑动控件使用时，则可以考虑使用 NestedScrollView 来包裹住。比如，当 TextView 中的文字数量够多，多到需要滑动才能阅读完时，就可以把 TextView 嵌套在 NestedScrollView 中，让 ToolBar 等控件响应滑动事件。

以上所有代码地址：[https://github.com/glumes/MaterialDesignLearn](https://github.com/glumes/MaterialDesignLearn)


## 参考

1. http://blog.csdn.net/xyz_lmn/article/details/48055919
2. http://blog.csdn.net/feiduclear_up/article/details/46514791
3. http://blog.csdn.net/RoseChan/article/details/51587058



