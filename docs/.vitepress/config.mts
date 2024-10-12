import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/vue-next-blog/',
  lang: 'en-US',
  title: "Vue3源码解析",
  description: "Vue3源码学习笔记",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Vue2源码解析', link: 'https://momoqianduanlu.github.io/vue-analysis-blog/' },
    ],
    sidebar: [
      {
        text: 'reactive的响应性',
        items: [
          { text: '源码阅读', link: '/reactive/' },
          { text: '源码实现', link: '/reactive/code' },
          { text: '总结', link: '/reactive/report' },
        ]
      },
      {
        text: 'ref的响应性',
        items: [
          { text: '源码阅读', link: '/ref/' },
          { text: '源码实现', link: '/ref/code' },
          { text: '总结', link: '/ref/report' },
        ]
      },
      {
        text: 'computed',
        items: [
          { text: '源码阅读', link: '/computed/' },
          { text: '源码实现', link: '/computed/code' },
          { text: '总结', link: '/computed/report' },
        ]
      },
      {
        text: 'watch',
        items: [
          { text: '源码阅读', link: '/watch/' },
          { text: '源码实现', link: '/watch/code' },
          { text: '总结', link: '/watch/report' },
        ]
      },
      {
        text: 'runtime运行时',
        items: [
          { text: 'HTML DOM 节点树与虚拟 DOM 树', link: '/runtime/tree/' },
          { text: '挂载与更新', link: '/runtime/mount-patch/' },
          { text: 'h 函数 与 render 函数', link: '/runtime/h-render/' },
          { text: '运行时核心设计原则', link: '/runtime/' }
        ]
      },
      {
        text: 'runtime运行时-h',
        items: [
          { text: '开始', link: '/h/start' },
          { text: 'h函数构建ELEMENT节点', link: '/h/textChildren' },
          { text: 'h函数构建ELEMENT + ARRAY_CHILDREN节点', link: '/h/arrayChildren' },
          { text: 'h函数处理组件VNode', link: '/h/createVNode' },
          { text: 'h函数对 class 和 style 的增强处理', link: '/h/other' },
        ]
      },
      {
        text: 'runtime运行时-renderer',
        items: [
          { text: '初见 render函数，ELEMENT 节点的挂载操作', link: '/render/index' },
        ]
      },
      {
        text: 'runtime运行时-组件化',
        items: []
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/momoqianduanlu' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present eastern'
    }
  }
})
