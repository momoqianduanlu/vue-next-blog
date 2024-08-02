---
outline: deep
---

# ref响应性源码实现

## ref 复杂数据类型的响应性

~~~javascript
import { createDep, Dep } from './dep'
import { activeEffect, trackEffects } from './effect'
import { toReactive } from './reactive'

export interface Ref<T = any> {
  value: T
}

/**
  * ref 函数
  * @param value unknown
  */
export function ref(value?: unknown) {
  return createRef(value, false)
}

/**
  * 创建 RefImpl 实例
  * @param rawValue 原始数据
  * @param shallow boolean 形数据，表示《浅层的响应性（即：只有 .value 是响应性的）》
  * @returns
  */
function createRef(rawValue: unknown, shallow: boolean) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
  private _value: T

  public dep?: Dep = undefined

  // 是否为 ref 类型数据的标记
  public readonly __v_isRef = true

  constructor(value: T, public readonly __v_isShallow: boolean) {
    // 如果 __v_isShallow 为 true，则 value 不会被转化为 reactive 数据，即如果当前 value 为复杂数据类型，则会失去响应性。对应官方文档 shallowRef ：https://cn.vuejs.org/api/reactivity-advanced.html#shallowref
    this._value = __v_isShallow ? value : toReactive(value)
  }

/**
  * get语法将对象属性绑定到查询该属性时将被调用的函数。
  * 即：xxx.value 时触发该函数
  */
  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {}
  }

/**
  * 为 ref 的 value 进行依赖收集工作
  */
export function trackRefValue(ref) {
  if (activeEffect) {
    trackEffects(ref.dep || (ref.dep = createDep()))
  }
}

/**
  * 指定数据是否为 RefImpl 类型
  */
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}
~~~

~~~javascript
/**
  * 将指定数据变为 reactive 数据
  */
export const toReactive = <T extends unknown>(value: T): T =>
	isObject(value) ? reactive(value as object) : value
~~~

~~~javascript
/**
  * 判断是否为一个对象
  */
export const isObject = (val: unknown) =>
	val !== null && typeof val === 'object'
~~~

### 总结

现在，我们从头开始梳理一下`ref`基于对象类型的实现过程。

**首先**，调用 `createRef`函数，在这个函数里面，如果本身就是一个 `ref` 类型的数据就原样返回，如果不是那就回实例化一个 `RefImpl`。

在 `new RefImpl`过程中，这个类定义了 `get` `set` 属性，他们对应的都是函数，当执行 `constructor` 的时候，拿到了 `_value`，这又引出了 `toReactive`函数。

由于此时我们传递的是一个对象，那么ref的响应性是通过 `reactive`函数来实现的，返回的是一个 `Proxy`的实例，

**接着**，当执行`effect`函数的时候，

~~~javascript
effect(() => {
	document.querySelector('#app').innerText = obj.value.name
})
~~~

先生成 `ReactiveEffect` 实例，记录了当前的 `activeEffect` ，

~~~javascript
export function effect<T = any>(fn: () => T) {
  // 生成 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn)
  // 执行 run 函数
  _effect.run()
}
~~~

然后调用了 `run` 函数，其实就是调用了我们在 `effect`函数中传入的 **fn**，在执行 **fn** 的过程中，一旦执行 `obj.value.name` ，将会匹配 `RefImpl` 的 `get value()` 函数，调用了 `trackRefValue`函数

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/ref/RefImpl2.png" alt="RefImpl2" style="zoom:50%;" />

在这个过程中 `activeEffect` 是存在的， 通过`trackEffects` 函数的执行，将当前激活的 `activeEffect` 存储到 `RefImpl` 实例的 `dep` 属性上。

当执行 `return this._value`  的时候触发了 `Proxy`的 `getter`行为，触发 `track`函数做依赖收集，建立了 `targetMap` 和 `activeEffect` 之间的联系。

**最后**，当我们改变 `obj.value.name = '李四'` 的值的时候，我们可以将这段代码拆开，先执行 `obj.value`，再执行 `name = '李四'`，  首先我们触发的还是 `get value()` 函数，执行 `trackRefValue`函数，不过要注意的是当执行到 `return this._value`  的时候触发的是 `Proxy`的 `setter ` 行为，触发 `trigger`函数做派发更新，页面数据完成修改。

至此，我们完成了整个响应式数据渲染的过程。

## ref 简单数据类型的响应性

### 总结