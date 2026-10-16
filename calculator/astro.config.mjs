import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://calculator.jacktools.net',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
});
