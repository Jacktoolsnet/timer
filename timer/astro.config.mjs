import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://timer.jacktools.net',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
});
