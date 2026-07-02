// 最小 chrome 类型声明。
// 只用于让 TypeScript 编译通过，不改变 src/taobao-original.ts 里的原始代码逻辑。
declare const chrome: any;

declare namespace chrome {
  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }
  }
}
