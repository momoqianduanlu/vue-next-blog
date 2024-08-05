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

运行测试实例后，进入断点调试，这里要注意的是，当运行到 `computed` 函数的时候，测试实例的`reactive` 函数已经执行完成。

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

**当实例化这个 `ComputedRefImpl` 类的时候，**`getter` 参数就是传入的 fn 函数，`_setter` 就是一个只读的空函数，

![computedRefImpl](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/computedRefImpl.png)

代码继续向下执行，首先出现了一个属性 `dep`，这个 `dep` 在 `RefImpl` 中也出现了，他的值是一个 `new Set` 的数组，用来存放当前激活的 `activeEffect`，是实现派发更新的关键，然后有一个 `__v_isRef` 属性，他的值为 true，也就是说所有的计算属性 `ComputedRefImpl` 在用 `isRef` 函数判定的时候都为真。

**`_dirty = true` 声明了一个脏变量**，

接下来，实例化了 `ReactiveEffect`，传入了两个参数 `getter` 和 **匿名回调函数**，`getter` 还是我们的 fn 函数，由此可知，`computed` 传入的回调函数会被作为 `ReactiveEffect` 的 fn 函数，也就是说一旦 `this.effect.run()` 执行的时候就会调用 `fn` 函数的执行。

~~~javascript
if (!this._dirty) {
	this._dirty = true
	triggerRefValue(this)
}
~~~

当这个**匿名回调函数**执行的时候，会通过这个 `_dirty` **脏变量**进行判断，如果为假，会触发 `triggerRefValue`，我们知道 `triggerRefValue` 会 **依次派发更新**，由此可知这个**脏变量**的本质就是控制什么时候去**派发更新**。

![ReactiveEffect](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/ReactiveEffect.png)

`ComputedRefImpl` 执行完以后返回了 `cRef`（也就是`ComputedRefImpl`实例对象）

至此，`computed` 函数执行完成了，说明了我们的测试实例完成了下面代码的执行。

~~~javascript
const computedObj = computed(() => {
	return '姓名：' + obj.name
})
~~~

接下来我们进入 `effect` 函数，来触发 `computedObj.value`。

## computed 的 getter

根据我们之前在学习 `ref` 的时候可知，`.value` 属性的调用本质上是一个 **`get value` 的函数调用**，而 `computedObj` 作为 `computed` 的返回值，本质上是 `ComputedRefImpl` 的实例， 所以此时会触发 `ComputedRefImpl` 下的 `get value` 函数。

> get value() 函数能执行是因为在 effect()函数执行的时候执行了传入的 fn，触发了 computedObj.value的getter，

![effect](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/effect.png)

我们在 `get value()` 函数前打上一个断点，**（直接在打包后的vue.global.js的 1555 行打断点也可以）**

![computed2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/computed2.png)

此时 `self._dirty` 为 `true`， 进入 `trackRefValue` 函数，

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

执行 `self._dirty = false` ，如果 `_dirty = true` 则会 **触发执行依赖** ，在 **当前（标记为 `false` 之前）**，`self._dirty = true`，也就是说，在 `get value()`的时候， 

只要**脏状态**为真，**脏状态**就会设置成假，变成假之后，接下来执行 `self.effect.run()!`，执行了 `run` 方法。如果此时**脏状态**为假，会直接用上一次的 `value` 进行返回，也就是完成了计算属性的缓存功能。

我们知道 `run` 方法内部其实会触发 `fn` 函数，

![run](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/run.png)

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

通过 debugger 进入 fn 函数，发现这个fn函数就是 `computed` 函数里面传入的回调函数，

~~~javascript
const computedObj = computed(() => {
  return '姓名：' + obj.name
})
~~~

那么 `ComputedRefImpl` 的 `get value()` 函数会触发 fn 函数的执行，然而在这个 fn 函数里面执行 `obj.name`，也就会触发 `reactive` 的 `getter` 行为。

继续执行断点进入 `reactive` 的 `createGetter`，`res` 返回 **张三**，

~~~javascript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    const res = Reflect.get(target, key, receiver)
    
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    
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

完成对 `obj.name` 的依赖收集，最终 `obj.name` 返回张三，`computedObj.value` 返回 `姓名：张三`。

## ReactiveEffect 的 scheduler

我们知道对于计算属性而言，当它依赖的响应式数据发生变化时，它将重新计算。那么换句话而言就是：

> **当响应性数据触发 `setter` 时，计算属性需要触发依赖**

在上面的代码中，我们知道，当每一次 `get value` 被触发时，都会主动触发一次 **依赖收集**，但是 **触发依赖** 的地方在哪呢？

在 `ComputedRefImpl` 的构造函数中，我们创建了 `ReactiveEffect` 实例，并且传递了第二个参数，该参数为一个匿名回调函数，在这个回调函数中：我们会根据 **脏** 的状态来执行 `triggerRefValue` ，即 **触发依赖**，重新计算。

~~~javascript
this.effect = new ReactiveEffect(getter, () => {
	if (!this._dirty) {
		this._dirty = true
		triggerRefValue(this)
	}
})
~~~

那么这个 **`ReactiveEffect` 第二个参数** 究竟是什么呢？它会在什么时候被触发，以 **触发依赖** 呢？

1. ### 参数scheduler

   进入 `packages/reactivity/src/effect.ts` 中，查看 `ReactiveEffect` 的构造函数，可以看到第二个参数为 `scheduler`，

   ~~~javascript
   constructor(
     public fn: () => T,
     public scheduler: EffectScheduler | null = null,
       scope?: EffectScope
     ) {
       recordEffectScope(this, scope)
     }
   ~~~

2. `scheduler` 表示 **调度器** 的意思，我们查看 `packages/reactivity/src/effect.ts` 中 `triggerEffect` 方法，可以发现这里进行了调度器的判定：

   ~~~javascript
   export function triggerEffects(
     dep: Dep | ReactiveEffect[],
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     // spread into array for stabilization
     const effects = isArray(dep) ? dep : [...dep]
     for (const effect of effects) {
       if (effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
     for (const effect of effects) {
       if (!effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
   }
   ~~~

   当 `effect` 里面包含 `scheduler`的时候，会先执行 `scheduler`，当不包含的时候，会执行 `run` 函数，

   ~~~javascript
   function triggerEffect(
     effect: ReactiveEffect,
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     if (effect !== activeEffect || effect.allowRecurse) {
       if (__DEV__ && effect.onTrigger) {
         effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
       }
       if (effect.scheduler) {
         effect.scheduler()
       } else {
         effect.run()
       }
     }
   }
   ~~~

3. ### 跟踪 scheduler 的实现

   当实例 demo 的 `effect` 函数执行完成后， **延迟两秒之后**，会触发 `obj.name` 即 `reactive` 的 `setter` 行为，所以我们可以在 `packages/reactivity/src/baseHandlers.ts` 中为 `set` 增加一个断点： 

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/scheduler2.png" alt="scheduler2" />

   现在代码进入了 `reactive`  函数的  `setter` 行为里面，我们来追踪一下代码执行了那些操作，

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/setter.png" alt="scheduler2" style="zoom:50%;" />

   **首先**代码进入了 `trigger` 函数里面，

   ~~~javascript
   if (target === toRaw(receiver)) {
     if (!hadKey) {
       trigger(target, TriggerOpTypes.ADD, key, value)
     } else if (hasChanged(value, oldValue)) {
       trigger(target, TriggerOpTypes.SET, key, value, oldValue)
     }
   }
   ~~~

   **然后**会执行 `triggerEffects` 函数，

   ~~~javascript
   if (deps.length === 1) {
     if (deps[0]) {
       if (__DEV__) {
         triggerEffects(deps[0], eventInfo)
       } else {
         triggerEffects(deps[0])
       }
     }
   }
   ~~~

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/triggerEffects.png" alt="triggerEffects" style="zoom:50%;" />

   **在** `triggerEffects` 函数里面，会执行第一个 for 循环，因为我们在 `ComputedRefImpl` 的构造函数中，执行了 `this.effect.computed = this`，**所以此时的 `if (effect.computed)` 判断将会为 `true`**，

   **fn** 是我们 `computed`的第一个参数，除此之外还有另外一个参数 `scheduler`，**调度器**就是我们计算属性实例化的时候传入的第二个参数，

   ~~~javascript
   export function triggerEffects(
     dep: Dep | ReactiveEffect[],
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     // spread into array for stabilization
     const effects = isArray(dep) ? dep : [...dep]
     for (const effect of effects) {
       if (effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
     for (const effect of effects) {
       if (!effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
   }
   ~~~

   此时会执行 `effect.scheduler`， 因为此时的 `scheduler` 存在，

   ~~~javascript
   function triggerEffect(
     effect: ReactiveEffect,
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     if (effect !== activeEffect || effect.allowRecurse) {
       if (__DEV__ && effect.onTrigger) {
         effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
       }
       if (effect.scheduler) {
         effect.scheduler()
       } else {
         effect.run()
       }
     }
   }
   ~~~

   **进入** `effect.scheduler()` 函数，我们发现他调用的是 `ComputedRefImpl` 实例的第二个参数，也就是我们传入的那个匿名回调函数，

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/scheduler3.png" alt="scheduler3" style="zoom:50%;" />

   此时 `this` 的状态如下：

   ![_dirty](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/_dirty.png)

   **因为**在 `get Value` 的时候我们将 `_dirty` 置为了 `false`，所以在这里我们可以触发 `triggerRefValue(this)` 函数。

   ~~~javascript
   export function triggerRefValue(ref: RefBase<any>, newVal?: any) {
     ref = toRaw(ref)
     if (ref.dep) {
       if (__DEV__) {
         triggerEffects(ref.dep, {
           target: ref,
           type: TriggerOpTypes.SET,
           key: 'value',
           newValue: newVal
         })
       } else {
         triggerEffects(ref.dep)
       }
     }
   }
   ~~~

   **此时** `ref` 是 `computedRefImpl`类型的数据，  `dep` 肯定存在，执行 `triggerEffects`，这次的 `ReactiveEffect` **不再包含** 调度器，

   ![triggerEffects2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/triggerEffects2.png)

   **当前**的 `effect` 里面也没有 `computed`，所以执行了第二个 for 循环， 

   ~~~javascript
   export function triggerEffects(
     dep: Dep | ReactiveEffect[],
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     // spread into array for stabilization
     const effects = isArray(dep) ? dep : [...dep]
     for (const effect of effects) {
       if (effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
     for (const effect of effects) {
       if (!effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
   }
   ~~~

   接下来进入 `triggerEffect`，这一次在这里执行的是 `run()` 函数，**这里要明确的是，这次我们执行的 fn 函数是测试 demo `effect` 函数里面的 fn 函数，**

   ~~~javascript
   function triggerEffect(
     effect: ReactiveEffect,
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     if (effect !== activeEffect || effect.allowRecurse) {
       if (__DEV__ && effect.onTrigger) {
         effect.onTrigger(extend({ effect }, debuggerEventExtraInfo))
       }
       if (effect.scheduler) {
         effect.scheduler()
       } else {
         effect.run()
       }
     }
   }
   ~~~

   `fn` 函数的触发，标记着 `computedObj.value` 触发，而我们知道 `computedObj.value` 本质上是  `computedRefImpl`  实例  `get value()` 函数的触发，所以代码接下来会触发 **`ComputedRefImpl` 的 `get value`函数**。

4. ### 接下来进入   `get value()` 

   进入 `get value` 函数，执行 `self._value = self.effect.run()!`，而 `run` 函数的执行本质上是 `fn` 函数的执行，而此时 `fn` 函数为：

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/fn.png" alt="fn" style="zoom:50%;" />

   执行该函数得到计算的值，返回了 "李四"，最后作为 `computedObj.value` 的返回值，最终完成数据渲染，

5. ### 至此，整个 `obj.name` 引发的副作用全部执行完成。