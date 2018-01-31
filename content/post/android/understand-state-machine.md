---
title: "理解状态机"
date: 2018-01-31T15:20:14+08:00
subtitle: ""
tags: ["StateMachine"]
draft: false
categories: ["android"]
comments: true
---

理解状态机的原理及使用。

<!--more-->

## 有限状态机（FSM）

有限状态机（Finite State Machine）是表示有限个状态（State）以及在这些状态（State）之间的转移（Transition）和动作（Action）等行为的数据模型。

总的来说，有限状态机系统，是指在不同阶段呈现出不同的运行状态的系统，这些状态是有限的、不重叠的。

这样的系统在某一时刻一定会处于其所有状态中的一个状态，此时它接收一部分允许的输入，产生一部分可能的响应，并迁移到一部分可能的状态。


### 有限状态机的要素

* State（状态）

状态（State），就是一个系统在其生命周期中某一个时刻的运行情况，此时，系统会执行一些操作，或者等待一些外部输入。并且，在当前形态下，可能会有不同的行为和属性。


* Guard（条件）

状态机对外部消息进行响应时，除了需要判断当前的状态，还需要判断跟这个状态相关的一些条件是否成立。这种判断称为 Guard（条件）。Guard 通过允许或者禁止某些操作来影响状态机的行为。


* Event（事件）

事件（Event），就是在一定的时间和空间上发生的对系统有意义的事情，事件通常会引起状态的变迁，促使状态机从一种状态切换到另一种状态。


* Action（动作）

当一个事件（Event）被状态机系统分发的时候，状态机用 动作（Action）来进行响应，比如修改一下变量的值、进行输入输出、产生另外一个 Event 或者迁移到另外一个状态等。


* Transition（迁移）

从一个状态切换到另一个状态被称为 Transition（迁移）。引起状态迁移的事件被称为触发事件（triggering event），或者被简称为触发（trigger）。

### 有限状态机的 Java 实现 


模拟开关的状态机

一个开关的状态有两种，一种是开，一种是关 。当处于开的状态时，按下按键，则状态会切换到关，反之亦然。

建立一个模拟灯泡开关事件的状态机

```java
/**
 * 灯泡的状态机
 */
public class LampStateMachine {
    /**
     * 开始和关闭状态
     */
    public static final int mOpenState = 1 ;
    public static final int mCloseState = 0 ;

    /**
     * 当前状态
     */
    private int mCurrentState ;

    /**
     * 状态机的名称
     */
    private String mName ;


    public LampStateMachine(String mName) {
        this.mName = mName;
    }

    /**
     * 初始化当前的状态
     * @param state
     */
    public void initState(int state){
        mCurrentState = state ;
    }

    /**
     * 模拟灯泡的点击事件,也就是状态机中的一个 Action
     */
    public void ClickEvent(){
        /**
         * 利用 switch/case 来实现状态机
         */
        switch (mCurrentState){
            case mOpenState:
                /**
                 * 改变状态
                 */
                changeState(mCloseState);

                /**
                 * 执行事件,模拟事件
                 */
                System.out.println("close the lamp");
                break;
            case mCloseState:
                /**
                 * 改变状态
                 */
                changeState(mOpenState);

                /**
                 * 执行事件,模拟事件
                 */
                System.out.println("open the lamp");
                break;
            default:
                break;
        }
    }

    /**
     * 改变当前的状态,也就是状态机中的迁移
     * @param state
     */
    public void changeState(int state){
        mCurrentState = state ;
    }


    public String getmName() {
        return mName;
    }

    public void setmName(String mName) {
        this.mName = mName;
    }

}
```

在上面的状态机中，我们使用 switch/case 来实现的状态机，也可以用 if/else 来实现状态机，还可以用设计模式中的状态模式来实现状态机。

有了上述的状态机之后，就可以利用该状态机来模拟灯泡的点击事件了。

```java
public class LampStateMachineTest {
    public static void main(String[] args) {
        LampStateMachine lampStateMachine = new LampStateMachine("lamp state machine");
        /**
         * 初始化当前状态为关
         */
        lampStateMachine.initState(LampStateMachine.mCloseState);

        System.out.println(lampStateMachine.getmName());

        /**
         * 模拟十次点击灯泡的开关
         */
        for (int i = 0 ; i < 10 ; i ++){
            lampStateMachine.ClickEvent();
        }
    }
}
```

运行该程序之后，就会交替打印灯泡开关对应的字符串。

这就是利用状态机实现开关点击事件的例子，不过这里灯泡的点击只有两个状态，除了开就是关。假设当我们的某个事件对应多个状态时，那么状态机的优势就体系出来了，可以避免代码太过复杂，在状态机中进行状态的切换。




## 分层状态机（HFSM）

在有限状态机中，虽说状态是有限的，但是当状态太多的时候却不是那么好维护的，这个时候就需要将一些具有公共属性的状态分类，抽离出来，将同类型的状态作为一个状态机，然后再做一个大的状态机，来维护这些子状态。

例如，在有限状态机中，我们的状态图是这样的：

![fsm_xx](http://7xqe3m.com1.z0.glb.clouddn.com/blog-fsm_xx.png)

但在分层状态机中，我们的状态是这样的：

![hfsm_xx](http://7xqe3m.com1.z0.glb.clouddn.com/blog-hfsm_xx.png)

这样一来，我们就不需要考量所有的状态之间的关系，定义所有状态之间的跳转链接。

只需要使用层次化的状态机，将所有的行为分类，把几个小的状态归并到一个大的状态里面，然后再定义高层状态和高层状态中内部小状态的跳转链接。

分层状态机从某种程度上就是限制了状态机的跳转，而且高层状态内部的状态是不需要关心外部状态的跳转的，这也做到了无关状态间的隔离，在每个状态内部只需要关心自己的小状态的跳转就可以了，这样就大大的降低了状态机的复杂度。


## 参考

1. http://www.ruanyifeng.com/blog/2013/09/finite-state_machine_for_javascript.html
2. http://www.aisharing.com/archives/393
3. http://www.cnblogs.com/jeason1997/p/5140201.html
4. http://blog.csdn.net/yqj2065/article/details/39371487

