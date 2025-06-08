declare module '../lib/wxbuf/index.js' {
  interface WxbufConfig {
    methodPrefix?: string;
    parseUrlArgs?: boolean;
    enableGlobalShareAppMessage?: boolean;
    enableGlobalShareTimeline?: boolean;
    storeKey?: string;
  }

  interface WxbufGlobal {
    extend(globalVar: string, value: any): void;
  }

  interface WxbufPage {
    extend(option: Record<string, any>): void;
  }

  interface WxbufComponent {
    extend(option: Record<string, any>): void;
  }

  interface WxbufWatch {
    (hook: string, callback: (...args: any[]) => void): void;
  }

  export const config: (option: WxbufConfig) => void;
  export const watch: WxbufWatch;
  export const page: WxbufPage;
  export const component: WxbufComponent;
  export const global: WxbufGlobal;

  const wxbuf: {
    config: (option: WxbufConfig) => void;
    watch: WxbufWatch;
    page: WxbufPage;
    component: WxbufComponent;
    global: WxbufGlobal;
  };

  export default wxbuf;
}