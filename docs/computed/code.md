---
outline: deep
---

# computed的实现

对于 `computed` 函数的实现而言，由于他的内部逻辑非常非常的复杂，所以我们会简化内部的实现，分布来进行实现。

## 构建 ComputedRefImpl ，读取计算属性的值

我们首先的目标是：**构建 `ComputedRefImpl` 类，创建出 `computed` 方法，并且能够读取值**

~~~javascript
   import { isFunction } from '@vue/shared'
   import { Dep } from './dep'
   import { ReactiveEffect } from './effect'
   import { trackRefValue } from './ref'
   
   /**
    * 计算属性类
    */
   export class ComputedRefImpl<T> {
   	public dep?: Dep = undefined
   	private _value!: T
   
   	public readonly effect: ReactiveEffect<T>
   
   	public readonly __v_isRef = true
   
   	constructor(getter) {
   		this.effect = new ReactiveEffect(getter)
   		this.effect.computed = this
   	}
   
   	get value() {
   		// 依赖收集
   		trackRefValue(this)
   		// 执行 run 函数
   		this._value = this.effect.run()!
   		// 返回计算之后的真实值
   		return this._value
   	}
   }
   
   /**
    * 计算属性
    */
   export function computed(getterOrOptions) {
   	let getter
   
   	// 判断传入的参数是否为一个函数
   	const onlyGetter = isFunction(getterOrOptions)
   	if (onlyGetter) {
   		// 如果是函数，则赋值给 getter
   		getter = getterOrOptions
   	}
   
   	const cRef = new ComputedRefImpl(getter)
   
   	return cRef as any
   }
~~~

## computed 的响应性：初见调度器，处理脏的状态

根据之前的代码可知，如果我们想要实现 **响应性**，那么必须具备两个条件：

1. 收集依赖：该操作我们目前已经在 `get value` 中进行。
2. 触发依赖：该操作我们目前尚未完成，而这个也是我们本小节主要需要做的事情。

~~~javascript
() => {
  if (!this._dirty) {
    this._dirty = true
    triggerRefValue(this)
  }
}
~~~

这个参数是一个匿名函数，被叫做 `scheduler` 调度器。

该匿名函数中，又涉及到了一个 `_dirty` 变量，该变量我们把它叫做 **脏**。

那么想要实现 `computed` 的响应性，就必须要搞明白这两个东西的概念：

### 调度器

调度器 `scheduler` 是一个相对比较复杂的概念，它在 `computed` 和 `watch` 中都有涉及，但是在当前的 `computed` 实现中，它的作用还算比较清晰。

所以根据我们秉承的：**没有使用就当做不存在** 的理念，我们只需要搞清楚，它在当前的作用即可。

根据我们看的源码，我们可以知道，此时的 `scheduler` 就相当于一个 **回调函数**。

在 `triggerEffect` 只要 `effect` 存在 `scheduler`，则就会执行该函数。

### _dirty 脏

对于 `dirty` 而言，相对比较简单了。

它只是一个变量，我们只需要知道：**它为 false 时，表示需要触发依赖。为 true 时表示需要重新执行 run 方法，获取数据。** 即可。

1. 处理脏状态

   ~~~javascript
      export class ComputedRefImpl<T> {
      	...
      
      	/**
      	 * 脏：为 false 时，表示需要触发依赖。为 true 时表示需要重新执行 run 方法，获取数据。即：数据脏了
      	 */
      	public _dirty = true
      
      	constructor(getter) {
      		this.effect = new ReactiveEffect(getter, () => {
      			// 判断当前脏的状态，如果为 false，表示需要《触发依赖》
      			if (!this._dirty) {
      				// 将脏置为 true，表示
      				this._dirty = true
      				triggerRefValue(this)
      			}
      		})
      		this.effect.computed = this
      	}
      
      	get value() {
      		// 收集依赖
      		trackRefValue(this)
      		// 判断当前脏的状态，如果为 true ，则表示需要重新执行 run，获取最新数据
      		if (this._dirty) {
      			this._dirty = false
      			// 执行 run 函数
      			this._value = this.effect.run()!
      		}
      
      		// 返回计算之后的真实值
      		return this._value
      	}
      }
   ~~~

2. 添加 `scheduler`

   ~~~javascript
      export type EffectScheduler = (...args: any[]) => any
      
      
      /**
       * 响应性触发依赖时的执行类
       */
      export class ReactiveEffect<T = any> {
      	/**
      	 * 存在该属性，则表示当前的 effect 为计算属性的 effect
      	 */
      	computed?: ComputedRefImpl<T>
      
      	constructor(
      		public fn: () => T,
      		public scheduler: EffectScheduler | null = null
      	) {}
      	...
      }
   ~~~

3. 触发调度器函数

   ~~~javascript
      /**
       * 触发指定依赖
       */
      export function triggerEffect(effect: ReactiveEffect) {
        // 存在调度器就执行调度函数
        if (effect.scheduler) {
          effect.scheduler()
        } 
        // 否则直接执行 run 函数即可
        else {
          effect.run()
        }
      }
   ~~~

## computed 的缓存性

`computed` 区别于 `function` 最大的地方就是：**computed 具备缓存**，当多次触发计算实行时，那么计算属性只会计算 **一次**。

那么秉承着这样的一个理念，我们来创建一个测试用例：

~~~javascript
   <script>
     const { reactive, computed, effect } = Vue
   
     const obj = reactive({
       name: '张三'
     })
   
     const computedObj = computed(() => {
       console.log('计算属性执行计算');
       return '姓名：' + obj.name
     })
   
     effect(() => {
       document.querySelector('#app').innerHTML = computedObj.value
       document.querySelector('#app').innerHTML = computedObj.value
     })
   
     setTimeout(() => {
       obj.name = '李四'
     }, 2000);
   </script>
~~~

运行到浏览器，我们发现当前代码出现了 **死循环** 的问题，

### 为什么会出现死循环呢？

我们为当前的代码进行 `debugger`，查看出现该问题的原因。我们知道这个死循环是在 **延迟两秒后** 出现的，而延迟两秒之后是 `obj.name` 的调用，

即： `reactive` 的 `setter` 行为被触发，也就是 `trigger` 方法触发时：

<img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-1.png" alt="cache-1" style="zoom:50%;" />

在 `effect.ts` 文件中打上断点，现在的 `target` 是 '李四'，也就是说当前 demo 中执行的是 `obj.name = '李四'` 这行代码，而依赖收集的过程已经在前面完成了，当断点执行到获取 `dep` 这里的时候，我们要注意的是 `depsMap` 是有值的，这是因为我们之前已经完成了依赖收集。

![cache-2](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-2.png)

接下来进入 `triggerEffects` 函数，此时的 `effect` 就是一个 `computed` 的 `ReactiveEffect`，

![cache-3](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-3.png)

因为这是一个 `computed` 的 `ReactiveEffect`， 接下来继续执行 `effect.scheduler()` 这个调度器回调函数。

进入这个回调函数中，因为现在的 `_dirty` 为 `false`，所以我们会继续执行 `triggerRefValue(this)`函数，也就是再次进行**派发更新**，

![cache-4](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-4.png)

进入 `triggerRefValue(this)`函数中，我们发现我们的代码又回来了，**但是，这里有一处不同，那就是我们的 `effects`里面有两个 `ReactiveEffect`，**

![cache-6](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-6.png)

事实上，从图中也可以看出来，第一个 `ReactiveEffect` 他不是我们 `computed` 的 `ReactiveEffect`，第二个才是我们 `computed` 生成的 `ReactiveEffect`，这个不同明确了以后，我们还是要执行 `triggerEffect(effect)`，

~~~javascript
export function triggerEffect(effect: ReactiveEffect) {
  console.log('trigger: 触发依赖')
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}
~~~

**第一次先执行了 `effect.run()`**，执行 `this.fn`，最终走到了，

![cache-7](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-7.png)

在这里要特别注意的是 `computedObj.value`的访问，当执行到这里的时候本质上会触发 `computedRefImpl`的 `get value` 函数，

![cache-8](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-8.png)

`get value` 的触发又会执行依赖收集的操作，检查 `_dirty` 状态，此时是 `true`，**然后置为` false`** ，所以又会执行 `run`函数，

**get value 依赖收集后执行 run 函数**

![cache-9](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-9.png)

一旦这个 `fn` 函数执行完成，页面数据就会变成 `李四`，当我们的第一个 `get value` 执行完成后，又接着执行了第二个 `get value`，

![cache-10](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-10.png)

![cache-11](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-11.png)

先收集了依赖，**这是第二次收集了**，然后判断 `_dirty` 的状态，此时为 `false`，不会执行 `run` 函数， 最后返回 `this._value`。

其实走到这里我们希望代码就结束了，但是，我们的代码并没有结束，继续执行断点，会发现，我们的代码又回到了 `triggerEffects` 里面，这是因为我们刚刚完成的是第一轮的循环，现在我们要开始执行第二次的循环操作，这时的 `ReactiveEffect`是 `computed` 生成的 `ReactiveEffect`。

![cache-12](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-12.png)

进入到 调度器回调函数里面，代码会再次执行 `triggerRefValue`，因为上面执行 `get value` 的时候将 `_dirty` 脏状态 只为了 `false`。

![cache-13](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-13.png)

进入 `triggerRefValue`，再次进行派发更新的操作，

![cache-14](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-14.png)

代码其实又回来了，这个时候我们还是要看`effects`里面是什么，没有意外，跟上面第一次开启 计算属性的 派发更新一样，我们要再一次执行上面的循环操作，循环执行这两个 `ReactiveEffect`中的 fn 函数，这样一轮又一轮的执行这个过程，造成了我们的死循环。 

### 如何解决死循环

想要解决这个死循环的问题，其实比较简单，我们只需要在 `packages/reactivity/src/effect.ts` 中的 `triggerEffects` 中修改如下代码：

~~~javascript
export function triggerEffects(dep: Dep) {
	// 把 dep 构建为一个数组
	const effects = isArray(dep) ? dep : [...dep]
	// 依次触发
	// for (const effect of effects) {
	// 	triggerEffect(effect)
	// }

	// 不在依次触发，而是先触发所有的计算属性依赖，再触发所有的非计算属性依赖
	for (const effect of effects) {
		if (effect.computed) {
			triggerEffect(effect)
		}
	}
	for (const effect of effects) {
		if (!effect.computed) {
			triggerEffect(effect)
		}
	}
}
~~~

那么为什么这样就可以解决死循环的 `bug` 呢？

我们再按照刚才的顺序跟踪下代码进行查看：

1. 延迟两秒之后，进入断点

   <img src="/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-1.png" alt="cache-1" style="zoom:50%;" />

2. 此时执行的代码是 `obj.name = '李四'`，所以在 `target` 为 `{name: '李四'}`

3. 代码继续向下进行，进入 `triggerEffects(dep)` 方法，在 `triggerEffects(dep)` 方法中，继续进入 `triggerEffect(effect)`，

   ![cache-15](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-15.png)

4. 此时因为 `effect` 中存在 `scheduler`，所以会执行该计算属性的 `scheduler` 函数，在 `scheduler` 函数中，会触发 `triggerRefValue(this)`，而 `triggerRefValue` 则会再次触发 `triggerEffects`

   ![cache-4](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-4.png)

5. **不同从这里开始**

   ![cache-6](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-6.png)

6. 因为此时我们在 `triggerEffects` 中，增加了 **判断逻辑**，所以 **永远会先触发** 计算属性的 `effect`，所以此时再次进入到 `triggerEffect` 时，此时的 `effect` 依然为 **计算属性的 `effect`**

   ![cache-16](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-16.png)

7. 从而因为存在 `scheduler`，所以会执行：

   ~~~javascript
   () => {
   			// 判断当前脏的状态，如果为 false，表示需要《触发依赖》
   			if (!this._dirty) {
   				// 将脏置为 true，表示
   				this._dirty = true
   				triggerRefValue(this)
   			}
   		})
   ~~~

   但是此时要注意：**此时 _dirty 脏的状态** 为 `true`，即：**不会触发 `triggerRefValue` 来触发依赖**，此次计算属性的 `scheduler` 调度器会 **直接结束**。

8. 然后代码 **跳回到 `triggerEffects` 两次循环中**，使用 **非计算属性的 `effect`** 执行 `triggerEffect` 方法

   ![cache-17](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-17.png)

9. 本次进入 `triggerEffect` 时，`effect` 数据如下：

   ![cache-7](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-7.png)

10. 那么这次 `run` 的执行会触发 **两次 `computed` 的 `get value`**函数

    所以代码会进入到 `computed` 的 `get value` 中：

    1. 第一次进入：

       1. 进入 `computed` 的 `get value` ：

       2. 首先收集依赖

       3. 接下来检查 `dirty`脏的状态，执行 `this.effect.run()!`

       4. 获取最新值，返回 '李四'

          ![cache-18](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-18.png)

          ![cache-19](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-19.png)

    2. 第二次进入：

       1. 进入 `computed` 的 `get value` ：

       2. 首先收集依赖

       3. 接下来检查 `dirty`脏的状态，**因为在上一次中 `dirty` 已经为 `false` **，所以本次 **不会在触发 `this.effect.run()!`**

       4. 直接返回结束

          ![cache-20](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/computed/cache-20.png)

11. 所有代码逻辑结束。

    

    

    











































 