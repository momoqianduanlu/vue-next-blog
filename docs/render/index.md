---
outline: deep
---

# 初见 render函数，ELEMENT 节点的挂载操作

~~~javascript
<script>
  const { h } = Vue

  const vnode = h('div', {
    class: 'test'
  }, 'hello render')


  console.log(vnode);
</script>
~~~

这样的一段代码我们可以得到一个对应的 `vnode`，我们可以使用 `render` 函数来去渲染它。

~~~javascript
render(vnode, document.querySelector('#app'))
~~~

我们可以在 `packages/runtime-core/src/renderer.ts` 的第 `2327` 行，增加 `debugger`：

1. 进入 `render` 函数

2. `render` 函数接收三个参数：

   ~~~javascript
   const render: RootRenderFunction = (vnode, container, isSVG) => {
       console.log(vnode, container, isSVG);
       if (vnode == null) {
         if (container._vnode) {
           unmount(container._vnode, null, null, true)
         }
       } else {
         patch(container._vnode || null, vnode, container, null, null, null, isSVG)
       }
       flushPostFlushCbs()
       container._vnode = vnode
     }
   ~~~

   ![render](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/render/render.png)

   `vnode`：虚拟节点，

   `container`：容器，

   `isSVG`：是否是 `SVG`，

   当前的`vnode`肯定是存在的，所以我们的代码继续往下面执行，

3. 执行 `patch(container._vnode || null, vnode, container, null, null, null, isSVG)`

   `patch`（打补丁），

   ~~~javascript
   const patch: PatchFn = (
       n1,
       n2,
       container,
       anchor = null,
       parentComponent = null,
       parentSuspense = null,
       isSVG = false,
       slotScopeIds = null,
       optimized = __DEV__ && isHmrUpdating ? false : !!n2.dynamicChildren
     ) => {
       if (n1 === n2) {
         return
       }
   
       // patching & not same type, unmount old tree
       if (n1 && !isSameVNodeType(n1, n2)) {
         anchor = getNextHostNode(n1)
         unmount(n1, parentComponent, parentSuspense, true)
         n1 = null
       }
   
       if (n2.patchFlag === PatchFlags.BAIL) {
         optimized = false
         n2.dynamicChildren = null
       }
   
       const { type, ref, shapeFlag } = n2
       switch (type) {
         case Text:
           processText(n1, n2, container, anchor)
           break
         case Comment:
           processCommentNode(n1, n2, container, anchor)
           break
         case Static:
           if (n1 == null) {
             mountStaticNode(n2, container, anchor, isSVG)
           } else if (__DEV__) {
             patchStaticNode(n1, n2, container, isSVG)
           }
           break
         case Fragment:
           processFragment(
             n1,
             n2,
             container,
             anchor,
             parentComponent,
             parentSuspense,
             isSVG,
             slotScopeIds,
             optimized
           )
           break
         default:
           if (shapeFlag & ShapeFlags.ELEMENT) {
             processElement(
               n1,
               n2,
               container,
               anchor,
               parentComponent,
               parentSuspense,
               isSVG,
               slotScopeIds,
               optimized
             )
           } else if (shapeFlag & ShapeFlags.COMPONENT) {
             processComponent(
               n1,
               n2,
               container,
               anchor,
               parentComponent,
               parentSuspense,
               isSVG,
               slotScopeIds,
               optimized
             )
           } else if (shapeFlag & ShapeFlags.TELEPORT) {
             ;(type as typeof TeleportImpl).process(
               n1 as TeleportVNode,
               n2 as TeleportVNode,
               container,
               anchor,
               parentComponent,
               parentSuspense,
               isSVG,
               slotScopeIds,
               optimized,
               internals
             )
           } else if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
             ;(type as typeof SuspenseImpl).process(
               n1,
               n2,
               container,
               anchor,
               parentComponent,
               parentSuspense,
               isSVG,
               slotScopeIds,
               optimized,
               internals
             )
           } else if (__DEV__) {
             warn('Invalid VNode type:', type, `(${typeof type})`)
           }
       }
   
       // set ref
       if (ref != null && parentComponent) {
         setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
       }
     }
   ~~~

   根据我们之前所说，我们知道 `patch` 表示 **更新** 节点。这里传递的参数我们主要关注 **前三个**。

   `container._vnode` 表示 **旧节点（`n1`）**，`vnode` 表示 **新节点（`n2`）**，`container` 表示 **容器**，`anchor`表示锚点，

   继续执行代码，如果 `n1 === n2`，那我们直接`return`，

   执行 `switch`，`case` ，

   由于 `type` 是一个`div`，那 `Text`，`Comment` 和 `Static`的类型都是`symbol`，所以代码执行到`default`，

   到 `if (shapeFlag & ShapeFlags.ELEMENT)`，

4. 1

5. 1

6. 1

7. 1

8. 1

9. 1

10. 1

11. 1

12. 1

13. 1

1. 

   

   

   

   

   

   

   

   

   

   

   

   