---
title: "Java 中的静态代理和动态代理"
date: 2018-08-28T22:55:49+08:00
subtitle: ""
tags: ["Java"]
categories: ["android"]
comments: true
draft: false
original: true
addwechat: true
---
代理模式的使用场景如下：

> 当无法或不想直接访问某个对象或访问对象存在困难时可以通过一个代理对象来间接访问，为了保证客户端使用的透明性，委托对象与代理对象需要实现相同的接口。


<!--more-->

在 Android 代码中经常会看见代理模式的存在，尤其是在 Binder 跨进程通信方面。比如 Activity 与 ActivityManagerService 的通信，Activity 拿到的就是 ActivityManagerService 的代理对象 ActivityManagerProxy ，由这个代理对象去执行跨进程通信。

而 ActivityManagerProxy 和 ActivityManagerService 又实现了同样的接口 `IActivityManager`。ActivityManagerService 是抽象类 ActivityManagerNative 的子类，ActivityManagerNative 实现了 `IActivityManager`接口。

代理模式的作用就是为其他对象提供一种代理以控制对这个对象的访问。而在 Android 代码中，这个代理大多通过跨进程的方式来访问了。

## 静态代理

Java 的静态代理实现比较简单，就是一个代理对象持有了被代理对象的引用。

```java
	// 被代理的类
    RealSubject real = new RealSubject();
    // 静态代理
    ProxySubject proxySubject = new ProxySubject(real);
    proxySubject.visit();
```

另外，代理对象和被代理对象都要实现相同的接口或者继承相同的父类。

```java
	// 定义接口
	public interface ISubject 
	// 被代理对象实现接口
	public class RealSubject implements  ISubject
	// 代理对象实现接口
	public class ProxySubject implements ISubject
```

由于是静态代理，我们的代码在运行前编译， Java 的 `class`文件就会创建，然而， 一旦需要代理的类多了，就需要为每一个类都编写一个代理类，也就是生成了多个`class`文件。这样创建的静态代理还不如直接编写代码了，毕竟都是要生成文件的。

因此，为了解决上述问题，就可以考虑在程序运行时动态地生成代理的对象，在编译阶段不需要知道谁代理了谁，而 Java 也提供了一个便捷的动态代理接口 `InvocationHandler`，实现该接口需要重写其调用方法`invoke`。

## 动态代理

`Proxy` 类提供了用于创建动态`代理类`和`代理对象`的静态方法，它也是所有动态代理类的父类。

如果在程序中为一个或多个接口动态地生成实现类，就可以使用 Proxy  `getProxyClass` 方法来创建动态代理类。

如果需要为一个接口或多个接口动态地创建实例，也可以使用 Proxy `newProxyInstance` 方法来创建动态代理实例。

### 创建动态代理类

```java
private static Class<?> getProxyClass(ClassLoader loader, Class<?>... interfaces)
```

该方法创建一个动态代理类所对应的 Class 对象，该代理类将实现 `interfaces`所指定的多个接口，第一个参数`ClassLoader`指定生成动态代理类的类加载器。

定义如下接口，动态创建的代理类要实现该接口。

```java
public interface SampleInterface {
    void showMessage();
}
```

通过 `getProxyClass` 方法创建动态代理类：

```java
        Class proxyClass = Proxy.getProxyClass(
                SampleInterface.class.getClassLoader(), new Class[]{SampleInterface.class}
                );
```

然后在通过反射去创建动态代理类的一个实例对象：

```java
		// 得到的构造函数 getConstructor 带有参数，newInstance 也有参数
        SampleInterface proxy = (SampleInterface) proxyClass
                .getConstructor(new Class[]{InvocationHandler.class})
                .newInstance(new Object[]{handler});
```

此时实例化动态代理类的一个对象需要传递一个参数，它必须实现了 `InvocationHandler` 接口的参数。

```java
InvocationHandler handler = new SampleInvocationHandler();

public class SampleInvocationHandler implements InvocationHandler {
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.printf("Sample InvocationHandler \n");
        return null;
    }
}
```

我们通过 getProxyClass 创建了类，并且这个类实现了指定的接口，那么这些接口的调用就是由 `InvocationHandler` 来实现的。

在 `invoke` 方法里面，我们要根据 `method` 和 `args` 等参数来判断当前调用是对应接口的哪个方法，从而执行对应方法。

### 创建动态代理对象实例

```java
public static Object newProxyInstance(ClassLoader loader, Class<?>[] interfaces, InvocationHandler h)
```

该方法创建一个动态代理对象，该代理对象的实例实现了 `interfaces`指定的系列接口，执行代理对象的每个方法时都会被替换成`InvocationHandler`对象的`invoke`方法。

下面就是一个简单示例：

首先定义一个代理接口：
```java
public interface IDynamicProxy {
    void show();
}
```

然后，通过 `newProxyInstance` 方法来创建代理对象实例，其中第一个参数是类加载器，第二个参数是要实现的接口，最后的 `InvocationHandler` 对象就是当调用代理对象实现的那个接口方法时，都会通过它的 `invoke` 方法来调用到具体的对应方法。

`invoke` 方法也是通过 `method` 和 `args` 参数来判断具体对应的接口方法是哪一个。


```java
        IDynamicProxy proxy = (IDynamicProxy) Proxy.newProxyInstance(
                IDynamicProxy.class.getClassLoader(), new Class<?>[]{IDynamicProxy.class
        }, new InvocationHandler() {
            @Override
            public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                System.out.printf("invoke\n");
                if (method.getReturnType() != Void.class){
                    System.out.printf("return void");
                }
                return 1;
            }
        });
        proxy.show();
```

当通过 `newProxyInstance` 创建对象之后，就可以直接调用接口方法了。


## 小结

通过动态代理来创建代理类或者代理对象，有一个公共点就是都需要创建 `InvocationHandler` 类来执行具体的方法调用，并且在 `invoke` 方法里面通过 `method` 和 `args` 来区分具体调用的方法。

 