declare module '@tarojs/taro' {
  export function getNetworkType(options: {
    success?: (res: { networkType: string }) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
  }): Promise<{ networkType: string }>;

  export function getStorage(options: {
    key: string;
    success?: (res: { data: string }) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
  }): Promise<{ data: string }>;

  export function setStorage(options: {
    key: string;
    data: string;
    success?: (res: any) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
  }): Promise<void>;

  export function removeStorage(options: {
    key: string;
    success?: (res: any) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
  }): Promise<void>;

  export function request(options: {
    url: string;
    method?: string;
    data?: any;
    header?: Record<string, string>;
    timeout?: number;
    success?: (res: any) => void;
    fail?: (res: any) => void;
    complete?: (res: any) => void;
  }): Promise<any>;
}