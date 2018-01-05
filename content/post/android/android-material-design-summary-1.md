---
title: "Android Material Desing 控件小结-1"
date: 2017-12-22T15:19:03+08:00
categories: ["android"]
tags: ["Android"]
comments: true
---

总结一下 Material Design 控件使用。

<!--more-->


## TextInputLayout

TextInputLayout 控件是一个容器，只接受一个子元素，而子元素需要是一个 EditText 控件。


TextInputLayout 的作用是当输入文字时，它可以把提示文字 Hint 移至 EditText 上方。

``` java
    <android.support.design.widget.TextInputLayout
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:layout_marginStart="8dp"
        app:layout_constraintLeft_toLeftOf="parent"
        android:layout_marginEnd="8dp"
        app:layout_constraintRight_toRightOf="parent"
        android:layout_marginTop="8dp"
        app:layout_constraintTop_toBottomOf="@+id/usernameLayout"
        android:id="@+id/passwordLayout"
        >

        <EditText
            android:id="@+id/password"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:hint="hint"/>
    </android.support.design.widget.TextInputLayout>
```

而当 EditText 中输入的内容不正确时，TextInputLayout 还能够进行错误的处理。`setError` 方法会在 EditText 下方显示红色的错误消息。`setErrorEnabled`方法开启错误提醒功能，使用代码如下：

``` java
 String username = mUsernameLayout.getEditText().getText().toString();
        String password = mPasswordLayout.getEditText().getText().toString();

        if (!username.equals(RIGHT_NAME)){
            mUsernameLayout.setError("not right username");
            Log.d(TAG,"not right username");
        }else if (!password.equals(RIGHT_PASSWORD)){
            mPasswordLayout.setError("not right password");
            Log.d(TAG,"not right password");
        }else {
            // 取消错误提醒
            mUsernameLayout.setErrorEnabled(false);
            mPasswordLayout.setErrorEnabled(false);
            Toast.makeText(TextInputActivity.this,"Welcome !",Toast.LENGTH_SHORT).show();
        }
```

## TabLayout

TabLayout 控件是用来和 ViewPager 配合使用的。当滑动 ViewPager 内部的页面时需要让上方的 Tab 也随之移动时就可以考虑使用 TabLayout 了。

使用 ViewPager 还需要对应的 Adapter ，简单使用代码如下：

``` java
   mTabPagerAdapter = new TabPagerAdapter(getSupportFragmentManager());

        mViewpager.setAdapter(mTabPagerAdapter);

        // 设置回调
        mViewpager.addOnPageChangeListener(new TabLayout.TabLayoutOnPageChangeListener(mTabLayout));
        // 设置 Tab 模式
        mTabLayout.setTabMode(TabLayout.MODE_FIXED);

        mTabLayout.setupWithViewPager(mViewpager);
```

初次之后，还可以给 TabLayout 设置各种属性，既可以从 XML 布局中添加，也可以在代码中通过 set 方法来设置，如下图所示：


![tablayout-attribute](http://7xqe3m.com1.z0.glb.clouddn.com/blog-tablayout-attribute.png)


## Toolbar

Toolbar 可以用来替换 ActionBar 的，如果要替换 ActionBar ，那么在使用时，需要配置 Activity 的 theme 为`Theme.AppCompat.NoActionBar`，或者在对应的主题中加入如下：
``` java
		<item name="windowActionBar">false</item>
		<item name="android:windowActionBar">false</item>
```

不然会报错`This Activity already has an action bar supplied by the window decor.`

并且在代码中还需要添加 `setSupportActionBar(toolbar);`。

如果当做单独的控件来使用则不需要对主题进行设置。


Toolbar 也有各种设置选项，包括标题，子标题，Logo，菜单等。

``` java
	mToolbar.setTitle("Title");
        mToolbar.setSubtitle("SubTitle");
        mToolbar.setNavigationIcon(R.mipmap.ic_drawer_home);
        mToolbar.inflateMenu(R.menu.toolbar_menu);
        mToolbar.setLogo(R.mipmap.ic_launcher);
```

其中，当想给 Toolbar 弹出的菜单设置样式时，可以通过 `popupTheme`属性来设置样式。popupTheme 的样式可以自定义 style ，也可以使用安卓自带的。



## 参考
1. http://blog.csdn.net/qiujuer/article/details/51462471
2. http://www.jcodecraeer.com/a/basictutorial/2015/0821/3338.html
3. http://www.jcodecraeer.com/a/anzhuokaifa/androidkaifa/2015/0731/3247.html
4. http://www.jianshu.com/p/79604c3ddcae
