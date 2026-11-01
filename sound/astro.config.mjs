import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://sound.jacktools.net',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
});
