---
outline: deep
---

# h函数处理组件的 VNode

组件是 `vue` 中非常重要的一个概念。

在 `vue` 中，组件本质上是 **一个对象或一个函数（`Function Component`）**

> 我们这里 **不考虑** 组件是函数的情况，因为这个比较少见。

我们可以直接利用 `h` 函数 +`render` 函数渲染出一个基本的组件：

1. 创建 `packages/vue/examples/imooc/runtime/h-component.html`

   ~~~javascript
   <script>
     const { h, render } = Vue
   
     const component = {
       render() {
         const vnode1 = h('div', '这是一个 component')
         console.log(vnode1);
         return vnode1
       }
     }
     const vnode2 = h(component)
     console.log(vnode2);
     render(vnode2, document.querySelector('#app'))
   
   </script>
   ~~~

2. 在当前代码中共触发了两次 `h` 函数，我们来查看两次打印的结果：

   ### vnode2

   ![_createVode4](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/_createVode4.png)

   1. `shapeFlag`：这个是当前的类型表示，`4` 表示为一个 组件，
   2. `type`：是一个 **对象**，它的值包含了一个 `render` 函数，这个就是 `component` 的 **真实渲染** 内容，
   3. `__v_isVNode`：`VNode` 标记，

   ### vnode1

   与 `ELEMENT + TEXT_CHILDREN` 相同，

   ~~~javascript
   {
     __v_isVNode: true,
     type: "div",
     children: "这是一个 component",
     shapeFlag: 9
   }
   ~~~

由此可知，对于 **组件** 而言，它的一个渲染，与之前不同的地方主要有两个：

1. `shapeFlag === 4`
2. `type`：是一个 **对象（组件实例）**，并且包含 `render` 函数

那么依据这样的概念，我们可以通过如下代码，完成同样的渲染：

~~~javascript
  const component = {
    render() {
      return {
        "__v_isVNode": true,
        "type": "div",
        "children": "这是一个 component",
        "shapeFlag": 9
      }
    }
  }

  render({
    "__v_isVNode": true,
    "type": component,
    "shapeFlag": 4
  }, document.querySelector('#app'))
~~~

### 处理组件的VNode

我们知道 组件的 `VNode` 其实只存在两个不同的地方：`type` 和 `shapeFlag`，

对于 `type` 而言，它是 `h` 函数的第一个参数，我们其实不需要单独进行处理，所以我们只需要处理 `shapeFlag` 即可。

在我们的代码中，处理 `shapeFlag` 的地方有两个：

1. `createVNode`：第一次处理，表示 `node` 类型（比如：`Element`）
2. `normalizeChildren`：第二次处理，表示 子节点类型（比如：`Text Children`）

因为我们这里不涉及到子节点，所以我们只需要在 `createVNode` 中处理即可：

~~~javascript
	// 通过 bit 位处理 shapeFlag 类型
	const shapeFlag = isString(type)
		? ShapeFlags.ELEMENT
		: isObject(type)
		? ShapeFlags.STATEFUL_COMPONENT // 有状态的组件
		: 0
~~~

此时创建测试实例 `packages/vue/examples/runtime/h-component.html`：

~~~javascript
<script>
  const { h, render } = Vue

  const component = {
    render() {
      const vnode1 = h('div', '这是一个 component')
      return vnode1
    }
  }
  const vnode2 = h(component)
  console.log(vnode2);
</script>
~~~

可以得到相同的打印结果

![_createVnode5](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/_createVnode5.png)

