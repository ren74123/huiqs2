/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_KEY?: string;
  // 根据你项目 .env 中定义的变量继续扩展
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
