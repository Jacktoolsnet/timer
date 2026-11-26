import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
const env=loadEnv(process.env.NODE_ENV==='production'?'production':'development',fileURLToPath(new URL('.',import.meta.url)),'PUBLIC_');
const target=env.PUBLIC_BACKEND_URL||'http://127.0.0.1:4340';
export default defineConfig({
 site:'https://jacktools.net',output:'static',trailingSlash:'ignore',devToolbar:{enabled:false},
 // Keep development cookies same-origin for both localhost and 127.0.0.1.
 // Preserve the browser Origin header: backend CORS/CSRF checks still apply.
 vite:{server:{proxy:{'/api/v1':{target,changeOrigin:false}}}},
});
