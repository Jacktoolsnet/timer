import { defineConfig } from 'astro/config';
import {loadEnv} from 'vite';
import {fileURLToPath} from 'node:url';
const env=loadEnv(process.env.NODE_ENV==='production'?'production':'development',fileURLToPath(new URL('.',import.meta.url)),'PUBLIC_');
export default defineConfig({
  vite:{server:{proxy:{'/api/v1/tv':{target:env.PUBLIC_BACKEND_URL||'http://127.0.0.1:4340',changeOrigin:false}}}},
  site: 'https://clock.jacktools.net',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'ignore',
});
