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
          { text: '源码实现', link: '/reactive/code' }
        ]
      },
      {
        text: 'ref的响应性',
        items: []
      },
      {
        text: 'computed && watch',
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
