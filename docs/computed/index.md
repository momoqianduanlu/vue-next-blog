---
outline: deep

---

# computed 的响应性

**计算属性 `computed` 会 基于其响应式依赖被缓存，并且在依赖的响应式数据发生变化时 重新计算**。

前面我们已经完成了对 `reactive`函数  和 `ref` 函数的学习，也对这两个函数进行了实现，现在，我们来继续分析 `computed` 计算属性的内部实现，通过下面的测试实例，我们大致分析出了下面代码主要执行了 5 个步骤：

~~~javascript
<script>
  const { reactive, computed, effect } = Vue

  const obj = reactive({
    name: '张三'
  })

  const computedObj = computed(() => {
    return '姓名：' + obj.name
  })

  effect(() => {
    document.querySelector('#app').innerHTML = computedObj.value
  })

  setTimeout(() => {
    obj.name = '李四'
  }, 2000);
</script>

~~~

1. 使用 `reactive` 创建响应性数据
2. 通过 **`computed`** 创建计算属性 `computedObj`，并且 `obj.name` 会触发 `obj` 的 getter 行为
3. 通过 `effect` 方法创建 `fn` 函数
4. 在 `fn` 函数中，触发了 `computed` 的 `getter`
5. 延迟触发了 `obj` 的 `setter`

## computed

`computed` 的代码在 `packages/reactivity/src/computed.ts` 中，我们可以在这里为 `computed` 函数增加断点：

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/1.png" alt="1" style="zoom:50%;" />

```javascript
export function computed<T>(
  getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>,
  debugOptions?: DebuggerOptions,
  isSSR = false
) {
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>

  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = __DEV__
      ? () => {
          console.warn('Write operation failed: computed value is readonly')
        }
      : NOOP
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)

  if (__DEV__ && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack
    cRef.effect.onTrigger = debugOptions.onTrigger
  }

  return cRef as any
}
```

运行测试实例后，进入断点调试，这里要注意的是，当运行到 `computed` 函数的时候，测试实例的`reactive` 函数已经执行完成，

首先定义了 `getter` 和 `setter` 两个变量，`onlyGetter` 为真，继续向下执行，所以此时的 `getter = getterOrOptions` 就是我们 `computed` 传入的 fn 函数，`setter`在这里可以理解为空函数。

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/computed.png" alt="computed" style="zoom:50%;" />

继续向下执行，`const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter, isSSR)` 进入 `new ComputedRefImpl()` 的内部实现，

## ComputedRefImpl

~~~javascript
export class ComputedRefImpl<T> {
  public dep?: Dep = undefined

  private _value!: T
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY]: boolean = false

  public _dirty = true
  public _cacheable: boolean

  constructor(
    getter: ComputedGetter<T>,
    private readonly _setter: ComputedSetter<T>,
    isReadonly: boolean,
    isSSR: boolean
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
    this.effect.computed = this
    this.effect.active = this._cacheable = !isSSR
    this[ReactiveFlags.IS_READONLY] = isReadonly
  }

  get value() {
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this)
    trackRefValue(self)
    if (self._dirty || !self._cacheable) {
      self._dirty = false
      self._value = self.effect.run()!
    }
    return self._value
  }

  set value(newValue: T) {
    this._setter(newValue)
  }
}
~~~

当实例化这个 `ComputedRefImpl` 的时候，`getter` 参数就是传入的 fn 函数，`_setter` 就是一个只读的空函数，

![computedRefImpl](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/computedRefImpl.png)

代码继续向下执行，首先出现了一个属性 `dep`，这个 `dep` 在 `RefImpl` 中也出现了，他的值是一个 `new Set` 的数组，用来存放当前激活的 `activeEffect`，是实现派发更新的关键，然后有一个 `__v_isRef` 属性，他的值为 true，也就是说所有的计算属性 `ComputedRefImpl` 在用 `isRef` 函数判定的时候都为真。

**`_dirty = true` 声明了一个脏变量**，

接下来，实例化了 `ReactiveEffect`，传入了两个参数 `getter` 和 **匿名回调函数**，`getter` 还是我们的 fn 函数，由此可知，`computed` 传入的回调函数会被作为 `ReactiveEffect` 的 fn 函数，也就是说一旦 `this.effect.run()` 执行的时候就会调用 fn 函数的执行。

~~~javascript
if (!this._dirty) {
	this._dirty = true
	triggerRefValue(this)
}
~~~

当这个匿名回调函数执行的时候，会通过这个 `_dirty` **脏变量**进行判断，如果为假，会触发 `triggerRefValue`，我们知道 `triggerRefValue` 会 **依次派发更新**，由此可知这个**脏变量**的本质就是控制什么时候去派发更新。

![ReactiveEffect](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/ReactiveEffect.png)

`ComputedRefImpl` 执行完以后返回了 `cRef`。

至此，`computed` 函数执行完成了，说明了我们的测试实例完成了下面代码的执行。

~~~javascript
const computedObj = computed(() => {
	return '姓名：' + obj.name
})
~~~

接下来我们进入 `effect` 函数，来触发 `computedObj.value`。

## computed 的 getter

根据我们之前在学习 `ref` 的时候可知，`.value` 属性的调用本质上是一个 **`get value` 的函数调用**，而 `computedObj` 作为 `computed` 的返回值，本质上是 `ComputedRefImpl` 的实例， 所以此时会触发 `ComputedRefImpl` 下的 `get value` 函数。

> get value() 函数能执行是因为在 effect()函数执行的时候执行了传入的 fn 函数

我们在 `get value()` 函数前打上一个断点，

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/2.png" alt="2" style="zoom:50%;" />

进入 `trackRefValue` 函数，

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

参数 `ref` 是 `ComputedRefImpl` 的实例，最终会执行 `trackEffects`函数，实现依赖收集。

![ComputedRefImpl2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/ComputedRefImpl2.png)

执行 `self._dirty = false` ，如果 `_dirty = true` 则会 **触发执行依赖** ，在 **当前（标记为 `false` 之前）**，`self._dirty = true`，也就是说，在 `get value()`的时候， 只要脏状态为真，脏状态就会设置成假，变成假之后，接下来执行 `self.effect.run()!`，执行了 `run` 方法，我们知道 `run` 方法内部其实会触发 `fn` 函数，

~~~javascript
try {
  this.parent = activeEffect
  activeEffect = this
  shouldTrack = true

  trackOpBit = 1 << ++effectTrackDepth

  if (effectTrackDepth <= maxMarkerBits) {
    initDepMarkers(this)
  } else {
    cleanupEffect(this)
  }
  return this.fn()
}
~~~

通过 debugger 进入 fn 函数，发现这个函数就是 `computed` 函数里面传入的回调函数。

![computed2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/computed2.png)

那么 `ComputedRefImpl` 的 `get value()` 函数会触发 fn 函数的执行，然而在这个 fn 函数里面执行 `obj.name`，也就会触发 `reactive` 的 `getter` 行为。

继续执行断点进入 `reactive` 的 `createGetter`，

~~~javascript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {

    const res = Reflect.get(target, key, receiver)

    return res
  }
}
~~~

~~~javascript
export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }

    const eventInfo = __DEV__
      ? { effect: activeEffect, target, type, key }
      : undefined

    trackEffects(dep, eventInfo)
  }
}
~~~

完成对 `obj.name` 的依赖收集。

## ReactiveEffect 的 scheduler















