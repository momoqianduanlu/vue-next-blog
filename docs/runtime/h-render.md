---
outline: deep

---

# h 函数 与 render 函数

`vue` 的渲染分为：挂载和更新。两个步骤。

而无论是挂载还是更新，都是借助 `VNode` 来进行实现的。

~~~html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>Document</title>
  <script src="https://unpkg.com/vue@3.2.36/dist/vue.global.js"></script>
</head>

<body>
  <div id="app"></div>
</body>

<script>
  const { render, h } = Vue
  // 生成 VNode
  const vnode = h('div', {
    class: 'test'
  }, 'hello render')

  // 承载的容器
  const container = document.querySelector('#app')

  // 渲染函数
  render(vnode, container)
</script>

</html>
~~~

在以上代码中，我们知道主要涉及到了两个函数：

1. `h` 函数
2. `render` 函数

### h 函数

~~~javascript
 const vnode = h('div', {
    class: 'test'
  }, 'hello render')
~~~

打印当前的 `vnode`，可以得到一下内容：

~~~javascript
{
	"__v_isVNode": true,
	"__v_skip": true,
	"type": "div",
	"props": { "class": "test" },
	"key": null,
	"ref": null,
	"scopeId": null,
	"slotScopeIds": null,
	"children": "hello render",
	"component": null,
	"suspense": null,
	"ssContent": null,
	"ssFallback": null,
	"dirs": null,
	"transition": null,
	"el": null,
	"anchor": null,
	"target": null,
	"targetAnchor": null,
	"staticCount": 0,
	"shapeFlag": 9,
	"patchFlag": 0,
	"dynamicProps": null,
	"dynamicChildren": null,
	"appContext": null
}
~~~

以上内容，我们剔除掉无用的内容之后，得到一个精简的 `json`：

~~~javascript
{
  // 是否是一个 VNode 对象
	"__v_isVNode": true,
  // 当前节点类型
	"type": "div",
  // 当前节点的属性
	"props": { "class": "test" }
  // 它的子节点
	"children": "hello render"
}
~~~

那么由此可知 `h` 函数本质上其实就是一个：**用来生成 `VNode` 的函数**。

[h 函数](https://cn.vuejs.org/api/render-function.html#h) 最多可以接收三个参数：

1. `type: string | Component`： 既可以是一个字符串 (用于原生元素) 也可以是一个 Vue 组件定义。
2. `props?: object | null`： 要传递的 prop
3. `children?: Children | Slot | Slots`：子节点。

### render 函数

~~~javascript
 render(vnode, container)
~~~

从以上代码中我们可知，`render` 函数主要接收了两个参数：

1. `vnode`：虚拟节点树 或者叫做 虚拟 `DOM` 树，两种叫法皆可
2. `container`：承载的容器。真实节点渲染的位置。

通过 `render` 函数，我们可以：**使用编程式地方式，创建虚拟 DOM 树对应的真实 `DOM` 树，到指定位置。**