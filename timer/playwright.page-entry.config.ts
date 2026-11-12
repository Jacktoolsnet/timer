import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests', testMatch:'page-entry.spec.ts',
 use:{headless:true},
 webServer:{command:'python3 ../scripts/serve-page-entry-previews.py',url:'http://127.0.0.1:4390/de/',reuseExistingServer:false},
 projects:[
  {name:'desktop',use:{viewport:{width:1440,height:1000}}},
  {name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
 ],
});
