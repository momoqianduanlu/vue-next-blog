---
outline: deep
---

# reactive 响应性源码实现

通过上一节对 `reactive` 源码的阅读，我们大致熟悉了一个普通对象如何变成一个响应式对象的过程，在这个过程中我们又了解到了 `vue` 的依赖收集和派发更新，通过这两个核心观点的普及，我们又 `debugger` 了源码中的实现过程，知道了什么时候做 `track`，什么时候做 `trigger`，以及他们是怎样实现的，那么，接下来我们将用最简单的实现来打通整个 `reactive` 的实现过程，加深我们对 `reactive` 的理解。

## 构建 reactive 函数，获取 proxy 实例

整个 `reactive` 函数，本质上是返回了一个 `proxy` 实例，那么我们就先去实现这个 `reactive` 函数，得到 `proxy` 实例。

1. 创建 `reactive.ts`

~~~javascript
import { mutableHandlers } from './baseHandlers'
   
/**
 * 响应性 Map 缓存对象
 * key：target
 * val：proxy
 */
export const reactiveMap = new WeakMap<object, any>()

/**
 * 为复杂数据类型，创建响应性对象
 * @param target 被代理对象
 * @returns 代理对象
 */
export function reactive(target: object) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}

/**
 * 创建响应性对象
 * @param target 被代理对象
 * @param baseHandlers handler
 */
function createReactiveObject(
  target: object,
  baseHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<object, any>
) {
  // 如果该实例已经被代理，则直接读取即可
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 未被代理则生成 proxy 实例
  const proxy = new Proxy(target, baseHandlers)

  // 缓存代理对象
  proxyMap.set(target, proxy)
  return proxy
}
~~~

2. 创建 `baseHandlers.ts`

~~~javascript
/**
 * 响应性的 handler
 */
export const mutableHandlers: ProxyHandler<object> = {
	get,
	set
}


/**
 * getter 回调方法
 */
const get = createGetter()

/**
 * 创建 getter 回调方法
 */
function createGetter() {
	return function get(target: object, key: string | symbol, receiver: object) {
		// 利用 Reflect 得到返回值
		const res = Reflect.get(target, key, receiver)
		// 收集依赖
		track(target, key)
		return res
	}
}


/**
 * setter 回调方法
 */
const set = createSetter()

/**
 * 创建 setter 回调方法
 */
function createSetter() {
	return function set(
		target: object,
		key: string | symbol,
		value: unknown,
		receiver: object
	) {
		// 利用 Reflect.set 设置新值
		const result = Reflect.set(target, key, value, receiver)
		// 触发依赖
		trigger(target, key, value)
		return result
	}
}
~~~

## 构建 effect 函数，生成 ReactiveEffect 实例

在创建好了 `reactive` 实例之后，接下来我们需要触发 `effect` 函数，

查看的源码可知，在 `effect` 中，我们生成了 `ReactiveEffect` 实例，并且触发了 `getter（obj.name）`

~~~javascript
// 调用 effect 方法
effect(() => {
  document.querySelector('#app').innerText = obj.name
})
~~~

1. 创建 `effect` 函数

   ~~~javascript
   /**
   	* effect 函数
   	* @param fn 执行方法
   	* @returns 以 ReactiveEffect 实例为 this 的执行函数
   */
   export function effect<T = any>(fn: () => T) {
     // 生成 ReactiveEffect 实例
     const _effect = new ReactiveEffect(fn)
     // 执行 run 函数
     _effect.run()
   }
   ~~~

2. 实现 `ReactiveEffect` 类

   ~~~javascript
   /**
   	* 单例的，当前的 effect
   	*/
   export let activeEffect: ReactiveEffect | undefined
      
   /**
    * 响应性触发依赖时的执行类
    */
   export class ReactiveEffect<T = any> {
     constructor(public fn: () => T) {}
   
     run() {
       // 为 activeEffect 赋值
       activeEffect = this
   
       // 执行 fn 函数
       return this.fn()
     }
   }
   ~~~

   最终 `vue` 会执行 `effect` 传入的 回调函数，即：

   ~~~javascript
   document.querySelector('#app').innerText = obj.name
   ~~~

## track && trigger

我们在 `baseHandlers.ts` 中的代码可知，当触发 `getter` 行为时，其实我们会触发 `track` 方法，进行 **依赖收集**，当触发 `setter` 行为时，会触发 `trigger` 方法，来 **派发更新**

那么这里就涉及到了两个概念：

1. 依赖收集：`track`
2. 派发更新：`trigger`

### 什么是响应性

所谓的响应性其实指的就是：**当响应性数据触发 `setter` 时执行 `fn` 函数**

那么想要达到这样的一个目的，那就必须要在：**`getter` 时能够收集当前的 `fn` 函数，以便在 `setter` 的时候可以执行对应的 `fn` 函数**

但是对于收集而言，如果仅仅是把 `fn` 存起来还是不够的，我们还需要知道，当前的这个 `fn` 是**哪个响应式数据对象**的**哪个属性**对应的，只有这样，我们才可以在 **该属性** 触发 `setter` 的时候，准确的执行响应性。

### 如何进行依赖收集

大家还记不记得，我们在 `reactive.ts` 中创建过一个 `WeakMap`：

我们知道 `WeakMap` 它的 `key` 必须是一个对象，并且 `key` 是一个弱引用的。

**他的结构应该是这样的**

1. `key`：`target`
2. `value`: `Map`
   1. `key`：`key`
   2. `value`：`Set`

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/reactive/WeakMap.png" alt="WeakMap" style="zoom:50%;" />

那么这样我们就可以关联上 **指定对象的指定属性** 与 **执行函数 `fn`** 之间的关系，当触发 `setter` 时，直接执行 **对应对象的对应属性的 `fn`** 。

### track

上面我们已经明确了我们要实现的数据结构，

1. 创建 `effect.ts`

   ~~~javascript
   type KeyToDepMap = Map<any, ReactiveEffect>
   /**
    * 收集所有依赖的 WeakMap 实例：
    * 1. `key`：响应性对象
    * 2. `value`：`Map` 对象
    * 		1. `key`：响应性对象的指定属性
    * 		2. `value`：指定对象的指定属性的 执行函数
    */
   const targetMap = new WeakMap<any, KeyToDepMap>()
   /**
    * 用于收集依赖的方法
    * @param target WeakMap 的 key
    * @param key 代理对象的 key，当依赖被触发时，需要根据该 key 获取
    */
   export function track(target: object, key: unknown) {
   	// 如果当前不存在执行函数，则直接 return
   	if (!activeEffect) return
   	// 尝试从 targetMap 中，根据 target 获取 map
   	let depsMap = targetMap.get(target)
   	// 如果获取到的 map 不存在，则生成新的 map 对象，并把该对象赋值给对应的 value
   	if (!depsMap) {
   		targetMap.set(target, (depsMap = new Map()))
   	}
   	//为指定 map，指定key 设置回调函数
   	depsMap.set(key, activeEffect)
     // 临时打印
   	console.log(targetMap)
   }
   ~~~

### trigger

我们已经成功保存依赖到 `WeakMap` 中了，那么接下来我们就可以在 `setter` 的时候触发保存的依赖，以此来达到 **响应性** 数据的效果了，

1. 创建 `effect.ts`

   ~~~javascript
   /**
    * 触发依赖的方法
    * @param target WeakMap 的 key
    * @param key 代理对象的 key，当依赖被触发时，需要根据该 key 获取
    */
   export function trigger(
   	target: object,
   	key?: unknown
   ) {
   	// 依据 target 获取存储的 map 实例
   	const depsMap = targetMap.get(target)
   	// 如果 map 不存在，则直接 return
   	if (!depsMap) {
   		return
   	}
   	// 依据 key，从 depsMap 中取出 value，该 value 是一个 ReactiveEffect 类型的数据
   	const effect = depsMap.get(key) as ReactiveEffect
   	// 如果 effect 不存在，则直接 return
   	if (!effect) {
   		return
   	}
   	// 执行 effect 中保存的 fn 函数
   	effect.fn()
   }
   ~~~

## 构建 Dep 模块，处理一对多的依赖关系