---
outline: deep
---

# h函数对 class 和 style 的增强处理

`vue` 对 [class 和 style](https://cn.vuejs.org/guide/essentials/class-and-style.html) 做了专门的增强，使其可以支持 `Object` 和 `Array` 。

~~~javascript
<div :class="{ 'red': true }"></div>
// 渲染的结果是：
<div class="red"></div>

const activeClass = ref('active')
const errorClass = ref('text-danger')
<div :class="[active, text-danger]"></div>
// 渲染的结果是：
<div class="active text-danger"></div>
~~~

~~~javascript
const activeColor = ref('red')
const fontSize = ref(30)

<div :style="{ color: activeColor, fontSize: fontSize + 'px' }"></div>

// 绑定数组样式
<div :style="[baseStyles, overridingStyles]"></div>
~~~



我们可以写如下测试案例 `packages/vue/examples/imooc/runtime/h-element-class.html`：

~~~javascript
<script>
  const { h, render } = Vue

  const vnode = h('div', {
    class: {
      'red': true
    }
  }, '增强的 class')

  render(vnode, document.querySelector('#app'))
</script>
~~~

这样，我们可以得到一个 `class: red` 的 `div`。

![class-style](/Users/chenguosheng/Desktop/vue源码解析/vue3/vue-next-blog/docs/public/runtime/h-element/class-style.png)

这样的 `h` 函数，最终得到的 `vnode` 如下：

~~~javascript
{
  __v_isVNode: true,
  type: "div",
  shapeFlag: 9,
  props: {class: 'red'},
  children: "增强的 class"
}
~~~

由以上的 `VNode` 可以发现，最终得出的 `VNode` 与

~~~javascript
  const vnode = h('div', {
    class: 'red'
  }, 'hello render')
~~~

`h`函数返回的`vnode`是完全相同的，那么 `vue` 是如何来处理这种增强的呢？

### _createVNode

进入 `_createVNode` 的 `debugger` （**仅关注 `class` 的处理**），

~~~javascript
function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    // ...
  }

  if (isVNode(type)) {
    // ...
  }

  // class & style normalization.
  if (props) {
    // for reactive or proxy objects, we need to clone it to enable mutation.
    props = guardReactiveProps(props)!
    let { class: klass, style } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
    if (isObject(style)) {
      // reactive state objects need to be cloned since they are likely to be
      // mutated
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style)
      }
      props.style = normalizeStyle(style)
    }
  }
  // ...
}
~~~

此时 `props` 为：

~~~javascript
props: {
	class: {
    'red': true
  }
}
~~~

执行 `if (props)`，存在，进入 判断，`let { class: klass, style } = props`，得到 `klass: {red: true}`，

执行 `props.class = normalizeClass(klass)`，这里的 `normalizeClass` 方法就是处理 **`class` 增强的关键**：

### normalizeClass

~~~javascript
import { isArray, isObject, isString } from '.'

/**
 * 规范化 class 类，处理 class 的增强
 */
export function normalizeClass(value: unknown): string {
	let res = ''
	// 判断是否为 string，如果是 string 就不需要专门处理
	if (isString(value)) {
		res = value
	}
	// 额外的数组增强。官方案例：https://cn.vuejs.org/guide/essentials/class-and-style.html#binding-to-arrays
	else if (isArray(value)) {
		// 循环得到数组中的每个元素，通过 normalizeClass 方法进行迭代处理
		for (let i = 0; i < value.length; i++) {
			const normalized = normalizeClass(value[i])
			if (normalized) {
				res += normalized + ' '
			}
		}
	}
	// 额外的对象增强。官方案例：https://cn.vuejs.org/guide/essentials/class-and-style.html#binding-html-classes
	else if (isObject(value)) {
		// for in 获取到所有的 key，这里的 key（name） 即为 类名。value 为 boolean 值
		for (const name in value as object) {
			// 把 value 当做 boolean 来看，拼接 name
			if ((value as object)[name]) {
				res += name + ' '
			}
		}
	}
	// 去左右空格
	return res.trim()
}
~~~

此时 `props` 的 `class` 即为 `red`，

### normalizeStyle

~~~javascript
export function normalizeStyle(
  value: unknown
): NormalizedStyle | string | undefined {
  if (isArray(value)) {
    const res: NormalizedStyle = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const normalized = isString(item)
        ? parseStringStyle(item)
        : (normalizeStyle(item) as NormalizedStyle)
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res
  } else if (isString(value)) {
    // 字符串原样返回
    return value
  } else if (isObject(value)) {
    // 对象原样返回
    return value
  }
}

const listDelimiterRE = /;(?![^(]*\))/g
const propertyDelimiterRE = /:(.+)/

export function parseStringStyle(cssText: string): NormalizedStyle {
  const ret: NormalizedStyle = {}
  cssText.split(listDelimiterRE).forEach(item => {
    if (item) {
      const tmp = item.split(propertyDelimiterRE)
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return ret
}
~~~

对于 `class` 的增强其实还是比较简单的，只是额外对 `class` 和 `style` 进行了单独的处理。

