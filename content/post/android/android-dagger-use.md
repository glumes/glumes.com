---
title: "Dagger2 在 Android 中的使用"
date: 2017-12-22T10:47:52+08:00
tags: ["Android"]
---

Dagger2 是一个进行依赖注入的框架，早先是由 Square 公司写的，后来由 Google 来维护了，能由 Google 亲自维护的东西，肯定值得学习。

<!--more-->

有些有经验的开发者一听到 Dagger2 具有依赖注入的功能，即使早先并没有了解过这个框架，都能大概知道它是干嘛的，其原因可能就在于他们比较了解 `依赖注入` 这个概念，并且知道它在日常开发中所起到的功能吧，尽管不同的框架所进行注入的方式不一样。

所谓依赖，简单说来就是指一个类 A 的成员变量是其他类 B ，那么这个类 A 就依赖着成员类 B ，若没有类 B ，类 A 的某些功能就实现不了了。

所谓注入，简单说来就是如何把一个类 B 注入到类 A 中去，也就是初始化类 B ，给它赋值，可以选择在类 A 的构造函数中传入这个类 B ，也可以在类 A 中 new 一个类 B 。

而 Dagger2 的功能也就是把你的目标类 A 中所依赖的其他类 B 都初始化赋值了，也就是注入进去。

具体的使用情况，可以参考我写的代码：https://github.com/glumes/AndroidOpenSourceCollection 。

## APT 工具

早先看过 Hongyang 大牛的[博客文章](http://blog.csdn.net/lmj623565791/article/details/39269193) 说的就是依赖注入，采用反射的方式来处理自定义的注解，将 View 控件进行初始化。然而，采用反射的方式却是比较消耗性能的，毕竟反射的操作是在运行时 RUNTIME ，所以为了提高性能，可以将注解声明为 编译时 的 `@Retention(RetentionPolicy.CLASS)`，这样就可以利用 APT 工具在编译阶段完成 注解 的解析了。比如，经常用到的 ButterKnife 注解就用到了 APT 技术，是时候研究学习一波 APT 相关的内容了。

而 Dagger2 也是利用了 APT 工具在编译阶段生成注入代码的，具体的原理解析还得接着继续学习，先学习如何使用。



## 配置

在 Project 的 build.gradle 中添加：
``` gradle
classpath 'com.neenbedankt.gradle.plugins:android-apt:1.8'
```
在 app module 的 build.gradle 中添加：
``` gradle
apply plugin: 'com.neenbedankt.android-apt'

dependencies {
    // apt command comes from the android-apt plugin
    apt 'com.google.dagger:dagger-compiler:2.7'
    compile 'com.google.dagger:dagger:2.7'
    provided 'javax.annotation:jsr250-api:1.0'
}
```
点击 Sync Now 即可完成配置。

## @Inject 的简单注入

Dagger2 最简单的注入就是使用 `@Inject` 注解完成注入。

俗话说，有出才有入。既然是注入，那么必然要有一个容器来放我们注入的东西，这个容器也就是需要注入的 目标类 。而被我们注入到容器中的东西，也就是被注入的 依赖。这样一来，我们就有了注入的源头和目的地。可是，我们还少了一样东西，就是用来注入的工具，有了这样工具，我们才可以从注入的这一头走向注入的另外一头。

用一张简单的图片表示如下：

![simple-inject](http://7xqe3m.com1.z0.glb.clouddn.com/blog-simple-inject.png)


而我们使用 @Inject 注解完成一个最简单的注入，把一个 Activity 作为需要注入的目标类，在它里面有个成员变量是 Student 类的一个对象，我们不使用 new 的方式来初始化这个对象，而是采用 注入 的方法来初始化它。

这样一来，我们首先就得编写 Student 类。
``` java
public class Student {
    private String name ;

    @Inject
    public Student( ) {

    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
```
在这里，我们在 Student 类的构造函数上添加一个 @Inject 注解，因为既然我们不采用 new 的方式来初始化一个类了，那么当进行注入的时候，就调用有 @Inject 注解的构造方法来初始化一个类，这样我们就有了注入的源头。

在 Activity 中我们同样采用 @Inject 注解来表明哪个成员变量需要采用注入的方式来提供依赖。

``` java
public class MainActivity extends AppCompatActivity {
    
    @Inject
    Student student;
         ....
}
```

到此，我们就有了注入的源头和注入的目的地，也就是上面图片中的两头，还缺少一个进行注入的工具。

Dagger2 中提供了 `@Component` 注解作为注入器完成我们的注入工作，使用 @Component 注解，我们可以定义一个接口作为注入器，将所需的依赖注入到目标容器中。
``` java
@Component()
public interface StudentComponent {
    void inject(MainActivity mainActivity) ;
}
```
所有的注入器都是以接口的形式来定义的，接口中添加注入的方法，一般都是以 inject 作为命名的，注入方法中的参数就是需要进行注入的容器，也就是目标类，在这里就是我们上面的 MainActivity 。这样一来，注入器就将我们需要进行注入的依赖和注入的容器联系在了一起。

然而，仅仅到这里还是不行的，毕竟我们只是写了注解而已，还没到进行注解解析的那一步。这时候就需要用到了我们上面提到的 APT 工具，在编译阶段注入代码。

运行 Gradle projects 中的 assembleDebug 进行编译，此时会在 `build/generated/source/apt/debug/component` 目录下生成真正用来注入的工具类 DaggerStudentComponent 。它的命名一般采用的 DaggerXXX 的方式，后面的 XXX 为我们定义的 Component 接口名称。当 APT 工具在编译时我们生成了这个类之后，就可以用它进行注入了，用法有点类似 ButterKnife 。

在 MainActivity 的 onCreate 方法中添加如下代码完成注入：
``` java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
	// build 之后在注入
    DaggerStudentComponent.builder().build().inject(this);

}
```

此时，当我们再次编译代码时，成员变量 student 就已经完成了注入，当调用它的 setName 方法时，student 变量并不为 null ，说明我们已经将它注入并且初始化了。


## @Module 注入

当我们的项目中用到了第三方类库，比如 Retrofit 之类的，就不能在构造方法中加上 @Inject 注解了，此时就可以使用 @Module 注解来将第三方类库封装起来，作为一个模块来注入。

例如，我们要注入 Retrofit ，就可以在 Module 里面进行一次封装，HttpModule 里面封装了和 HTTP 请求相关的类，这些类大多是第三方类库里面提供的。

``` java
@Module
public class HttpModule {
	@Provides
    Retrofit provideRetrofit(OkHttpClient client,Gson gson){
        return  new Retrofit.Builder()
                .client(client)
                .addConverterFactory( GsonConverterFactory.create(gson))
                .addCallAdapterFactory(RxJavaCallAdapterFactory.create())
                .baseUrl(BASE_URL)
                .build();
    }
}
```

当采用 Module 的方式注入时，Component 里面的东西也要相关的进行更改了，要在 Component 里面添加我们的 Module 的内容。
``` java
@Component(
        modules = {
                HttpModule.class
        }
)
```
这样，在 Activity 里面有用到 Retrofit 实例时只需要添加 @Inject 注解，再使用 Dagger 完成注入即可。

### Dagger 依赖注入规则

当然了，上面提到的只是最基础的 Dagger 注入方式，Dagger 具体的依赖规则如下：

Dagger2 提供依赖的规则：
*	步骤一：查找 Module 中是否存在创建该类的方法。
*	若存在创建类的方法，查看该方法是否存在参数。
	*	若存在参数，则按步骤一开始依次初始化每个参数
	*	若不存在参数，则直接初始化该类实例，一次依赖注入到此结束。
*	若不存在创建类的方法，则查找 Inject 注解的构造函数，看构造函数是否存在参数。
	*	若存在参数，则从步骤一开始依次初始化每个参数。
	*	若不存在参数，则直接初始化该类实例，一次依赖注入到此结束。


根据上述规则可以得知，我们需要注入的类若不是第三方类库提供的，并不一定都在 Module 里面包含，可能就在它的构造方法上添加了 @Inject 注解就行了。


另外，根据`面向接口编程`的思想，我们在需要注入的类上声明的可能是一个接口类型，而提供了却是它的实现类型。这个过程同样也可以用 Module 来完成，只需要 Module 的 provide 方法返回类型为接口类型，而实际 return 的类型为实现类型即可，比如最简单的返回 Context 类型。

``` java
@Module
public class ActivityModule {

    private Activity mActivity ;
    public ActivityModule(Activity activity) {
        mActivity = activity;
    }

    @Provides
    @ActivityScope
    Context provideContext(){
        return this.mActivity ;
    }

}
```


##@Component 继承和依赖


当有些 Module 是基础、公共的 Module 时，每个 Component 都需要它时，就可以考虑偷个懒，把它们抽离出来成公共的 Module 了，有两种方式，分别是继承`Subcomponent`和依赖`dependencies`。


### Component 的继承 Subcomponent
``` java
// 使用 Subcomponent 注解
@Subcomponent( 
        modules = {
                FragmentModule.class,

        }
)
public interface FragmentComponent {
    void inject(InfoFragment fragment);

}
```


当使用 Subcomponent 注解时，该 Subcomponent 会拥有它的父 Component 的所有内容，但同时还需要在父 Component 中声明它的子 Component 组件。
``` java
@Component(
        modules = {
                AppModule.class,
                HttpModule.class,
                GankApiModule.class
        }
)
public interface AppComponent {
	// 声明 子 Component
	FragmentComponent getFragmentComponent();
}

```

### Component 的依赖 dependencies

``` java
@Component(
	// 声明依赖
        dependencies = AppComponent.class ,
        modules = {
                FragmentModule.class,
        }
)
public interface FragmentComponent {
    void inject(InfoFragment fragment);
}
```
当使用依赖 `dependencies` 方式时，该 Component 就不能拥有父 Component 的所有内容了，只能拥有父 Component 提供给它的那些内容。

``` java
@Component(
        modules = {
                AppModule.class,
                HttpModule.class,
                GankApiModule.class
        }
)
public interface AppComponent {
	// 提供内容给依赖它的那些 Component 使用
    Application application();

    OkHttpClient okHttpClient();

    Gson gson();

    Retrofit retrofit();

    GankApiService gankApiService();
}
```


## @Scope 注解定义作用域

众所周知，在开发中有些类是需要保持单例的，不需要实例化多次，就比如网络请求功能的类。

而 Dagger 也提供了 `@Singleton`注解来实现单例功能。只需要在 Component 中声明`Scope`注解，并且在 Component 使用到的 Module 中声明同样的注解即可。

``` java
// 使用 Scope 注解
@Scope
@Documented
@Retention(RUNTIME)
public @interface Singleton {}
```
``` java
// 单例注解
@Singleton
@Component(
        modules = {
                AppModule.class,
                HttpModule.class,
                GankApiModule.class
        }
)
public interface AppComponent {
}
```
在使用到的 Module 中声明同样的注解，标明相同的作用域。
``` java
@Module
public class GankApiModule {

    public GankApiModule() {
    }

    @Provides // 方法以 Provide 开头，增加代码的可读性
    @Singleton // 使用与 Component 同样的 Scope 标明作用域
    GankApiService proviceGankApiService(Retrofit retrofit) {
        return  retrofit.create(GankApiService.class);
    }
```
这样一来，使用了注解之后，在 Dagger 编译生成的 Component 中提供的我们所需要的类就是一个单例了，每次都是提供那个缓存的类，而不会再次去生成那个类。

如此一来，就可以考虑使用`Scope`注解来标明注入依赖的作用域了。

比如，Application 的作用域是和应用程序的生命一样长的，那么在 Application 中声明的网络请求类当然就是和整个应用声明周期一样长了，另外，我们还可以把那些需要和应用声明周期一样长的类都放在 Application 里面。

同样，若我们的类只需要和 Activity 或者 Fragment 的生命一样长就行了，那么就可以自定义一个注解来标明：
``` java
// 标明 Activity 作用域
@Scope
@Retention(RetentionPolicy.RUNTIME)
public @interface ActivityScope {
}
// 标明 Fragment 作用域
@Scope
@Retention(RetentionPolicy.RUNTIME)
public @interface FragmentScope {
}
```

事实上，我们自定义的 `ActivityScope` 和 `FragmentScope` 与`Singleton`注解的作用是一样的，在 Dagger 生成的 Component 代码中只是提供一个单例，关键就是这个单例的的存活时间和 Component 一样长，而 Component 依附于 Activity 或者 Application ，所以 Dagger 注入提供的类就和 Activity 或者 Application 一样长了。

假如有这么一种需求，Dagger 注入提供的类的生命，即不需要和 Application 一样长，也不需要和 Activity 一样短，它的生命只需要存活于某几个 Activity 之间即可了，那么我们同样可以考虑使用 Dagger ，在某几个 Activity 序列开始的时候提供依赖注入，并且使用一个公共的 Component 来提供它，然后在某几个 Activity 序列结束时才终止掉 Component ，这样就完成了局部的作用域了，参考文章：`http://frogermcs.github.io/building-userscope-with-dagger2/`。

![userscope](http://7xqe3m.com1.z0.glb.clouddn.com/userscope-ddf.png)


### Scope 注解使用注意事项

两个 Component 间有依赖关系，不能使用相同的 `scope` 。

使用 `Subcomponent`，Subcomponent 用于拓展原有的 Component，同时，也将产生一种副作用，Subcomponent 同时具备两种不同生命周期的 scope ，Subcomponent 具备了父 component 的 scope，也具备了自己的 scope 。

通过 Subcomponent ，子 Component 好像就同时拥有了两种 Scope，当注入的元素来自父 Component 的 Module，则这些元素会缓存在父 Component ，当注入的元素来自子 Component 的 Module，则这些元素会缓存在子 Component 中。



*	Component 关联的 Model 中任何一个被构造的对象有 scope ，则该整个 component 要加上这个 scope 。
*	Component 的 dependencies 与 component 自身的 scope 不能相同，即组件之间的 scope 不同。
*	Singleton 的组件不能依赖其他的 scope 组件，只能其他 scope 的组件依赖 Singleton 的组件
*	没有 scope 的不能依赖有 scope 的组件。

	
## 参考

1. http://yeungeek.com/2016/04/27/Android%E5%85%AC%E5%85%B1%E6%8A%80%E6%9C%AF%E7%82%B9%E4%B9%8B%E4%BA%8C-Annotation-Processing-Tool/
2. https://github.com/codepath/android_guides/wiki/Dependency-Injection-with-Dagger-2
3. http://frogermcs.github.io/building-userscope-with-dagger2/
4. https://github.com/glumes/AndroidOpenSourceCollection









