---
title: Flutter 状态管理之 InheritedWidget 使用和分析
date: 2024-02-01T16:53:35+08:00
slug: flutter-inheritedwidget-usage-and-analysis
description: 状态管理应该是 Flutter 中的核心要点了。
tags:
  - Flutter
categories:
  - software-development
comments: true
draft: false
original: true
image: "https://image.glumes.com/image/trees.webp"
author: 星陨
---

## InheritedWidget 使用

初识 Flutter 的 Demo 是一个点击按键然后数字增加的小应用，这小应用就涉及到了 Flutter 中的状态管理，核心就是 `setState` 方法。


`setState` 方法用于通知 Flutter 更新 Widget 的状态，比如重建当前 Widget 及其子树，它是从上到下进行通知的，但作用域仅停留在当前的 `StatefulWidget` 范围内。

如果有两个同级的 `StatefulWidget` ，比如 WidgetA 和 WidgetB ，当 WidgetA 的数据发生改变，想要通知 WidgetB 对应改变。

如果是 Android 的应用开发，采用 MVP 模式的话，需要 Controller 同时持有 WidgetA 和 WidgetB ，当 WidgetA 状态改变时，通过 Controller 对应改变 WidgetB 相关状态就行了。

而在 Flutter 中基于 `InheritedWidget` 控件，通过相应的封装库就可以实现 MVVM 模式的开发，相当快捷方便。

通过如下的例子来学习 `InheritedWidget` 控件的使用：左边栏和右边栏是两个同级的 Widget  ，右边栏中点击修改名称，左边栏中显示对应的修改内容。


![](https://image.glumes.com/imageinheritedWidget-defaultName-1-small.webp)

因为 `InheritedWidget` 是从上到下进行数据共享、传递的，所以要把 InheritedWidget 作为根节点，需要共享数据的节点作为子节点。

通过继承 InheritedWidget 实现自定义的控件类：

```dart
class DataModelWidget extends InheritedWidget {
  const DataModelWidget(
      {super.key,
      required super.child,
      required this.name,
      required this.changeName});

  // 当数据发生改变时，才会通知到子控件
  @override
  bool updateShouldNotify(covariant DataModelWidget oldWidget) {
    return oldWidget.name != name;
  }

  // 定义 static 快捷方法，方便在子控件中获取共享数据
  // 当子控件通过 of 方法使用了 InheritedWidget 中的数据，注册依赖关系
  // 此时数据变动会触发 didChangeDependencies 方法
  static DataModelWidget? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<DataModelWidget>();
  }

  // 共享的数据
  final String name;
  final Function changeName;
}
```

要传递的数据就是 `name` 变量，在一个子控件中去修改 name 的值，在另一个子控件中显示修改内容。这里为了方便直接把要传递的数据放在了 Widget 里面，也可以封装对应的 Model 类，然后 Widget 持有 Model 类会更友好一些。

当数据发生改变时，会通过 `updateShouldNotify` 方法通知到子控件的 `didChangeDependencies` 方法。

`didChangeDependencies` 方法指的是子控件是否有依赖父 Widget 中 `InheritedWidget` 的数据，如果有就会响应回调。

子控件通过 `of` 静态方法获取 `InheritedWidget` 的时候调用了 `dependOnInheritedWidgetOfExactType` 方法，该方法会将 `InheritedWidget` 和获取数据的子控件进行注册，这才有了依赖关系。

`child` 参数就是接下来要写的子控件内容了。

```dart
class _DashboardState extends State<Dashboard> {
  String _name = "glumes";

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Row(
            children: <Widget>[
              // 初始化 InheritedWidget 并传递对应参数
              DataModelWidget(      
                name: _name,
                changeName: _changeUserName,
                child: const ContentBoard(),
              )
            ],
          ),
        ),
      ),
    );
  }
  // 右边栏调用 _changeUserName 方法修改共享数据的值
  void _changeUserName(String userName) {
    setState(() {
      _name = userName;
    });
  }
}
```

把子控件封装在 ContentBoard 中，分别是：

```dart
// 左边栏
Text("名称：${DataModelWidget.of(context)!.name}"),

@override
void didChangeDependencies() {
  super.didChangeDependencies();
  Log.d("left sidebar change dependencies");
}

// 右边栏
ElevatedButton(
  onPressed: () {
    DataModelWidget.of(context)!.changeName("change name ${count.toString()}");
    count++;
  },
  child: const Text("修改名称")),

@override
void didChangeDependencies() {
  super.didChangeDependencies();
  Log.d("right sidebar change dependencies");
}
```

由于左边栏和右边栏都调用到了 `of` 方法里的 `dependOnInheritedWidgetOfExactType` ，所以都注册上了依赖关系，`didChangeDependencies` 方法两边都会回调打印。

但是右边栏中并没有显示要共享的数据，只是内部改了它的值，实际上并不依赖 `InheritedWidget` 的数据，这时可以采用 `getElementForInheritedWidgetOfExactType` 方法获取 `InheritedWidget` ，它不会注册依赖关系，改造如下：

```dart
static DataModelWidget? of2(BuildContext context) {
  return context.getElementForInheritedWidgetOfExactType<DataModelWidget>()!.widget
      as DataModelWidget;
}
```

这样在右边栏中就不会响应 `didChangeDependencies` 的回调了。

回顾一下整体流程：在子控件右边栏中调用 `changeName` 方法改变了 `InheritedWidget` 中的数据，并且调用 `setState` 方法，触发了 `Widget` 的重建和刷新。而左边栏子控件中依赖了 `InheritedWidget` 中的数据，从而也随着刷新了。

## InheritedWidget 分析

重点分析 Flutter 三棵树和渲染流程以及 `InheritedWidget` 依赖关系的注册。

众所周知，Flutter 中有三棵树，Widget 树、Element 树、Render 树，如下图所示：

![](https://image.glumes.com/image/trees.webp)

Widget 树就是日常开发中写的内容，它是描述 UI 元素的配置信息，实际渲染的内容并不是和 Widget 树一一对应的，比如上图中 Render 树的节点明显比 Widget 树少很多，是因为有些 Widget 是不用渲染的。

Widget 树和 Element 树是一一对应的，Render 树和 Element 树中的 `RenderObjectElement` 是一一对应的。

Widget 树的构建成本非常低，所以在运行过程中会经常刷新，也就是调用 setState 方法来重建，但是 Render 树就不会那么频繁了，这中间就是通过 Element 树来作为沟通的桥梁。

Element 树会在页面重建时比较 Widget 树前后的数据状态，当 Widget 前后不一致时会新创建 Element 并更新 Render 树，如果只是 Widget 的数据发生了改变，则不需要重建 Render 树，只更改对应的数据就行。

Element 树中有两种基本类型，`ComponentElement` 和 `RenderObjectElement` 。其中 `ComponentElement` 不参与渲染，实际参与渲染的是 `RenderObjectElement` 。

关于 Element 类继承关系结构图可以参考如下：

![](https://image.glumes.com/image/Element-watermark.webp)

Render 树和 Widget 树不是一一对应的，因为有些 Widget 不需要渲染，比如 StatefullWidget 和 StatelessWidget ，而需要渲染的 Widget 都会继承自 RenderObjectWidget 。

比如上图中 Container 就继承自 StatelessWidget ，在 Render 树中没有对应的位置，是由它的 child Widget 来完成渲染操作的。

Text 同样继承自 StatelessWidget ，在 Render 树中没有对应的位置，是由内部的 RichText 来完成渲染的，而 RichText 继承自 MultiChildRenderObjectWidget ，间接继承 RenderObjectWidget 。

`RenderObjectWidget` 又可以细分两类：`MultiChildRenderObjectWidget` 和 `SingleChildRenderObjectWidge`t 。常见的 Row、Column、Text 都是继承 MultiChildRenderObjectWidget ，而 SizedBox、Center、Padding 都是继承 SingleChildRenderObjectWidget 。

关于 Widget 类继承关系结构图可以参考如下：

![](https://image.glumes.com/image/Widget-watermark.webp)

像 Container、Row、Text 这些 Widget 实际上是一些组合型的节点，最终返回的 Widget 是由 child Widget 来完成的，比如 Container 的 build 方法，最终返回的 current 都是其他的 Widget 。

```dart
// Container 的 build 方法
Widget build(BuildContext context) {
  Widget? current = child;

  final EdgeInsetsGeometry? effectivePadding = _paddingIncludingDecoration;
  if (effectivePadding != null) {
    current = Padding(padding: effectivePadding, child: current);
  }

  if (color != null) {
    current = ColoredBox(color: color!, child: current);
  }

  if (decoration != null) {
    current = DecoratedBox(decoration: decoration!, child: current);
  }

  if (constraints != null) {
    current = ConstrainedBox(constraints: constraints!, child: current);
  }

  if (margin != null) {
    current = Padding(padding: margin!, child: current);
  }

  if (transform != null) {
    current = Transform(transform: transform!, alignment: transformAlignment, child: current);
  }

  return current!;
}
```

渲染流程最早的起点是 main 函数里面的 `runApp` 方法，传入的参数并不是 Widget 树的根节点，而是根节点的子节点。

Widget 树的根节点是由 Flutter 框架定义的 `RootWidget` 。

```dart
void runApp(Widget app) {
  final WidgetsBinding binding = WidgetsFlutterBinding.ensureInitialized();
  binding
    ..scheduleAttachRootWidget(binding.wrapWithDefaultView(app))
    ..scheduleWarmUpFrame();
}

void scheduleAttachRootWidget(Widget rootWidget) {
  Timer.run(() {
    attachRootWidget(rootWidget);
  });
}

// 最终把传入的 Widget 挂到 RootWidget 下面
void attachRootWidget(Widget rootWidget) {
  attachToBuildOwner(RootWidget(
    debugShortDescription: '[root]',
    child: rootWidget,
  ));
}

// 创建 RootElement 
void attachToBuildOwner(RootWidget widget) {
  final bool isBootstrapFrame = rootElement == null;
  _readyToProduceFrames = true;
  _rootElement = widget.attach(buildOwner!, rootElement as RootElement?);
  if (isBootstrapFrame) {
    SchedulerBinding.instance.ensureVisualUpdate();
  }
}
```

在 attachToBuildOwner 方法内会创建 Element 树的根节点 `RootElement` 。

```dart 
@override
RootElement createElement() => RootElement(this);

RootElement attach(BuildOwner owner, [ RootElement? element ]) {
  if (element == null) {
    owner.lockState(() {
      element = createElement();
      element!.assignOwner(owner);
    });
    owner.buildScope(element!, () {
      element!.mount(/* parent */ null, /* slot */ null);
    });
  } else {
    element._newWidget = this;
    element.markNeedsBuild();
  }
  return element!;
}
```

RootWidget 的 createElement 会创建对应的 RootElement 。实际上每个 Widget 的 createElement 都会创建对应的 Element ，因为 Widget 树和 Element 树是一一对应的 。

接下来调用 Element 的 `mount` 方法将该 Element 挂载到 Element 树对应的位置上。因为是 RootElement ，所以 parent 和 slot 都是 null 。

```dart
// RootElement 的 mount 实现
void mount(Element? parent, Object? newSlot) {
  super.mount(parent, newSlot);
  _rebuild();
  super.performRebuild(); // clears the "dirty" flag
}

// Element 基类的 mount 实现
void mount(Element? parent, Object? newSlot) {
  // 更新 parent 和 slot 的状态
  _parent = parent;
  _slot = newSlot;
  _lifecycleState = _ElementLifecycle.active;
  _depth = _parent != null ? _parent!.depth + 1 : 1;
  if (parent != null) {
    // Only assign ownership if the parent is non-null. If parent is null
    // (the root node), the owner should have already been assigned.
    // See RootRenderObjectElement.assignOwner().
    _owner = parent.owner;
  }
  final Key? key = widget.key;
  if (key is GlobalKey) {
    owner!._registerGlobalKey(key, this);
  }
  _updateInheritance();
  attachNotificationTree();
}

void _updateInheritance() {
  _inheritedElements = _parent?._inheritedElements;
}
```

当 Element 第一次被添加到 Element 树的时候会触发 mount 方法。

不同 Element 的子类对于 mount 的实现有所不同，子类可以覆写 `update`、`visitChildren`、`insertRenderObjectChild`、`moveRenderObjectChild`、`removeRenderObjectChild` 这些方法，但共同点是都要调用基类的 mount 方法。

RootElement 的 mount -> _rebuild -> `updateChild` 方法，updateChild 的作用在注释中已经说的很清楚了。


|                     | **newWidget == null**  | **newWidget != null**   |
| :-----------------: | :--------------------- | :---------------------- |
|  **child == null**  |  Returns null.         |  Returns new [Element]. |
|  **child != null**  |  Old child is removed, returns null. | Old child updated if possible, returns child or new [Element]. |


```dart
Element? _child;

void _rebuild() {
  try {
    // RootElement 首次创建新的 _child 
    _child = updateChild(_child, (widget as RootWidget).child, /* slot */ null);
  }
}  

Element? updateChild(Element? child, Widget? newWidget, Object? newSlot) {
  final Element newChild;
  if (child != null) {
    // 省略一大串代码
  } else {
    newChild = inflateWidget(newWidget, newSlot);
  }
}
```

对于 RootElement 的第一次创建，child 肯定为 null ，直接调用 `inflateWidget` 来创建新的 Element 并赋值给 _child 变量。

在 Element 基类的 mount 实现中有个 `_updateInheritance` 方法，该方法将 `_inheritedElements` 指向父 Element 的 `_inheritedElements` 。

```dart
// Element 基类中定义的变量 _inheritedElements 和 _dependencies
PersistentHashMap<Type, InheritedElement>? _inheritedElements;
Set<InheritedElement>? _dependencies;

// Element 基类中的实现
void _updateInheritance() {
  _inheritedElements = _parent?._inheritedElements;
}
```

如果是 InheritedElement ，则除了将 _inheritedElements 指向父 Element 的 _inheritedElements ，还会添加或者替换类型为 widget.runtimeType 的 InheritedElement 为当前的 InheritedElement 。

```dart
// InheritedElement 类中的实现
void _updateInheritance() {
  final PersistentHashMap<Type, InheritedElement> incomingWidgets =
      _parent?._inheritedElements ?? const PersistentHashMap<Type, InheritedElement>.empty();
  _inheritedElements = incomingWidgets.put(widget.runtimeType, this);
}
```

如果 `InheritedElement` 的父类有多个类型为 `widget.runtimeType` 的 `InheritedElement` ，则都会替换成当前的这个，相当于子节点只能找到离它最近的那个 `InheritedElement` 。




比如 InheritedWidget 有个子类为 SharedDataWidget ，内部有个 String 类型的变量 name ，然后 Widget 树的结构为 SharedDataWidget(name = "A") -> SharedDataWidget(name = "B") -> Container -> Text(text = SharedDataWidget.name) ，此时 Text 显示的内容是字符串 B ，而不是 A 。



明确了 _inheritedElements 是从何而来的，接下来回到 `dependOnInheritedWidgetOfExactType` 和 `getElementForInheritedWidgetOfExactType` 这两个方法，它们都来自 `BuildContext` 抽象类，而 `Element` 正好继承了该抽象类。

`dependOnInheritedWidgetOfExactType` 注册依赖关系的实现如下，找到父节点的 `InheritedElement` ，然后实现双向的依赖。

```dart
@override
T? dependOnInheritedWidgetOfExactType<T extends InheritedWidget>({Object? aspect}) {
  // 如果 Widget 树上的父节点有 InheritedWidget ，那么 _inheritedElements 就不会为 null .
  final InheritedElement? ancestor = _inheritedElements == null ? null : _inheritedElements![T];
  if (ancestor != null) {
  // 当前节点和 InheritedWidget 注册依赖关系
    return dependOnInheritedElement(ancestor, aspect: aspect) as T;
  }
  _hadUnsatisfiedDependencies = true;
  return null;
}

@override
InheritedWidget dependOnInheritedElement(InheritedElement ancestor, { Object? aspect }) {
  _dependencies ??= HashSet<InheritedElement>();
  // 当前节点添加依赖的 InheritedElement
  _dependencies!.add(ancestor);
  // InheritedElement 同样也添加被依赖的节点
  ancestor.updateDependencies(this, aspect);
  return ancestor.widget as InheritedWidget;
}

// InheritedElement 更新依赖
class InheritedElement extends ProxyElement {

  final Map<Element, Object?> _dependents = HashMap<Element, Object?>();

  void updateDependencies(Element dependent, Object? aspect) {
    setDependencies(dependent, null);
  }

  void setDependencies(Element dependent, Object? value) {
    _dependents[dependent] = value;
  }
}
```

而 `getElementForInheritedWidgetOfExactType` 方法只是找到了父节点的 InheritedElement ，并没有注册依赖关系，不会回调 `didChangeDependencies` 方法。

```dart
@override
InheritedElement? getElementForInheritedWidgetOfExactType<T extends InheritedWidget>() {
  final InheritedElement? ancestor = _inheritedElements == null ? null : _inheritedElements![T];
  return ancestor;
}
```

注册依赖关系的作用体现在当调用 InheritedElement 的 `updated` 方法时会根据 `updateShouldNotify` 判断数据是否有更新，如果有则调用子节点的 `didChangeDependencies` 方法。


```dart
class InheritedElement extends ProxyElement {
  void updated(InheritedWidget oldWidget) {
    if ((widget as InheritedWidget).updateShouldNotify(oldWidget)) {
      // 调用基类 ProxyElement 的 updated 方法，从而调用 notifyClients 方法
      super.updated(oldWidget);
    }
  }

  // 通知被依赖的子节点有内容更新了，调用子节点的 didChangeDependencies 方法
  @override
  void notifyClients(InheritedWidget oldWidget) {
    for (final Element dependent in _dependents.keys) {
      notifyDependent(oldWidget, dependent);
    }
  }

  void notifyDependent(covariant InheritedWidget oldWidget, Element dependent) {
    dependent.didChangeDependencies();
  }
}

abstract class ProxyElement extends ComponentElement {
  void updated(covariant ProxyWidget oldWidget) {
    notifyClients(oldWidget);
  }
}

void didChangeDependencies() {
  markNeedsBuild();
}
```

didChangeDependencies -> markNeedsBuild 方法会标记当前 Element 需要重构，从而刷新对应的数据内容。


## 总结：

通过上面一大串的分析就梳理清楚了 `InheritedWidget` 的使用原理。

`Element` 在 `mount` 时会调用 `_updateInheritance` 方法，拿到父节点的 `_inheritedElements` 数据。

如果是 `InheritedElement` ，拿到父节点的 `_inheritedElements` 数据之外，还会将父节点某个类型的数据更改外自己所持有的。

`Element` 在调用 `getElementForInheritedWidgetOfExactType` 方法时，会根据拿到的父节点的 `_inheritedElements` 数据注册依赖关系，实现 `InheritedElement` 和 `Element` 的双向注册。

当 `InheritedWidget` 中的数据改变时，通过 `InheritedElement` 来通知对应的子节点，调用 `didChangeDependencies` 方法，标记需要重建，从而实现数据状态的刷新。

## 参考：

1. https://flutter.cn/docs/development/data-and-backend/state-mgmt/declarative
2. https://juejin.cn/post/6845166891539906574
4. https://www.jianshu.com/p/0f3bb5f6ed59
5. https://juejin.cn/post/6943515602191384613

