---
outline: deep
---

# 挂载与更新

1. 挂载：`mount`
2. 更新：`patch`

### 挂载：mount

首先我们先来构建案例

~~~javascript
<script>
  const VNode = {
    type: 'div',
    children: 'hello render'
  }

  // 创建 render 渲染函数
  function render(oldVNode, newVNode, container) {
    if (!oldVNode) {
      mount(newVNode, container)
    }
  }

  // 挂载函数
  function mount(vnode, container) {
    // 根据 type 生成 element
    const ele = document.createElement(vnode.type)
    // 把 children 赋值给 ele 的 innerText
    ele.innerText = vnode.children
    // 把 ele 作为子节点插入 body 中
    container.appendChild(ele)
  }

  render(null, VNode, document.querySelector('#app'))
</script>
~~~

在当前案例中，我们首先创建了一个 `render` 渲染函数，该函数接收三个参数：

1. `oldVNode`：旧的 `VNode`
2. `newVNode`：新的 `VNode`
3. `container`：容器

当 `oldVNode` 不存在时，那么我们就认为这是一个全新的渲染，也就是 **挂载**。

### 更新：patch

旧的视图不可能被一直展示，它会在未来某一个时刻被更新为全新的视图。

~~~javascript
<script>
  const VNode = {
    type: 'div',
    children: 'hello render'
  }

  const VNode2 = {
    type: 'div',
    children: 'patch render'
  }

  // 创建 render 渲染函数
  function render(oldVNode, newVNode, container) {
    if (!oldVNode) {
      mount(newVNode, container)
    } else {
      patch(oldVNode, newVNode, container)
    }
  }

  // 挂载函数
  function mount(vnode, container) {
    // 根据 type 生成 element
    const ele = document.createElement(vnode.type)
    // 把 children 赋值给 ele 的 innerText
    ele.innerText = vnode.children
    // 把 ele 作为子节点插入 body 中
    container.appendChild(ele)
  }

  // 取消挂载
  function unmount(container) {
    container.innerHTML = ''
  }

  // 更新函数
  function patch(oldVNode, newVNode, container) {
    unmount(container)

    // 根据 type 生成 element
    const ele = document.createElement(newVNode.type)
    // 把 children 赋值给 ele 的 innerText
    ele.innerText = newVNode.children
    // 把 ele 作为子节点插入 body 中
    container.appendChild(ele)
  }

  render(null, VNode, document.querySelector('#app'))

  setTimeout(() => {
    render(VNode, VNode2, document.querySelector('#app'))
  }, 2000);
</script>
~~~

我们在原有的代码中去新增了一部分逻辑，新增了 `patch` 函数。

在 `patch` 函数中，我们先 **删除了旧的 `VNode` ，然后创建了一个新的 `VNode` 。** 这样的一个流程，我们就把它叫做 **挂载 `patch`**

### 总结

我们通过一个简单的例子讲解了 **挂载 `mount`** 和 **更新 `patch`** 的概念，这两个概念 [Vue 3 官方文档](https://cn.vuejs.org/guide/extras/rendering-mechanism.html#render-pipeline) 也对此进行了详细的介绍：

1. **编译**：Vue 模板被编译为**渲染函数**：即用来返回虚拟 DOM 树的函数。这一步骤可以通过构建步骤提前完成，也可以通过使用运行时编译器即时完成。
2. **挂载**：运行时渲染器调用渲染函数，遍历返回的虚拟 DOM 树，并基于它创建实际的 DOM 节点。
3. **更新**：当一个依赖发生变化后，副作用会重新运行，这时候会创建一个更新后的虚拟 DOM 树。运行时渲染器遍历这棵新树，将它与旧树进行比较，然后将必要的更新应用到真实 DOM 上去。

![WX20240818-212221@2x](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/mount-patch/WX20240818-212221@2x.png)