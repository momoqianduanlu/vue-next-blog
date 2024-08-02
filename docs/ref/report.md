---
outline: deep
---

### 为什么ref使用`RefImpl`类去实现，而不是统一使用`Proxy`去代理一个拥有`value`属性的普通对象呢？

~~~javascript
const proxy = new Proxy(
  {
    value: target,
  },
  baseHandlers
);
~~~

如果是上面这样做那么就不需要使用`RefImpl`类了，全部统一成Proxy去使用响应式了。

但是上面的做法有个问题，就是使用者可以使用`delete proxy.value`将`proxy`对象的`value`属性给删除了。而使用`RefImpl`类的方式去实现就不能使用`delete`的方法去将`value`属性给删除了。