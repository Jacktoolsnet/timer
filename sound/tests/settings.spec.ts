import {test,expect} from '@playwright/test';
import {decodeSettings} from '../src/lib/sound-settings';
test('corrupted or incompatible local settings are ignored',()=>{
 for(const raw of [null,'{','null','{}','{"version":99}','{"version":1,"tracks":[]}']){
  expect(decodeSettings(raw)).toBeNull();
 }
});

test('global transpose accepts octave bounds and legacy settings but rejects invalid values',()=>{
 const track={enabled:true,mute:false,instrument:'piano',points:Array(16).fill(false),volume:.5,pitch:0,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null};
 const settings={version:1,style:'electronic',bpm:100,volume:.3,background:'clouds',center:'ring',orbit:'comet',tracks:Array(8).fill(track)};
 expect(decodeSettings(JSON.stringify(settings))).not.toBeNull();
 for(const transpose of [-12,0,12])expect(decodeSettings(JSON.stringify({...settings,transpose}))?.transpose).toBe(transpose);
 for(const transpose of [-13,13,.5,'12',null])expect(decodeSettings(JSON.stringify({...settings,transpose}))).toBeNull();
});
