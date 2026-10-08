import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://relax.jacktools.net',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
});
