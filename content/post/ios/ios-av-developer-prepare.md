---
title: "iOS 音视频开发的一些基础准备工作"
date: 2020-11-17T00:22:12+08:00
subtitle: ""
tags: []
categories: ["android"]
comments: true
draft: false
original: true
---

最近在捣鼓 iOS 上的音视频开发，由于之前并没有 iOS 开发经验，直接上手写代码的话压力还是挺大的，因此也趁机看了下 iOS 开发的内容，算是做一些准备工作吧。

<!--more-->

iOS 开发语言用的是 Swift ，一些语法和 Kotlin 还是挺像的，上手难道小了很多，而且也实在受不了 OC 的中括号 `[]` 调用方式，写不习惯。

在应用开发上，新手入门当然就是学习调用各种控件了。像 Button、Label 这样的单控件都还比较简单，看看就会。像 UITableView、UINavigationViewController 这些复合控件就相对复杂了，需要实际练练手才行，包括 XCode、StoryBoard 等工具的使用，也需要有一定的熟练度才好。这也是本篇文章的主要目的了，通过博客记录的形式来提高熟练度。

基础准备工作就先从界面编程开始吧，能折腾出一个简单的应用。至于更深层次的 iOS 应用生命周期、性能优化、图形图像那些就等后面碰到了再研究吧。


## iOS 应用创建和移除 SceneDelegate

当前使用的 XCode 版本是 12.1 ，创建 iOS 应用默认使用了 SceneDelegate ，这里用不上它，先把它移除了。

![](https://image.glumes.com/blog_image/ios-simple-app.png)

步骤如下：

* 删除 SceneDelegate.swift 文件
* 在 Info.plist 文件里面移除 Application Scene Manifest
![](https://image.glumes.com/blog_image/remove-scene-manifest.png)
* 删除 AppDelegate.Swift 中的 connectingSceneSession 和 didDiscardSceneSessions 方法。
* 在 AppDelegate.swift 中添加 UIWindow 变量。

```sh
@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

}
```

## UITableView 的使用

从 UITableView 开始搞起。在默认的 Main.storyboard 对应的 ViewController 里面添加一个 UITableView 类。

然后通过 Auto Layout 将它铺满整个应用，这个时候启动应用的话会显示黑屏的，因为没有给它填充数据。

UITableView 通过 UITableViewDataSource 和 UITableViewDelegate 分别来控制它的数据和交互逻辑。

其中 UITableViewDataSource 有如下方法是必现要实现的，指定要展示的数据内容和 TableView 中 Item ，而 UITableViewDelegate 就没强制要求实现方法了，至于协议中的其他方法都可以查看具体源码，有具体的应用场景再使用了。

```sh
func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        <#code#>
}  

func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        <#code#>
}
```

通过 `extension` 语法来实现以上两个协议：

```sh
func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return 100;
}

func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "reuse", for: indexPath)
    cell.textLabel?.text = "hello tableview"
    return cell
}
```

这里要指定 StoryBoard 中的 UITableView 对应单元格的 `Identifer` ，它代表了 TableView 中单元格的复用标识，`dequeueReusableCell` 方法就是通过这个字符串标识来复用的。

![](https://image.glumes.com/blog_image/reuse-identifier.png)

TableView 的复用逻辑类似于 Android 中的 RecyclerView 了，都是复用移出屏幕外的单元格来节省内存的。

最后在 StoryBoard 中将 UITableView 与 ViewController 建立起关联，并给 UITableView 指定具体协议的实现。

```sh
    @IBOutlet weak var mTableView: UITableView!
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        mTableView.dataSource = self
        mTableView.delegate = self
    }
```

这个时候再启动应用就能看到 TableView 中充满内容了。

![](https://image.glumes.com/blog_image/tableview-display-success.png)

当然，这里也省略了很多内容。比如自定义单元格样式、通过代码来添加 UITableView 等。

## UITableView 跳转详情页和返回

在实现了 UITableView 的基础上，继续开发实现点击某个单元格跳转到详情页并返回的功能。

在 Main.storyboard 中添加一个 ViewController ，并添加一个 Label，一个 Button，分别展示内容和返回。

完成详情页的展示如下：

![](https://image.glumes.com/blog_image/table-detail-view-controller.png)


接下来要实现 UITableView 到详情页的跳转，通过 Segue 的方式进行连接。

### Segue 使用

iOS 实现页面跳转有多种方式，比如 UINavigationController、UITarBarController 等控制器，或者在 StoryBoard 上进行连线。

#### Segue 跳转到详情页 

连线的方式也比较简单，鼠标点击要连接的控件，然后按住 Control 键拖曳到另一个 ViewController 上，在弹出的 Segue 页面中选择跳转样式。

![](https://image.glumes.com/blog_image/viewcontroller-segue-style.png)

这里面有多种样式可以选择：

* Show
* Show Detail
* Present Modialy
* Present As Popover
* Custom

简单点直接选择了 Show 就行了，连接后的样子如下：

![](https://image.glumes.com/blog_image/segue-style-show.png)

这时候直接运行程序就能在 TableView 中点击某一项跳转到详情页了，接下来就是要从详情页返回到 TableView 界面。


#### Segue 实现详情页返回

按照上面的逻辑，在详情页的 Back 按键上建立 Segue 就会返回了。但是这样会新建一个 ViewController 而不是返回到之前使用的，来回操作点击的话，不断新建页面，最终导致内存可能暴涨。


这里要用到 Unwind Segue 方法了。在 DetailViewController 中添加如下方法：

```sh
@IBAction func unwindSegue(segue: UIStoryboardSegue) {
    NSLog("Back to Table View Controller!")
}
```

然后，点击详情页的 Back 按键，再按住 Control 键拖曳到 TableView 对应 ViewController 的 Exit 方法处，会弹出上面写的 unwindSegue 方法，点击该方法即可建立连接。

![](https://image.glumes.com/blog_image/segue-exit-unwindsegue.png)

这时候再运行应用，就能实现 TableView 到详情页的跳转了，点击 Back 按键返回到 TableView 界面，输出上面的 log 内容，并且不建立新的 ViewController 。


### Segue 数据传递

当想在 ViewController 之间传递数据的话，也可以通过 Segue 进行，它提供了一些方法。

```sh
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(nullable id)sender API_AVAILABLE(ios(5.0));
```

通过实现 prepareForSegue 方法达到数据传输的目的。

```sh
override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
    if segue.identifier == "toDetailView" {
        let cv = segue.destination as! DetailViewController
        cv.str = "data"
    }
}
```

在 Segue 进行跳转的时候，prepare 方法是必定会执行的，通过实现该方法就能传递数据了。

当然，还有其他的一些方法去传递数据，这里就不阐述了。

## UINavigationController 使用

使用 UINavigationController 比较简单，在 Editor 菜单下面的 Embed In 选择 Navigation Controller ，就自动将 TableView 嵌入到 UINavigationController 里面去了。


![](https://image.glumes.com/blog_image/embed-in-navigation.png)

这时再运行程序就能看到效果了，上层多了一个导航栏。


### NavigationItem 设置

上层看到的导航栏叫做 NatigationItem ，它有很多属性可以配置，如下图所示：

![](https://image.glumes.com/blog_image/navigationItem-design.png)

可以设置左右按键名称和事件，可以设置中间的标题，还可以设置上层的提示内容以及背景颜色。

```sh
self.navigationItem.prompt = "loading" 
self.navigationController?.navigationBar.barTintColor = UIColor.yellow;

// 这里的 Button 其实是 UIBarButtionItem，要注意类型
let leftItem = UIBarButtonItem(title: "left", style: UIBarButtonItem.Style.done, target: self, action: #selector(leftAction))        
let rightItem = UIBarButtonItem(title: "right", style: UIBarButtonItem.Style.done, target: self, action: #selector(rightAction))
self.navigationItem.leftBarButtonItem = leftItem
self.navigationItem.rightBarButtonItem = rightItem

self.navigationItem.title = "NavigationItem"
```

对应的左右按键事件代码如下：

```sh
@objc func leftAction(){
    print("click left action")
}
    
@objc func rightAction(){
    print("click right action")
}
```

这里只是简单地定义了一下样式，还可以弄得更加复杂花哨一点，比如带有图片的 UIBarButtonItem，自定义的 UIBarButtonItem 等。

注意的是，当在 StoryBoard 中嵌入了 UINavigationController 之后，就可以通过 self.navigationController 来引用它了，如果没有嵌入，直接引用会 Crash 的。

在详情页 DetailViewController 中同样能够通过 self.navigationController 来修改 NavigationItem 的样式。

### 通过 NavigationController 实现页面跳转

除了使用 Segue 之外，还可以使用 NavigationController 来实现页面跳转，先把之前添加的 Segue 移除掉。


NavigationController 是一个管理 UIViewController 的容器，以栈的形式进行管理，提供相应的方法如下：

```sh
// 将 ViewController 压入栈中
open func pushViewController(_ viewController: UIViewController, animated: Bool)

// 弹出栈顶的 ViewController
open func popViewController(animated: Bool) -> UIViewController?

// 弹出到指定的 ViewController
open func popToViewController(_ viewController: UIViewController, animated: Bool) -> [UIViewController]?

// 弹出除 root ViewController 之外的所有 ViewController
open func popToRootViewController(animated: Bool) -> [UIViewController]?

// 返回只读属性的栈顶 ViewController
open var topViewController: UIViewController? { get }

// 返回栈中当前可见的界面对应的 ViewController，也是只读属性
open var visibleViewController: UIViewController? { get }

// 返回栈中所有的 ViewController
open var viewControllers: [UIViewController]
```

实现页面跳转，要做的就是在 TableView 的 Item 点击事件中将详情页的 ViewController 压入栈中，然后在详情页 ViewController 的 Back 事件中进行出栈，把当前 ViewController 弹出栈顶，回到 TableView 界面。


代码如下，在点击事件中进行初始化 ViewController ，并压入栈中。

```sh
func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        
    let storyboad = UIStoryboard(name: "Main", bundle: nil)
        
    let vc = storyboad.instantiateViewController(identifier: "detailvc")  as! DetailViewController
    vc.str = "data"
    
    self.navigationController?.pushViewController(vc, animated: false)
}
```

在 Back 按键的点击事件中进行出栈操作。

```sh
@IBAction func back(_ sender: Any) {
    self.navigationController?.popViewController(animated: true)
}
```

此时再运行代码，同样也能实现页面跳转，并且还传递了数据过去，和使用的 Segue 的效果基本一致。


## 小结

通过以上简单的小例子，就基本算是了解 iOS 开发了。

内容比较浅显，很多东西还是可以再继续拓展一下的，比如 TableView 中自定义单元格样式、通过代码来加载 NavigationController 等等。不过相信有了上面的基础，再到实践中去学习一些新的技巧也会更加快捷了。


其实 iOS 和 Android 还是有不少相似之处的，毕竟都是移动平台上的应用开发，在一些设计思想有相同之处也不奇怪，比如 TableView 的回收之处、屏幕适配的布局约束等等，这也是要求程序员在学习的时候不仅能够知其然还要知其所以然，学会举一反三，这样再换到其他平台上去学习也能够得心应手，而不是疲于追赶技术。


接下来就是进击 iOS 音视频开发啦~~~
