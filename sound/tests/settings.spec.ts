import {test,expect} from '@playwright/test';
import {decodeSettings} from '../src/lib/sound-settings';
test('corrupted or incompatible local settings are ignored',()=>{
 for(const raw of [null,'{','null','{}','{"version":99}','{"version":1,"tracks":[]}']){
  expect(decodeSettings(raw)).toBeNull();
 }
});
