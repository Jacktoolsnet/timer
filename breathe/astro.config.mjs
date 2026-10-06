import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://breathe.jacktools.net',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
});
