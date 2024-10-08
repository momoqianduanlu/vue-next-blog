import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
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
