import {defineConfig} from '@playwright/test';
process.env.USAGE_LOCALE_TESTS='1';
export default defineConfig({
 testDir:'./tests',testMatch:'usage-locales.spec.ts',
 use:{headless:true},
 projects:[
  {name:'desktop',use:{viewport:{width:1440,height:1100}}},
  {name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
 ],
});
