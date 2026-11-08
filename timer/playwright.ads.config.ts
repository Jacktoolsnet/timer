import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests', testMatch:'advertising.spec.ts',
 use:{headless:true},
 webServer:{command:'python3 ../scripts/serve-ad-previews.py',url:'http://127.0.0.1:4380/de/',reuseExistingServer:false},
 projects:[
  {name:'desktop',use:{viewport:{width:1440,height:1100}}},
  {name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
 ],
});
