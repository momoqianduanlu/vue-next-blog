---
outline: deep
---

# h函数构建element节点

我们通过这个测试实例来学习 `h` 函数构建 `element`节点的过程，

`h` 函数的代码位于 `packages/runtime-core/src/h.ts` 中，为 `174` 行增加 `debugger`

~~~javascript
const { h } = Vue

const vnode = h('div', {
  class: 'test'
}, 'hello world')
console.log(vnode);
~~~

![1](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/1.png)

### h函数

代码进入 `h` 函数，通过源码可知，`h` 函数接收三个参数，

1. `type`：类型。比如当前的 `div` 就表示 `Element` 类型
2. `propsOrChildren`：可以是`props` 或者 `children`
3. `children`：子节点

在这三个参数中，第一个和第三个都比较好理解，它的第二个参数代表的是什么意思呢？

查看 [官方示例](https://cn.vuejs.org/api/render-function.html#h) 可知：**`h` 函数存在多种调用方式**：

~~~javascript
   import { h } from 'vue'
   
   // 除了 type 外，其他参数都是可选的
   h('div')
   h('div', { id: 'foo' })
   
   // attribute 和 property 都可以用于 prop
   // Vue 会自动选择正确的方式来分配它
   h('div', { class: 'bar', innerHTML: 'hello' })
   
   // class 与 style 可以像在模板中一样
   // 用数组或对象的形式书写
   h('div', { class: [foo, { bar }], style: { color: 'red' } })
   
   // 事件监听器应以 onXxx 的形式书写
   h('div', { onClick: () => {} })
   
   // children 可以是一个字符串
   h('div', { id: 'foo' }, 'hello')
   
   // 没有 prop 时可以省略不写
   h('div', 'hello')
   h('div', [h('span', 'hello')])
   
   // children 数组可以同时包含 vnode 和字符串
   h('div', ['hello', h('span', 'hello')])
~~~

那么这样的功能是如何实现的呢？

~~~javascript
   export function h(type: any, propsOrChildren?: any, children?: any): VNode {
     // 获取用户传递的参数数量
     const l = arguments.length
     // 如果用户只传递了两个参数，那么证明第二个参数可能是 props , 也可能是 children
     if (l === 2) {
       // 如果 第二个参数是对象，但不是数组。则第二个参数只有两种可能性：1. VNode 2.普通的 props
       if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
         // 如果是 VNode，则 第二个参数代表了 children
         if (isVNode(propsOrChildren)) {
           return createVNode(type, null, [propsOrChildren])
         }
         // 如果不是 VNode， 则第二个参数代表了 props
         return createVNode(type, propsOrChildren)
       }
       // 如果第二个参数不是单纯的 object，则 第二个参数代表了 children
       else {
         return createVNode(type, null, propsOrChildren)
       }
     }
     // 如果用户传递了三个或以上的参数，那么证明第二个参数一定代表了 props
     else {
       // 如果参数在三个以上，则从第二个参数开始，把后续所有参数都作为 children
       if (l > 3) {
         children = Array.prototype.slice.call(arguments, 2)
       }
       // 如果传递的参数只有三个，则 children 是单纯的 children
       else if (l === 3 && isVNode(children)) {
         children = [children]
       }
       // 触发 createVNode 方法，创建 VNode 实例
       return createVNode(type, propsOrChildren, children)
     }
   }
~~~

### createVNode

代码进入 `createVNode`，此时三个参数的值为：

1. `type`：`div`
2. `props`：`{class: 'test'}`
3. `children`：`hello render`
4. `l:3`

因为 `l` 是 3，那此时的 `children`是`vnode`吗？很显然不是，那么继续往下执行 `createVNode`，

~~~javascript
      const shapeFlag = isString(type)
          ? ShapeFlags.ELEMENT
          : __FEATURE_SUSPENSE__ && isSuspense(type)
          ? ShapeFlags.SUSPENSE
          : isTeleport(type)
          ? ShapeFlags.TELEPORT
          : isObject(type)
          ? ShapeFlags.STATEFUL_COMPONENT
          : isFunction(type)
          ? ShapeFlags.FUNCTIONAL_COMPONENT
          : 0
      
      return createBaseVNode(
          type,
          props,
          children,
          patchFlag,
          dynamicProps,
          shapeFlag,
          isBlockNode,
          true
        )
~~~

 最终得到 `shapeFlag` 的值为 `1`，`shapeFlag` 为当前`vNode`的 **类型标识**：

~~~javascript
export const enum ShapeFlags {
  ELEMENT = 1,
  FUNCTIONAL_COMPONENT = 1 << 1,
  STATEFUL_COMPONENT = 1 << 2,
  TEXT_CHILDREN = 1 << 3,
  ARRAY_CHILDREN = 1 << 4,
  SLOTS_CHILDREN = 1 << 5,
  TELEPORT = 1 << 6,
  SUSPENSE = 1 << 7,
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
~~~

根据 `enum ShapeFlags` 可知：`1` 代表为 `Element`，即**当前 `shapeFlag = ShapeFlags.Element`**，

代码继续执行，触发 `createBaseVNode`：

### createBaseVNode

进入 `createBaseVNode`

![2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/2.png)

`__v_isVNode: true` 表示是不是一个 `vnode`，

生成 `vnode` 对象，此时生成的 `vnode` 值为：

~~~javascript
anchor: null
appContext: null
children: "hello render"
component: null
dirs: null
dynamicChildren: null
dynamicProps: null
el: null
key: null
patchFlag: 0
props: {class: 'test'}
ref: null
scopeId: null
shapeFlag: 1
slotScopeIds: null
ssContent: null
ssFallback: null
staticCount: 0
suspense: null
target: null
targetAnchor: null
transition: null
type: "div"
__v_isVNode: true
__v_skip: true

~~~

剔除对我们无用的属性之后，得到：

~~~javascript
children: "hello render
props: {class: 'test'}
shapeFlag: 1 // 表示为 Element
type: "div"
__v_isVNode: true
~~~

代码执行 `normalizeChildren(vnode, children)`

~~~javascript
if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
    // normalize suspense children
    if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      ;(type as typeof SuspenseImpl).normalize(vnode)
    }
  } else if (children) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }
~~~

### normalizeChildren

~~~javascript
export function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0
  const { shapeFlag } = vnode
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    if (shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.TELEPORT)) {
      // Normalize slot to plain children for plain element and Teleport
      const slot = (children as any).default
      if (slot) {
        // _c marker is added by withCtx() indicating this is a compiled slot
        slot._c && (slot._d = false)
        normalizeChildren(vnode, slot())
        slot._c && (slot._d = true)
      }
      return
    } else {
      type = ShapeFlags.SLOTS_CHILDREN
      const slotFlag = (children as RawSlots)._
      if (!slotFlag && !(InternalObjectKey in children!)) {
        // if slots are not normalized, attach context instance
        // (compiled / normalized slots already have context)
        ;(children as RawSlots)._ctx = currentRenderingInstance
      } else if (slotFlag === SlotFlags.FORWARDED && currentRenderingInstance) {
        // a child component receives forwarded slots from the parent.
        // its slot type is determined by its parent's slot type.
        if (
          (currentRenderingInstance.slots as RawSlots)._ === SlotFlags.STABLE
        ) {
          ;(children as RawSlots)._ = SlotFlags.STABLE
        } else {
          ;(children as RawSlots)._ = SlotFlags.DYNAMIC
          vnode.patchFlag |= PatchFlags.DYNAMIC_SLOTS
        }
      }
    }
  } else if (isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    children = String(children)
    // force teleport children to array so it can be moved around
    if (shapeFlag & ShapeFlags.TELEPORT) {
      type = ShapeFlags.ARRAY_CHILDREN
      children = [createTextVNode(children as string)]
    } else {
      type = ShapeFlags.TEXT_CHILDREN
    }
  }
  vnode.children = children as VNodeNormalizedChildren
  vnode.shapeFlag |= type
}
~~~

首先，`children: "hello world"`，所以 `children` 不为空也不是数组，也不是对象，也不是函数，

`children = String(children)`是一个字符串，但他不是一个`TELEPORT`，代码进入最后的 `else`，执行 `type = ShapeFlags.TEXT_CHILDREN`，所以他是一个文本子节点，

**注意**：最后执行 **`vnode.shapeFlag |= type`**，

1. 此时 `vnode.shapeFlag` 原始值为 `1`，即 `ShapeFlags.ELEMENT`

2. `type` 的值为 `8`，即 `ShapeFlags.TEXT_CHILDREN`

3. 而 `|=` 表示为 [按位或赋值](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators#Assignment_operators#bitwise_or_assignment) 运算： `x |= y` 意为 `x = x | y`

   1. 即：`vnode.shapeFlag |= type` 表示为 `vnode.shapeFlag = vnode.shapeFlag | type`，

   2. 代入值后表示 `vnode.shapeFlag = 1 | 8`，进行二进制转换成十进制为：

      > `1` 是 `10` 进制，转化为 `32` 位的二进制之后为 ：
      >
      > `00000000 00000000 00000000 00000001`
      >
      > `8` 是 `10` 进制，转化为 转化为 `32` 位的二进制之后为 ：
      >
      > `00000000 00000000 00000000 00001000`
      >
      > 两者进行 按位或赋值 之后，得到的二进制为：
      >
      > `00000000 00000000 00000000 00001001`
      >
      > 转化为 `10进制` 即为 `9`

4. 所以，此时 **`vnode.shapeFlag` 的值为 `9`**

至此，整个 `h` 函数执行完成，最终得到的打印有效值为：

~~~javascript
children: "hello render
props: {class: 'test'}
shapeFlag: 9 // 表示为 Element | ShapeFlags.TEXT_CHILDREN 的值
type: "div"
__v_isVNode: true
~~~

------



### 扩展 (表达式和运算符)

1. **按位与**（**`&`**）运算符在两个操作数对应的二进位都为 `1` 时，该位的结果值才为 `1`。

   ~~~javascript
   const a = 5; // 00000000000000000000000000000101
   const b = 3; // 00000000000000000000000000000011
   
   console.log(a & b); // 00000000000000000000000000000001
   ~~~

2. **按位或**（**`|`**）运算符在其中一个或两个操作数对应的二进制位为 `1` 时，该位的结果值为 `1`。

   ~~~javascript
   const a = 5; // 00000000000000000000000000000101
   const b = 3; // 00000000000000000000000000000011
   
   console.log(a | b); // 00000000000000000000000000000111
   ~~~

3. **按位或赋值**（**`|=`**) 运算符使用两个操作数的二进制表示，对它们执行按位或运算并将结果分配给变量。

   ~~~javascript
   let a = 5; // 00000000000000000000000000000101
   a |= 3; // 00000000000000000000000000000011
   
   console.log(a); // 00000000000000000000000000000111
   ~~~

4. **按位与赋值**运算符（`&=`）使用两个操作数的二进制表示，对它们进行按位与运算并将结果赋值给变量。

   ~~~javascript
   let a = 5; // 00000000000000000000000000000101
   a &= 3; // 00000000000000000000000000000011
   
   console.log(a); // 00000000000000000000000000000001
   // Expected output: 1
   ~~~

5. **<< 运算符-左移运算符**

   `<<` 运算符执行左移位运算。在移位运算过程中，符号位始终保持不变。如果右侧空出位置，则自动填充为 0；超出 32 位的值，则自动丢弃。

   ~~~javascript
   console.log(5 << 2);  //返回值20
   ~~~

   

6. **>> 运算符-右移运算符**

7. 什么是二进制

   [二进制](https://cloud.tencent.com/developer/article/2012904)

   二进制是由Gottfried Leibniz发明的以 **2** 为底的数字系统，是**四种数字系统之一**。

   > 四种数字系统分别是：二进制、八进制、十进制、十六进制。

   计算机系统中的所有数据都由二进制信息组成，二进制只有 2 个值：**0** 和 **1**。

   在布尔逻辑中，单个二进制数字只能表示 **True** (1) 或 **False** (0) ，但是，可以使用多个二进制数字来表示大数并执行复杂的功能，任何整数都可以用二进制表示。

   ##### 二进制例子

   ![3](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/3.jpeg)

   二进制中没有 2、3、4、5、6、7、8 或 9.

   > 每个二进制数字都简称为bit，也叫位，一位只能用于表示 2 个不同的值：0 和 1。

   bit是计算机上数据的最小单位，其他单位还有：Byte、kb、mb、gb、tb等，它们的换算方式如下：

   - 1 B = 8 bit
   - 1 K = 1024 B
   - 1 M = 1024 K
   - 1 G = 1024 M
   - 1 T = 1024 G

   #### 如何阅读二进制？

   阅读二进制其实就是将二进制转化为我们可阅读的十进制的过程。

   ![5](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/5.png)

   **由此看出二进制的权重是 2 的幂，而不是 10 的幂。**

   ![6](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/6.jpeg)

   我们二进制转十进制的时候，一般都是从右往左看，第一个数字是0，那么算出来就是0.

   ![7](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/7.jpeg)

   第二个数字是1，那么算出来就是2.

   ![8](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/8.jpeg)

   以此类推，最后二进制数11101010转为十进制就是0+2+0+8+0+32+64+128=234。

   #### 如何将二进制的数转换成十进制的数。

   ##### 二进制的数转换成十进制的方法：

   从二进制数的最后一位开始算，依次列为第0、1、2...位，第n位的数（0或1）乘以2的n次方，将得到的结果相加就是二进制数所对应的十进制数。

   **二进制数1111，从最后一个1算起，依次列为第0位、第1位、第2位、第3位，对应数位上的数字都是1，**

   **所以：**

   ![8](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/9.webp)

   **二进制数11010，从最后一位0算起，依次列为第0位、第1位、第2位、第3位、第4位，第0位、第2位对应的数字是0，其余数位对应的数字是1，**

   **所以：**

   ![8](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/10.webp)

### 构建 h 函数，处理 ELEMENT + TEXT_CHILDREN 场景

![h-element](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/h-element.png)

