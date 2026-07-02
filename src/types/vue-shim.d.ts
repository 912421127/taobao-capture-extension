// 这个文件告诉 TypeScript：遇到 .vue 文件时，把它当成一个 Vue 组件。
// 没有这个声明时，npm run compile 会不认识 App.vue。
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
