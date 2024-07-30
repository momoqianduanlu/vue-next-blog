---
outline: deep
---

# Ref 复杂数据类型的响应性

通过学习 `reactive` 函数，我们知道了 `reactive` 有两个不足，

1. `reactive` 只能对 **复杂数据** 类型进行使用，
2. `reactive` 的响应性数据，不可以进行解构，

因为 `reactive` 的不足，所以 `vue 3` 又为我们提供了 `ref` 函数构建响应性，那么：

1. `ref` 函数是如何实现的呢？
2. `ref` 可以构建简单数据类型的响应性吗？
3. 为什么 `ref` 类型的数据，必须要通过 `.value` 访问值呢？

带着以上三个问题，我们来看下 **`ref` 的响应性** 的实现 **~~~**

### 创建测试实例 `ref.html`

~~~html
   <body>
     <div id="app"></div>
   </body>
   <script>
     const { ref, effect } = Vue
   
     const obj = ref({
       name: '张三'
     })
   
     // 调用 effect 方法
     effect(() => {
       document.querySelector('#app').innerText = obj.value.name
     })
   
     setTimeout(() => {
       obj.value.name = '李四'
     }, 2000);
   
   </script>
~~~

### ref 函数

1. `ref` 函数中，直接触发 `createRef` 函数

2. 在 `createRef` 中，进行了判断如果当前已经是一个 `ref` 类型数据则直接返回，否则 **返回 `RefImpl` 类型的实例**

   ~~~javascript
   export function ref(value?: unknown) {
     return createRef(value, false)
   }
   
   function createRef(rawValue: unknown, shallow: boolean) {
     if (isRef(rawValue)) {
       return rawValue
     }
     return new RefImpl(rawValue, shallow)
   }
   
   class RefImpl<T> {
     private _value: T
     private _rawValue: T
   
     public dep?: Dep = undefined
     public readonly __v_isRef = true
   
     constructor(value: T, public readonly __v_isShallow: boolean) {
       this._rawValue = __v_isShallow ? value : toRaw(value)
       this._value = __v_isShallow ? value : toReactive(value)
     }
   
     get value() {
       trackRefValue(this)
       return this._value
     }
   
     set value(newVal) {
       const useDirectValue =
         this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
       newVal = useDirectValue ? newVal : toRaw(newVal)
       if (hasChanged(newVal, this._rawValue)) {
         this._rawValue = newVal
         this._value = useDirectValue ? newVal : toReactive(newVal)
         triggerRefValue(this, newVal)
       }
     }
   }
   
   export function toReactive<T extends unknown>(value: T): T {
   	return isObject(value) ? reactive(value as object) : value
   }
   ~~~

3. 那么这个 `RefImpl` 是什么呢？

   1. `RefImpl` 是位于 `ref.ts` 之下的一个类，在这个类实例化的过程中，声明了两个私有变量，`_rawValue` 和 `_value`，

      `_rawValue` 可以简单理解为，`__v_isShallow` 是不是一个简单数据类型，如果是直接返回 `value`，如果不是则调用 `toRaw`，这里，`_rawValue` 是 undefined，

   2. 对于 `_value`，`value` 在这里传入的是一个对象，所以他不是简单的数据类型，然后我们调用了 `toReactive` ，

      那么我们来看看 `toReactive` 的作用：

      1. 复杂数据类型：调用了 `reactive` 函数，返回了一个 `proxy` 的代理对象, 即把 `value` 变为响应性的。

         **`ref` 如果传递的是一个对象，那么ref的响应性是通过 `reactive`来实现的**。

         这里虽然调用了 `reactive` 函数，这个时候是没有做**依赖收集**的，因为还没有执行 `effect` 函数，也就不会实例化 `new ReactiveEffect` 那一套，也不会触发响应式对象的 `getter` 行为，也不会执行到 `track` 函数做依赖收集。

      2. 简单数据类型：直接把 `value` 原样返回

   3. ![RefImpl](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/ref/RefImpl.png)

4. 至此 `ref` 函数执行完成。

由以上逻辑可知：

1. 对于 `ref` 函数而言，主要生成了 `RefImpl` 的实例
2. 在构造函数中对传入的数据进行了处理：
   1. 复杂数据类型：转为响应性的 `proxy` 实例
   2. 简单数据类型：不去处理
3. `RefImpl` 分别提供了`get value`、`set value` 以此来完成对 `getter` 和 `setter` 的监听，**注意这里并没有使用 `new proxy`**。

### effect

当 `ref` 函数执行完成之后，测试实例开始执行 `effect` 函数。

`effect` 函数我们之前跟踪过它的执行流程，我们知道整个 `effect` 主要做了3 件事情：

1. 生成 `ReactiveEffect` 实例
2. **触发 `fn` 方法，从而激活 `getter`**
3. 建立了 `targetMap` 和 `activeEffect` 之间的联系

通过以上可知，`effect` 函数中会触发 `fn` 函数，也就是说会执行 **`obj.value.name`** ，那么根据 `get value` 机制，此时会触发 `RefImpl` 的 **`get value`** 方法。

~~~javascript
class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal)
    newVal = useDirectValue ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, newVal)
    }
  }
}
~~~

### get value()

1. 在 `get value` 中会触发 `trackRefValue` 方法，

   1. 触发 `trackEffects` 函数，并且在此时为 `ref` 新增了一个 `dep` 属性，这个 `dep` 在实例化 `RefImpl` 的时候声明过，在这里是 undefined，所以给他赋值 `createDep()`，

      ~~~javascript
      export function trackRefValue(ref: RefBase<any>) {
        if (shouldTrack && activeEffect) {
          ref = toRaw(ref)
          if (__DEV__) {
            trackEffects(ref.dep || (ref.dep = createDep()), {
              target: ref,
              type: TrackOpTypes.GET,
              key: 'value'
            })
          } else {
            trackEffects(ref.dep || (ref.dep = createDep()))
          }
        }
      }
      ~~~

      ~~~javascript
      trackEffects(ref.dep || (ref.dep = createDep())...}
      ~~~

   2. 而 `trackEffects` 其实我们是有过了解的，我们知道 `trackEffects` 主要的作用就是：**收集所有的依赖**。

      ~~~javascript
      export function trackEffects(
        dep: Dep,
        debuggerEventExtraInfo?: DebuggerEventExtraInfo
      ) {
        let shouldTrack = false
        if (effectTrackDepth <= maxMarkerBits) {
          if (!newTracked(dep)) {
            dep.n |= trackOpBit // set newly tracked
            shouldTrack = !wasTracked(dep)
          }
        } else {
          // Full cleanup mode.
          shouldTrack = !dep.has(activeEffect!)
        }
      
        if (shouldTrack) {
          dep.add(activeEffect!)
          activeEffect!.deps.push(dep)
          if (__DEV__ && activeEffect!.onTrack) {
            activeEffect!.onTrack({
              effect: activeEffect!,
              ...debuggerEventExtraInfo!
            })
          }
        }
      }
      ~~~

2.  `get value` 执行完成

### 再次触发 get value()

测试实例在两秒之后，修改数据源了：

~~~javascript
obj.value.name = '李四'
~~~

但是这里**有一个很关键的问题**，需要大家进行思考，那就是：**此时会触发 `get value` 还是 `set value` ？**

我们知道以上代码可以被拆解为：

~~~javascript
const value = obj.value
value.name = '李四'
~~~

那么通过以上代码我们清晰可知，其实触发的应该是 `get value` 函数。

在 `get value` 函数中：

1. 再次执行 `trackRefValue` 函数：

   但是此时 `activeEffect` 为 `undefined`，所以不会执行后续逻辑

2. 返回 `this._value`：

   通过 `RefImpl` **构造函数**，我们可知，此时的 `this._value` 是经过 `toReactive` 函数过滤之后的数据，在当前实例中为 **`proxy`** 实例。

3. `get value` 执行完成

由以上逻辑可知：

1. `const value` 是 `proxy` 类型的实例，即：**代理对象**，被代理对象为 `{name: '张三'}`
2. 执行 `value.name = '李四'` ，本质上是触发了 `proxy` 的 `setter`行为
3. 根据 `reactive` 的执行逻辑可知，此时会触发 `trigger` 触发依赖
4. 派发更新，修改视图

### 总结

由以上逻辑可知：

1. 对于 `ref` 函数，会返回 `RefImpl` 类型的实例
2. 在该实例中，会根据传入的数据类型进行分开处理
   1. 复杂数据类型：转化为 `reactive` 返回的 `proxy` 实例
   2. 简单数据类型：不做处理
3. 无论我们执行 `obj.value.name` 还是 `obj.value.name = xxx` 本质上都是触发了 `get value`
4. 之所以会进行 **响应性** 是因为 `obj.value` 是一个 `reactive` 函数生成的 `proxy`

# Ref 简单数据类型的响应性

