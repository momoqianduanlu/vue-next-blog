---
outline: deep
---

# h 构建ELEMENT + ARRAY_CHILDREN 场景

我们先来看测试实例 `packages/vue/examples/imooc/runtime/h-element-ArrayChildren.html`：

~~~javascript
<script>
  const { h } = Vue

  const vnode = h('div', {
    class: 'test'
  }, [
    h('p', 'p1'),
    h('p', 'p2'),
    h('p', 'p3')
  ])

  console.log(vnode);
</script>
~~~

最终打印为（剔除无用的）：

~~~javascript
{
  "__v_isVNode": true,
  "type": "div",
  "props": { "class": "test" },
  "children": [
    {
      "__v_isVNode": true,
      "type": "p",
      "children": "p1",
      "shapeFlag": 9
    },
    {
      "__v_isVNode": true,
      "type": "p",
      "children": "p2",
      "shapeFlag": 9
    },
    {
      "__v_isVNode": true,
      "type": "p",
      "children": "p3",
      "shapeFlag": 9
    }
  ],
  "shapeFlag": 17
}

~~~

通过以上的打印其实我们可以看出存在一些不同的地方：

1. `children`：为数组
2. `shapeFlag`：`17`

而这两点，也是 `h` 函数处理 `ELEMENT + ARRAY_CHILDREN` 场景下，最不同的地方，下面我们开始进行源码分析，来看一下这次 `h` 函数的执行逻辑。

由测试案例可知，我们一共触发了 `4` 次 `h` 函数：

1. 第一次触发 `h` 函数：

   ~~~javascript
   h('p', 'p1')
   ~~~

2. 进入 `_createVNode` 方法，此时的参数为：

   ![_createVNode](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/_createVNode.png)

3. 触发 `createBaseVNode` 时，`shapeFlag = 1`

   1. 进入 `createBaseVNode`
   2. 进入 `else`，执行 `type = ShapeFlags.TEXT_CHILDREN`，此时 `type = 8`
   3. 最后执行 `vnode.shapeFlag |= type` ，得到 `vnode.shapeFlag = 9`

   因为我们的子节点是三个 `h`函数，所以以上流程我们会执行三次，

1. 进入到 **第四次** 触发 `h` 函数：

   ~~~javascript
   h('div', {
       class: 'test'
     }, [
       h('p', 'p1'),
       h('p', 'p2'),
       h('p', 'p3')
     ])
   ~~~

2. 此时进入到 `_createVNode` 时的参数为：

   ![_createVNode2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/_createVNode2.png)

   展开 `children` 数据为 **解析完成之后的 `vnode`**：

   ![_createVNode3](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/_createVNode3.png)

3. 因为 `type`是 `div`， 所以代码继续，计算 `shapeFlag = 1`

4. 触发 `createBaseVNode`：

   1. 进入 `createBaseVNode`

   2. 执行 `normalizeChildren(vnode, children)`：

      1. 进入 `normalizeChildren`

      2. 因为当前 `children = Array`，所以代码会进入到 `else if (isArray(children))`

      3. 执行 `type = ShapeFlags.ARRAY_CHILDREN`，即：`type = 16`

      4. 接下来执行 `vnode.shapeFlag |= type`

         此时 `vnode.shapeFlag = 1`，转化为二进制：

         ~~~javascript
         00000000 00000000 00000000 00000001
         ~~~

         此时 `type = 16`，转化为二进制：

         ~~~javascript
         00000000 00000000 00000000 00010000
         ~~~

         所以最终 `|=` 之后的二进制为：

         ~~~javascript
         00000000 00000000 00000000 00010001
         ~~~

         转化为 `10进制` 为 `17`

   代码执行结束。

   由以上代码可知，当我们处理 `ELEMENT + ARRAY_CHILDREN` 场景时：

   1. 第一次计算 `shapeFlag`，依然为 `Element`

   2. 第二次计算 `shapeFlag`，因为 `children` 为 `Array`，所以会进入 `else if (array)` 判断

      `type = ShapeFlags.ARRAY_CHILDREN`，最后执行到 `vnode.shapeFlag |= type`，

      `shapeFlag = 17`。

   