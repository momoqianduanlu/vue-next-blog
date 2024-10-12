# vnode的不同类型

我们知道 `h` 函数核心是用来：**创建 `vnode`** 的。但是对于 `vnode` 而言，它存在很多种不同的节点类型。

查看 `packages/runtime-core/src/renderer.ts` 中第 `354` 行 `patch` 方法的代码可知，`Vue` 总共处理了：

1. `Text`：文本节点
2. `Comment`：注释节点
3. `Static`：静态 `DOM` 节点
4. `Fragment`：包含多个根节点的模板被表示为一个片段 (fragment)
5. `ELEMENT`: `DOM` 节点
6. `COMPONENT`：组件
7. `TELEPORT`：新的 [内置组件](https://cn.vuejs.org/guide/built-ins/teleport.html#teleport)
8. `SUSPENSE`：新的 [内置组件](https://cn.vuejs.org/guide/built-ins/suspense.html#suspense)
9. …