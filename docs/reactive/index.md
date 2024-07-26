# reactive 响应性

首先，我们先来探究 `reactive` 响应性函数的源码实现，通过 debugger 来看一下一个普通对象如何变成一个响应式对象，通过一个简单的 demo 让我们来一探究竟。

```javascript
 <script>
    const { reactive, effect } = Vue

    const obj = reactive({
      name: '张三'
    })

    effect(
      () => { document.querySelector('#app').innerText = obj.name }
    )

    setTimeout(() => {
      obj.name = '李四'
    }, 3000)
 </script>
```

在浏览器直接运行这个例子，直接进入debugger模式，

## reactive实现

```javascript
// if trying to observe a readonly proxy, return the readonly version.
if (isReadonly(target)) {
	return target
}
return createReactiveObject(
  target,
  false,
  mutableHandlers,
  mutableCollectionHandlers,
  reactiveMap
)
```

在上面的函数，target 对象不是只读的，所以直接进入 `createReactiveObject` ，此时的 `target` 仍然是我们传入的普通对象，

```javascript
if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  // target already has corresponding Proxy
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
```

在 `createReactiveObject` 函数中，这三个判断现在我们都不会命中，`proxyMap` 可以先关注一下，他是一个 `WeakMap`，后面我们会实现他，

![proxyMap](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/proxyMap.png)

```javascript
const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, proxy)
  return proxy
```

`getTargetType` 函数这里先知道这个函数返回  **'1'**，

```javascript
const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2
}
```

`target` 是我们传入的对象，那 `targetType` 对应的函数应该是 `baseHandlers`，下面我们会继续分析这个函数的实现，

`proxyMap.set(target, proxy)` 也做了存储，这样做的目的是当我们下一次用同一个 `target` 对象触发 `reactive` 函数时，我们就不再做 `proxy`了，而是通过 `proxyMap.get(target)`去获取。

我们的 `target` 对象 做了 `Proxy` 代理，最后返回了 `proxy` 代理对象，这时，完成了 `reactive` 函数的执行。

## baseHandlers 的实现

`baseHandlers` 是我们 在调用 `createReactiveObject` 函数时传递的第三个参数，而 `createReactiveObject`函数是在 `reactive`中调用的，这时 `createReactiveObject` 的第三个参数是 `mutableHandlers`。

这个函数的实现在 `baseHandlers.ts` 文件中，

```javascript
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}
```

我们关心这个函数的前两个 **参数**，一旦我们的 `target` 代理对象触发了 getter 和 setter 行为【`obj.name`】就会执行下边的函数。

~~~javascript
const get = /*#__PURE__*/ createGetter()

const set = /*#__PURE__*/ createSetter()

function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    //...
  }
}

function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    //...
  }
}
~~~

## effect 的实现

~~~javascript
export function effect<T = any>(
  fn: () => T,
  options?: ReactiveEffectOptions
): ReactiveEffectRunner {
  if ((fn as ReactiveEffectRunner).effect) {
    fn = (fn as ReactiveEffectRunner).effect.fn
  }

  const _effect = new ReactiveEffect(fn)
  if (options) {
    extend(_effect, options)
    if (options.scope) recordEffectScope(_effect, options.scope)
  }
  if (!options || !options.lazy) {
    _effect.run()
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner
  runner.effect = _effect
  return runner
}
~~~

`effect`函数的两个参数，`fn` 就是我们 demo 中传入的匿名函数，`options` 此时是 `undefined`，

`const _effect = new ReactiveEffect(fn)` 实例化这个 `ReactiveEffect` 的时候传入了 `fn`，得到了一个 `effect` 类，

~~~javascript
export class ReactiveEffect<T = any> {
  active = true
  deps: Dep[] = []
  parent: ReactiveEffect | undefined = undefined

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null,
    scope?: EffectScope
  ) {
    recordEffectScope(this, scope)
  }

  run() {
    //...
  }

  stop() {
    //...
  }
}
~~~

我们简化了 `ReactiveEffect` 类的实现，当我们实例化这个类的时候，得到了一个 `effect`  对象，

![_effect](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/_effect.png)

继续往下执行函数，会走到 `run()` 函数，

~~~javascript
if (!options || !options.lazy) {
   _effect.run()
}
~~~

对于 `run()` 函数只关注在当前 `case` 下能命中的逻辑，

~~~javascript
run() {
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
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this)
      }

      trackOpBit = 1 << --effectTrackDepth

      activeEffect = this.parent
      shouldTrack = lastShouldTrack
      this.parent = undefined

      if (this.deferStop) {
        this.stop()
      }
    }
  }
~~~

`activeEffect` 是当前正在激活的 `effect`，`this` 指向的是 `_effect` 实例，`activeEffect` 在这里是空的，

紧接着又把 this 指向了 `activeEffect`，他的目的是让我们在做毅力啊手机的时候去记录当前正在激活的 `activeEffect`，以便于在派发更新的时候能再次触发 `fn` 函数进行更新。

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/activeEffect.png" alt="activeEffect" style="zoom:50%;" />

最后执行 `return this.fn()`，也就是我们传入的匿名函数，一旦这个匿名函数执行，这里面的 `state.name` 就会触发 `getter` 行为（`obj` 是一个 `proxy`， `state.name`  会触发 `getter`），所以接下来我们就会进入到 `mutableHandlers` 的 `createGetter` 中，

### getter

~~~javascript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {

    const targetIsArray = isArray(target)

    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
  }
}
~~~

![createGetter](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/createGetter.png)

触发了该方法 `const res = Reflect.get(target, key, receiver)`，  `res` 最终拿到的值是 '张三'，

~~~javascript
if (!isReadonly) {
		track(target, TrackOpType.GET, key)
}
~~~

现在我们要重点关注这个 `track` 函数，`Vue`的响应式核心就是**依赖收集**和**派发更新**，而这里的 `track` 就是依赖收集的过程，

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

这里的 `activeEffect` 在前面的 `run` 函数中已经赋值，接下来会尝试从 `targetMap` 中取出 `target`，

![targetMap](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/targetMap.png)

如果没有则会以 `target` 为 `key`，`new map` 为 `value` 进行存储，

![targetMap2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/targetMap2.png)

`depsMap` 是新生成的，所以 dep 也不存在，接着会执行 `depsMap.set(key, (dep = createDep()))`

此时的 `key` 是 'name'，`value` 则是一个不会重复的 set 数组。

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/targetMap3.png" alt="targetMap3" style="zoom:50%;" />

`targetMap` 的组成比较复杂：

1. `key`：`target`
2. `value`：`Map`
   1. `key`：`key`
   2. `value`：`Set`

接下来继续执行 `trackEffects(dep, eventInfo)`，

~~~javascript
export function trackEffects(
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  let shouldTrack = false
  
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

`dep` 是那个不可重复的 `set` 数组，通过 `dep.add(activeEffect!)` 将 `effect` 的实例存储到了这个数组里面，此时，`dep` 的结构就变成了下面这样，

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/dep.png" alt="dep" style="zoom:50%;" />

然后又执行了 `activeEffect!.deps.push(dep)`，为 `activeEffect` 函数的 **静态属性** `deps`，增加了一个值 `dep` ，

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/dep2.png" alt="dep2" style="zoom:50%;" />

在这里我们就建立起了 `dep` 与 `activeEffect` 之间的联系，我们可以通过被代理对象指定的 `key`来获取对应的 `effect` 实例，可以说把整个 `track` 的核心逻辑说成：**收集了 `activeEffect（即：fn）`**，

### setter

三秒之后触发 `setter`，会进入到 `packages/reactivity/src/baseHandlers.ts` 中的的 `createSetter` 方法中，

~~~javascript
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key]

    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}
~~~

此时的参数如下图所示：

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/setter.png" alt="setter" style="zoom:50%;" />

1. 创建变量： `oldValue = 张三`

2. 创建变量：`value = 李四`

3. 执行 `const result = Reflect.set(target, key, value, receiver)`，即：修改了 `obj` 的值为 “李四”

4. 触发：`trigger(target, TriggerOpTypes.SET, key, value, oldValue)`，此时各参数的值为：

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/setter2.png" alt="setter2" style="zoom:50%;" />

### trigger 派发更新

`trigger` 在这里是 **触发** 的意思，那么我们来看 `trigger` 内部做了什么？

~~~javascript
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  let deps: (Dep | undefined)[] = []
  if (type === TriggerOpTypes.CLEAR) {
    //...
  } else if (key === 'length' && isArray(target)) {
    //...
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }
    
    if (deps.length === 1) {
    	if (deps[0]) {
      	if (__DEV__) {
        	triggerEffects(deps[0], eventInfo)
      	} else {
        	triggerEffects(deps[0])
      	}
    	}
  	}
  }
~~~

![trigger](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/trigger.png)

1. 首先执行：`const depsMap = targetMap.get(target)` ，其中 `targetMap` 即我们在 `track` 函数中，保存 `activeEffect` 的 `targetMap`

2. 然后代码执行到：`deps.push(depsMap.get(key))`,    ` depsMap.get(key)` 获取到的是之前保存在` Set` 数组中 `activeEffect`，

   ![deps](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/deps.png)

3. 然后触发 `triggerEffects(deps[0], eventInfo)`，

   ```javascript
   export function triggerEffects(
     dep: Dep | ReactiveEffect[],
     debuggerEventExtraInfo?: DebuggerEventExtraInfo
   ) {
     // spread into array for stabilization
     const effects = isArray(dep) ? dep : [...dep]
     for (const effect of effects) {
       if (!effect.computed) {
         triggerEffect(effect, debuggerEventExtraInfo)
       }
     }
   }
   
   
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
   ```

   - 声明常量：`const effects = isArray(dep) ? dep : [...dep]`，此时的 `effects` 保存的为 `fn` 的集合

     ![dep3](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/dep3.png)

   - 遍历 `effects`，执行：`triggerEffect(effect, debuggerEventExtraInfo)` 方法

     1. 执行 `effect.run()` 方法，已知：`effect` 是一个 `ReactiveEffect` 类型的对象，则 `run` 方法会触发 `ReactiveEffect` 的 `run`，那么我们接下来来看 **这一次** 进入 `run` 方法时，内部做了什么？

     2. 首先还是为 `activeEffect = this` 赋值，但是要 **注意：** 此时的 `this` 不再是一个 `fn`，而是一个复杂对象

        ![run](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/run.png)

     3. 最后执行 `this.fn()` 即：`effect 时传入的匿名函数`
     4. 至此，`fn` 执行，意味着： `document.querySelector('#app').innerText = 李四`，页面将发生变化。

   - `triggerEffect` 完成