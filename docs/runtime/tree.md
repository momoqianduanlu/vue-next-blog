---
outline: deep
---

# HTML DOM 节点树与虚拟 DOM 树

1. `HTML DOM` 节点树
2. 虚拟 `DOM` 树

我们来看下面这段 `HTML`：

~~~html
<div>
  <h1>hello h1</h1>
  <!-- TODO: comment -->
  hello div
</div>
~~~

当浏览器看到这一段 `html` 时，它会生成一个对应的 [DOM 树](https://zh.javascript.info/dom-nodes) 来进行表示：

![634f6e4f09e54d0121261262](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/tree/634f6e4f09e54d0121261262.png)

以上我们通过 **[节点（`Node`）](https://www.runoob.com/htmldom/htmldom-nodes.html)** 来描述了以上所有的元素，在 `HTML` 中所有的元素都是一个节点，注释、文本都属于节点的一部分。

这样的通过节点构成的一个树形结构，我们就把它叫做 **HTML DOM 节点树**

### 什么是 虚拟 `DOM` 树呢？

> ###### [# 来自 vue 官方文档](https://cn.vuejs.org/guide/extras/rendering-mechanism.html#virtual-dom)
>
> 虚拟 DOM (Virtual DOM，简称 VDOM) 是一种编程概念，意为将目标所需的 UI 通过数据结构“虚拟”地表示出来，保存在内存中，然后将真实的 DOM 与之保持同步。这个概念是由 [React](https://reactjs.org/) 率先开拓，随后在许多不同的框架中都有不同的实现，当然也包括 Vue。

虚拟 `DOM` 是一种理念，比如，我期望通过一个 `JavaScript 对象` 来描述一个 `div 节点`，它的子节点是一个文本`节点 text`，则可以这么写：

~~~javascript
// <div>text</div>

// 通过 虚拟 dom 表示
const vnode = {
	type: 'div',
	children: 'text'
}
~~~

在上面这个对象中，我们通过 `type` 来表示当前为一个 `div 节点`，通过 `children` 来表示它的子节点，通过 `text` 表示子节点是一个 文本节点，内容是 `text`。

这里所设计到的 `vnode`，是一个 **纯 `JavaScript` 对象**，我们通常使用它来表示 **一个虚拟节点（或虚拟节点树）**。它里面的属性名不是固定的，比如我可以使用 `type` 表示这是一个 `div`，也可以使用 `tag` 进行表示，都是可以的。

在 `vue` 的源码中，通过使用它来表示所需要创建元素的所有信息，比如：

~~~html
<div>
  <h1>hello h1</h1>
  <!-- TODO: comment -->
  hello div
</div>
~~~

该例子如果使用 `vnode` 进行表示：

~~~javascript
const vnode = {
	type: 'div',
	children: [
    {
      type: 'h1',
      children: 'hello h1'
    },
    {
      type: Comment,
      children: 'TODO: comment'
    },
    'hello div'
  ]
}
~~~

在运行时 `runtime` ，渲染器 `renderer` 会遍历整个虚拟 `DOM` 树，并据此构建真实的 DOM 树，这个过程我们可以把它叫做 **挂载 `mount`**。

当这个 `VNode` 对象发生变化时，那么我们会对比 **旧的 `VNode`** 和 **新的 `VNode`** 之间的区别，找出它们之间的区别，并应用这其中的变化到真实的 DOM 上。这个过程被称为**更新 patch**。