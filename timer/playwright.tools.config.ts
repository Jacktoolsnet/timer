import {defineConfig} from '@playwright/test';
/** Build all eight projects first. See scripts/serve-tool-previews.py. */
export default defineConfig({
 testDir:'./tests',testMatch:'tool-information*.spec.ts',
 use:{baseURL:'http://127.0.0.1:4350',headless:true},
 webServer:{command:'python3 ../scripts/serve-tool-previews.py',url:'http://127.0.0.1:4350/de/',reuseExistingServer:false},
 projects:[
  {name:'desktop',use:{viewport:{width:1440,height:1100}}},
  {name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
 ],
});
