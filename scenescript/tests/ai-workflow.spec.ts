import {test,expect,type Page} from './helpers/editor-test';
import {demoProject,type Project} from '../src/lib/model';
import {newStoryboard} from '../src/lib/storyboard';
import {defaultNarration} from '../src/lib/audio';
import {DEFAULT_PROJECT_URL} from '../src/lib/startup-project';
import {readFile} from 'node:fs/promises';
const password='Workflow-Fake-Password42!',openai='sk-FAKE-workflow-key',elevenlabs='el-FAKE-workflow-key';
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'POST,GET,OPTIONS'};
function fixture(){const p=demoProject(),b=newStoryboard('Space plan');b.story='A robot visits the moon.';b.shots=[{id:'shot',title:'Arrival',duration:3,action:'Land',camera:'Wide',audio:'',image:null,characters:[],settings:[],status:'approved',comments:[]}];b.approved=true;b.comments=[{id:'note',text:'Keep the robot blue',resolved:true,reply:'Done'}];p.storyboard=b;return p;}
async function setup(page:Page,p=fixture(),lang='en'){
 await page.route('https://api.openai.com/**',r=>r.fulfill({status:500,headers:cors,body:'Unexpected API call'}));
 await page.route('https://api.elevenlabs.io/**',r=>r.fulfill({status:500,headers:cors,body:'Unexpected API call'}));
 await page.route('**'+DEFAULT_PROJECT_URL,r=>r.fulfill({contentType:'application/json',body:JSON.stringify(p)}));
 await page.goto('/'+lang+'/');await page.locator('#open-api-vault').click();await page.locator('#api-vault-password').fill(password);await page.locator('#api-vault-repeat').fill(password);await page.locator('#api-vault-openai').fill(openai);await page.locator('#api-vault-elevenlabs').fill(elevenlabs);await page.locator('#api-vault-consent').check();await page.locator('#api-vault-submit').click();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','unlocked');await page.locator('#api-vault-close').click();
}
async function exportProject(page:Page):Promise<Project>{const pending=page.waitForEvent('download');await page.locator('#save-project').click();return JSON.parse(await readFile((await(await pending).path())!,'utf8'));}
const response=(text:string)=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text}]}]});
async function generate(page:Page){await page.locator('#ai-workflow-consent').check();await page.locator('#ai-workflow-start').click();}

test('direct planning unlocks, returns a review draft and supports saving and Undo without exporting credentials',async({page})=>{
 await setup(page);const before=await exportProject(page);await page.locator('#open-api-vault').click();await page.locator('#api-vault-lock').click();await page.locator('#api-vault-close').click();let calls=0;
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const raw=r.request().postData()!;for(const secret of [password,openai,elevenlabs])expect(raw).not.toContain(secret);expect(r.request().headers().authorization).toBe('Bearer '+openai);const input=JSON.parse(JSON.parse(raw).input[0].content[0].text);const data=input.storyboard;data.board.title='Moon adventure';data.board.approved=false;data.board.shots[0].status='draft';await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-ai-workflow').click();await expect(page.locator('#api-unlock-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#api-vault-dialog')).not.toBeVisible();await expect(page.locator('#api-unlock-password')).toBeFocused();expect(calls).toBe(0);await page.locator('#api-unlock-password').fill('wrong-password');await page.locator('#api-unlock-submit').click();await expect(page.locator('#api-unlock-error')).toContainText('Incorrect password');await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await page.locator('#api-unlock-password').fill(password);await page.locator('#api-unlock-submit').click();await expect(page.locator('#api-unlock-dialog')).not.toBeVisible();await expect(page.locator('#api-unlock-password')).toHaveValue('');await expect(page.locator('#ai-workflow-start')).toBeDisabled();expect(calls).toBe(0);await page.locator('#ai-workflow-prompt').fill('Make the story more exciting');await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();expect(calls).toBe(1);await expect(page.locator('#project-title')).toHaveValue(before.title);await expect(page.locator('#storyboard-content')).toContainText('Moon adventure');await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();
 const after=await exportProject(page);expect(after.storyboard!.title).toBe('Moon adventure');expect(after.storyboard!.comments).toEqual(before.storyboard!.comments);expect(after.storyboard!.approved).toBe(false);expect(after.scenes).toEqual(before.scenes);for(const secret of [password,openai,elevenlabs])expect(JSON.stringify(after)).not.toContain(secret);await page.locator('#undo-project').click();expect((await exportProject(page)).storyboard!.title).toBe(before.storyboard!.title);
});

test('storyboard toolbar edits the unsaved draft, not the executable project',async({page})=>{
 await setup(page);const before=await exportProject(page);
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}const input=JSON.parse(r.request().postDataJSON().input[0].content[0].text),data=input.storyboard;data.board.title='Draft revision';data.board.approved=false;data.board.shots[0].status='draft';await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-storyboard').click();await page.locator('#storyboard-ai-open').click();await generate(page);await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-content')).toContainText('Draft revision');await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();const after=await exportProject(page);expect(after.storyboard!.title).toBe('Draft revision');expect(after.scenes).toEqual(before.scenes);
});

test('SceneScript keeps approved storyboard and applies only on confirmation',async({page})=>{
 await setup(page);const before=await exportProject(page);
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}const project=JSON.parse(r.request().postDataJSON().input[0].content[0].text).project;project.title='Generated film';project.storyboard=null;await r.fulfill({headers:cors,json:response(JSON.stringify(project))});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('script');await generate(page);await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await expect(page.locator('#project-title')).toHaveValue(before.title);await page.locator('#ai-workflow-apply').click();const after=await exportProject(page);expect(after.title).toBe('Generated film');expect(after.storyboard).toEqual(before.storyboard);await page.locator('#undo-project').click();await expect(page.locator('#project-title')).toHaveValue(before.title);
});

test('rejected and stale results show copyable errors without retry or overwriting',async({page})=>{
 await setup(page);let calls=0;
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;await r.fulfill({status:429,headers:cors,json:{error:{message:openai}}});});
 await page.locator('#open-ai-workflow').click();await generate(page);await expect(page.locator('#ai-workflow-error')).toHaveValue(/quota/);await expect(page.locator('#ai-workflow-error')).toHaveAttribute('readonly','');await expect(page.locator('#ai-workflow-apply')).toBeDisabled();expect(calls).toBe(1);await expect(page.locator('#ai-workflow-error')).not.toHaveValue(new RegExp(openai));
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}await gate;const data=JSON.parse(r.request().postDataJSON().input[0].content[0].text).storyboard;data.board.approved=false;await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#ai-workflow-close').click();await page.locator('#open-ai-workflow').click();await generate(page);await expect(page.locator('#ai-workflow-spinner')).toBeVisible();await page.evaluate(()=>{const title=document.querySelector<HTMLInputElement>('#project-title')!;title.value='Concurrent';title.dispatchEvent(new Event('input',{bubbles:true}));});release();await expect(page.locator('#ai-workflow-error')).toHaveValue(/changed/);await page.locator('#ai-workflow-close').click();await expect(page.locator('#project-title')).toHaveValue('Concurrent');
});

test('image API cover is previewed and stored only after apply',async({page})=>{
 await setup(page);const before=await exportProject(page),png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 await page.route('https://api.openai.com/v1/images/generations',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}expect(r.request().postDataJSON().n).toBe(1);await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('image');await page.locator('#ai-workflow-prompt').fill('Robot on the moon');await generate(page);await expect(page.locator('#ai-workflow-image-preview')).toBeVisible();await page.locator('#ai-workflow-image-enlarge').click();await expect(page.locator('#image-viewer-dialog')).toBeVisible();await expect(page.locator('#image-viewer-plus')).toBeEnabled();await page.locator('#image-viewer-close').click();await expect(page.locator('#ai-workflow-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-image-enlarge')).toBeFocused();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await page.locator('#ai-workflow-apply').click();const after=await exportProject(page);expect(after.thumbnail!.data).toContain('data:image/png;base64,');expect(await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();return [img.naturalWidth,img.naturalHeight];},after.thumbnail!.data)).toEqual([1536,864]);expect(after.storyboard).toEqual(before.storyboard);
});

function wav(seconds:number){const length=16000*seconds,buffer=Buffer.alloc(44+length*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(16000,24);buffer.writeUInt32LE(32000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length*2,40);return buffer;}
test('ElevenLabs speech uses selected voice and extends scenes based on decoded duration',async({page})=>{
 const p=fixture();p.scenes[0].duration=.5;p.scenes[0].narration={...defaultNarration(),text:'Welcome to the moon.',instructions:'With excitement',speaker:'Pilot'};await setup(page,p);let calls=0;
 await page.route('https://api.elevenlabs.io/v1/text-to-speech/Voice123?output_format=mp3_44100_128',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;expect(r.request().headers()['xi-api-key']).toBe(elevenlabs);expect(r.request().postDataJSON()).toEqual({text:'Welcome to the moon.',model_id:'eleven_multilingual_v2'});await r.fulfill({headers:cors,contentType:'audio/mpeg',body:wav(2)});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('speech');await page.locator('#ai-workflow-voice').fill('Voice123');await generate(page);await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await expect(page.locator('#ai-workflow-audios audio')).toHaveCount(1);expect(calls).toBe(1);await page.locator('#ai-workflow-apply').click();const after=await exportProject(page);expect(after.scenes[0].duration).toBeCloseTo(2);expect(after.audios[after.scenes[0].narration!.asset].duration).toBeCloseTo(2);
});

test('unapproved script generation is blocked locally before sending any request',async({page})=>{
 const p=fixture();p.storyboard!.approved=false;await setup(page,p);let requests=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('api.openai.com'))requests++;});await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('script');await generate(page);await expect(page.locator('#ai-workflow-error')).toHaveValue(/approve/);expect(requests).toBe(0);await expect(page.locator('#ai-workflow-apply')).toBeDisabled();
});

test('cancelling an unlock request never calls the paid endpoint',async({page})=>{
 await setup(page);await page.locator('#open-api-vault').click();await page.locator('#api-vault-lock').click();await page.locator('#api-vault-close').click();let requests=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('api.openai.com'))requests++;});await page.locator('#open-ai-workflow').click();await expect(page.locator('#api-unlock-dialog')).toBeVisible();await page.locator('#api-unlock-close').click();await expect(page.locator('#api-unlock-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();expect(requests).toBe(0);await page.locator('#open-ai-workflow').click();await expect(page.locator('#api-unlock-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#api-unlock-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();
});

test('partial speech batches can be applied and missing-recording runs skip completed audio',async({page})=>{
 const p=fixture();p.scenes[0].narration={...defaultNarration(),text:'First line'};p.scenes[1].narration={...defaultNarration(),text:'Second line'};await setup(page,p);const texts:string[]=[];
 await page.route('https://api.elevenlabs.io/v1/text-to-speech/Voice123?output_format=mp3_44100_128',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}const text=r.request().postDataJSON().text;texts.push(text);if(text==='Second line'&&texts.length===2)await r.fulfill({headers:cors,status:429,body:'Limited'});else await r.fulfill({headers:cors,contentType:'audio/mpeg',body:wav(2)});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('speech');await page.locator('#ai-workflow-voice').fill('Voice123');await generate(page);await expect(page.locator('#ai-workflow-error')).toHaveValue(/Limited/);await page.locator('#ai-workflow-close').click();await expect(page.locator('#ai-workflow-status')).toHaveText(/Some recordings/);await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await page.locator('#ai-workflow-apply').click();const partial=await exportProject(page);expect(partial.scenes[0].narration!.asset).toBeTruthy();expect(partial.scenes[1].narration!.asset).toBe('');
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('speech');await generate(page);await expect(page.locator('#ai-workflow-status')).toHaveText(/Ready/);await page.locator('#ai-workflow-apply').click();expect(texts).toEqual(['First line','Second line','Second line']);const after=await exportProject(page);expect(after.scenes[1].narration!.asset).toBeTruthy();expect(Object.keys(after.audios)).toHaveLength(2);
});

test('generated subject sketches require fresh subject and dependent scene review',async({page})=>{
 const p=fixture();p.storyboard!.characters=[{id:'robot',kind:'character',name:'Robot',description:'Blue robot',image:null,status:'approved',comments:[]}];p.storyboard!.shots[0].characters=['robot'];await setup(page,p);const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 await page.route('https://api.openai.com/v1/images/generations',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}const prompt=r.request().postDataJSON().prompt;expect(prompt).toContain('ONLY the selected character');expect(prompt).toContain('Blue robot');expect(prompt).toContain('One character, one pose, one view');expect(prompt).not.toContain('A robot visits the moon.');expect(prompt).not.toContain('Always write AI-authored replies');expect(prompt).toContain('Produce an image, not a written reply');await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('image');await page.locator('#ai-workflow-target').selectOption('characters:robot');await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();const after=await exportProject(page);expect(after.storyboard!.approved).toBe(false);expect(after.storyboard!.characters[0].status).toBe('draft');expect(after.storyboard!.shots[0].status).toBe('draft');expect(after.storyboard!.images[after.storyboard!.characters[0].image!].data).toContain('data:image/png');
});


for(const [lang,name,reply]of [['en','English','Understood'],['de','German','Verstanden'],['es','Spanish','Entendido'],['fr','French','Compris']])test(`AI language follows ${lang} app settings, not the English video`,async({page})=>{
 const p=fixture();p.storyboard!.language='English';await setup(page,p,lang);let calls=0;
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON();expect(body.instructions).toContain(`App reply language: ${name} (${lang}).`);expect(body.instructions).toContain('video/content language separate');const data=JSON.parse(body.input[0].content[0].text).storyboard;expect(data.board.language).toBe('English');data.board.approved=false;data.board.comments[0].reply=reply;await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-ai-workflow').click();await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();const after=await exportProject(page);expect(after.storyboard!.language).toBe('English');expect(after.storyboard!.comments[0].reply).toBe(reply);expect(after.storyboard!.comments[0].text).toBe('Keep the robot blue');expect(calls).toBe(1);
});

test('speech batches use different storyboard-assigned voices without a fallback',async({page})=>{
 const p=fixture();p.storyboard!.characters=[{id:'hero',kind:'character',name:'Hero',description:'',image:null,status:'approved',comments:[],voice:{provider:'elevenlabs',id:'HeroVoice',name:'Hero'}},{id:'computer',kind:'object',name:'Computer',description:'',image:null,status:'approved',comments:[],voice:{provider:'elevenlabs',id:'ComputerVoice',name:'Computer'}}];p.scenes[0].narration={...defaultNarration(),text:'Hero speaking',speaker:'hero'};p.scenes[1].narration={...defaultNarration(),text:'Computer speaking',speaker:'computer'};await setup(page,p);const calls:string[]=[];
 await page.route('https://api.elevenlabs.io/v1/text-to-speech/**',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls.push(new URL(r.request().url()).pathname.split('/').pop()!);await r.fulfill({headers:cors,contentType:'audio/mpeg',body:wav(2)});});await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('speech');await expect(page.locator('#ai-workflow-voice')).toHaveValue('');await generate(page);await expect(page.locator('#ai-workflow-apply')).toBeEnabled();expect(calls).toEqual(['HeroVoice','ComputerVoice']);await page.locator('#ai-workflow-apply').click();const after=await exportProject(page);expect(after.scenes.every(s=>!!s.narration?.asset)).toBe(true);expect(after.storyboard!.characters[0].voice!.id).toBe('HeroVoice');
});

test('missing speaker voice blocks the entire batch before any paid call',async({page})=>{
 const p=fixture();p.storyboard!.characters=[{id:'hero',kind:'character',name:'Hero',description:'',image:null,status:'approved',comments:[],voice:{provider:'elevenlabs',id:'HeroVoice',name:'Hero'}}];p.scenes[0].narration={...defaultNarration(),text:'First',speaker:'hero'};p.scenes[1].narration={...defaultNarration(),text:'Second',speaker:'unassigned'};await setup(page,p);let paid=0;page.on('request',r=>{if(r.url().includes('api.elevenlabs.io/v1/text-to-speech')&&r.method()==='POST')paid++;});await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('speech');await generate(page);await expect(page.locator('#ai-workflow-error')).toHaveValue(/assign/);await expect(page.locator('#ai-workflow-apply')).toBeDisabled();expect(paid).toBe(0);
});

test('model list uses the account key without generation and exposes only relevant models',async({page})=>{
 await setup(page);let reads=0,paid=0;await page.route('https://api.openai.com/v1/models',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}reads++;expect(r.request().method()).toBe('GET');expect(r.request().postData()).toBeNull();expect(r.request().headers().authorization).toBe('Bearer '+openai);await r.fulfill({headers:cors,json:{data:['gpt-6.1-sol','gpt-6-astra','gpt-6-luna','gpt-5-mini','gpt-image-2','text-embedding-3-small','gpt-audio'].map(id=>({id}))}});});
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}paid++;const body=r.request().postDataJSON();expect(body.model).toBe('gpt-6.1-sol');expect(body.reasoning).toEqual({effort:'high'});expect(body).not.toHaveProperty('max_output_tokens');const data=JSON.parse(body.input[0].content[0].text).storyboard;data.board.approved=false;await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-ai-workflow').click();await expect(page.locator('#ai-workflow-model-choice')).toHaveValue('gpt-5-mini');expect(reads).toBe(0);await page.locator('#ai-workflow-model-load').click();await expect(page.locator('#ai-workflow-model-status')).toHaveText(/Models loaded/);expect(reads).toBe(1);expect(paid).toBe(0);await expect(page.locator('#ai-workflow-model-choice option[value="gpt-image-2"]')).toHaveCount(0);await expect(page.locator('#ai-workflow-model-choice option[value="text-embedding-3-small"]')).toHaveCount(0);await page.locator('#ai-workflow-model-choice').selectOption('gpt-6.1-sol');await page.locator('#ai-workflow-reasoning').selectOption('high');await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();expect(paid).toBe(1);
});

test('reasoning options follow model capabilities and recommendations require an explicit click',async({page})=>{
 await setup(page);await page.locator('#open-ai-workflow').click();await expect(page.locator('#ai-workflow-model-choice')).toHaveValue('gpt-5-mini');await page.locator('#ai-workflow-use-recommendation').click();await expect(page.locator('#ai-workflow-model-choice')).toHaveValue('gpt-6.1-sol');await expect(page.locator('#ai-workflow-reasoning')).toHaveValue('medium');await expect(page.locator('#ai-workflow-reasoning option[value=none]')).toHaveCount(0);await expect(page.locator('#ai-workflow-reasoning option[value=minimal]')).toHaveCount(0);await page.locator('#ai-workflow-reasoning').selectOption('max');await page.locator('#ai-workflow-model-choice').selectOption('gpt-5-mini');await expect(page.locator('#ai-workflow-reasoning')).toHaveValue('');await expect(page.locator('#ai-workflow-reasoning option[value=minimal]')).toHaveCount(1);
 await page.locator('#ai-workflow-model-choice').selectOption('__manual');await page.locator('#ai-workflow-model').fill('gpt-future-model');await expect(page.locator('#ai-workflow-reasoning')).toBeDisabled();await expect(page.locator('#ai-workflow-reasoning-hint')).toContainText('Unknown');await page.locator('#ai-workflow-action').selectOption('script');await page.locator('#ai-workflow-use-recommendation').click();await expect(page.locator('#ai-workflow-reasoning')).toHaveValue('high');await page.locator('#ai-workflow-action').selectOption('image');await expect(page.locator('#ai-workflow-reasoning-options')).not.toBeVisible();await page.locator('#ai-workflow-action').selectOption('speech');await expect(page.locator('#ai-workflow-reasoning-options')).not.toBeVisible();
});

test('restricted model-list access retains manual input and default reasoning is omitted',async({page})=>{
 await setup(page);let reads=0;await page.route('https://api.openai.com/v1/models',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}reads++;await r.fulfill({headers:cors,status:403,json:{error:{message:openai}}});});await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}const body=r.request().postDataJSON();expect(body.model).toBe('gpt-future-model');expect(body).not.toHaveProperty('reasoning');const data=JSON.parse(body.input[0].content[0].text).storyboard;data.board.approved=false;await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-model-load').click();await expect(page.locator('#ai-workflow-error')).toHaveValue(/denied/);await expect(page.locator('#ai-workflow-error')).not.toHaveValue(new RegExp(openai));expect(reads).toBe(1);await page.locator('#ai-workflow-close').click();await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-model-choice').selectOption('__manual');await page.locator('#ai-workflow-model').fill('gpt-future-model');await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();
});

test('ElevenLabs model list filters TTS capability and speech requests never receive reasoning',async({page})=>{
 const p=fixture();p.scenes[0].narration={...defaultNarration(),text:'Hello'};await setup(page,p);await page.route('https://api.elevenlabs.io/v1/models',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}expect(r.request().headers()['xi-api-key']).toBe(elevenlabs);await r.fulfill({headers:cors,json:[{model_id:'eleven_multilingual_v2',name:'Multilingual',can_do_text_to_speech:true},{model_id:'eleven_turbo_v2_5',name:'Turbo',can_do_text_to_speech:true},{model_id:'voice_conversion',name:'Conversion',can_do_text_to_speech:false}]});});await page.route('https://api.elevenlabs.io/v1/text-to-speech/**',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}expect(r.request().postDataJSON()).toEqual({text:'Hello',model_id:'eleven_turbo_v2_5'});await r.fulfill({headers:cors,contentType:'audio/mpeg',body:wav(2)});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('speech');await page.locator('#ai-workflow-model-load').click();await expect(page.locator('#ai-workflow-model-status')).toHaveText(/Models loaded/);await expect(page.locator('#ai-workflow-model-choice option[value=voice_conversion]')).toHaveCount(0);await page.locator('#ai-workflow-model-choice').selectOption('eleven_turbo_v2_5');await page.locator('#ai-workflow-voice').fill('Voice123');await generate(page);await expect(page.locator('#ai-workflow-apply')).toBeEnabled();
});


test('AI workflow options use accessible slide switches without starting requests',async({page})=>{
 await setup(page);let calls=0;page.on('request',r=>{if(/api\.(openai\.com|elevenlabs\.io)/.test(r.url()))calls++;});await page.locator('#open-ai-workflow').click();
 const refs=page.locator('#ai-workflow-refs'),consent=page.locator('#ai-workflow-consent');for(const toggle of [refs,consent]){await expect(toggle).toHaveAttribute('role','switch');await expect(toggle).not.toBeChecked();await expect(toggle.locator('xpath=following-sibling::span[1]')).toBeVisible();}
 await refs.focus();await page.keyboard.press('Space');await expect(refs).toBeChecked();await expect(page.locator('#ai-workflow-start')).toBeDisabled();await consent.focus();await page.keyboard.press('Space');await expect(consent).toBeChecked();await expect(page.locator('#ai-workflow-start')).toBeEnabled();await page.keyboard.press('Space');await expect(consent).not.toBeChecked();await expect(page.locator('#ai-workflow-start')).toBeDisabled();expect(calls).toBe(0);
});


test('cancelling pending password derivation keeps the vault locked and discards the password',async({page})=>{
 await setup(page);await page.locator('#open-api-vault').click();await page.locator('#api-vault-lock').click();await page.locator('#api-vault-close').click();await page.locator('#open-ai-workflow').click();await page.locator('#api-unlock-password').fill(password);await page.evaluate(()=>{document.querySelector<HTMLFormElement>('#api-unlock-form')!.requestSubmit();document.querySelector<HTMLButtonElement>('#api-unlock-close')!.click();});await expect(page.locator('#api-unlock-dialog')).not.toBeVisible();await page.waitForTimeout(400);await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','locked');await expect(page.locator('#api-unlock-password')).toHaveValue('');await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await page.locator('#open-ai-workflow').click();await page.locator('#api-unlock-password').fill(password);await page.locator('#api-unlock-submit').click();await expect(page.locator('#ai-workflow-dialog')).toBeVisible();
});

test('storyboard entry also unlocks before opening AI and preserves its draft',async({page})=>{
 await setup(page);await page.locator('#open-api-vault').click();await page.locator('#api-vault-lock').click();await page.locator('#api-vault-close').click();await page.locator('#open-storyboard').click();await page.locator('[data-board-edit=story]').click();await page.locator('#storyboard-field-text').fill('Unsaved story draft');await page.locator('#storyboard-field-apply').click();await page.locator('#storyboard-ai-open').click();await expect(page.locator('#api-unlock-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await page.locator('#api-unlock-password').fill(password);await page.locator('#api-unlock-submit').click();await expect(page.locator('#ai-workflow-dialog')).toBeVisible();await page.locator('#ai-workflow-close').click();await expect(page.locator('#storyboard-content')).toContainText('Unsaved story draft');
});

test('first-time key setup completes before AI opens and never starts generation',async({page})=>{
 await page.goto('/en/');let calls=0;page.on('request',r=>{if(/api\.(openai\.com|elevenlabs\.io)/.test(r.url()))calls++;});await page.locator('#open-ai-workflow').click();await expect(page.locator('#api-vault-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await page.locator('#api-vault-password').fill(password);await page.locator('#api-vault-repeat').fill(password);await page.locator('#api-vault-openai').fill(openai);await page.locator('#api-vault-consent').check();await page.locator('#api-vault-submit').click();await expect(page.locator('#api-vault-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-start')).toBeDisabled();expect(calls).toBe(0);
});

test('project changes during unlock cannot open a stale AI context',async({page})=>{
 await setup(page);await page.locator('#open-api-vault').click();await page.locator('#api-vault-lock').click();await page.locator('#api-vault-close').click();await page.locator('#open-ai-workflow').click();await page.evaluate(()=>{const input=document.querySelector<HTMLInputElement>('#project-title')!;input.value='Changed meanwhile';input.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#api-unlock-password').fill(password);await page.locator('#api-unlock-submit').click();await expect(page.locator('#api-unlock-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await page.locator('#open-ai-workflow').click();await expect(page.locator('#ai-workflow-dialog')).toBeVisible();
});


test('Play shows only a spinner and cancel; success saves the storyboard and returns to review',async({page})=>{
 await setup(page);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}await gate;const data=JSON.parse(r.request().postDataJSON().input[0].content[0].text).storyboard;data.board.title='AI review draft';data.board.approved=false;await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-storyboard').click();await page.locator('#storyboard-ai-open').click();await generate(page);await expect(page.locator('#ai-workflow-spinner')).toBeVisible();await expect(page.locator('#ai-workflow-settings')).not.toBeVisible();await expect(page.locator('#ai-workflow-dialog>.json-header')).not.toBeVisible();await expect(page.locator('#ai-workflow-start')).not.toBeVisible();await expect(page.locator('#ai-workflow-cancel')).toBeVisible();release();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-content')).toContainText('AI review draft');await expect(page.locator('#storyboard-approve')).toHaveAttribute('aria-pressed','false');page.once('dialog',d=>d.accept());await page.locator('#storyboard-close').click();await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-content')).toContainText('AI review draft');
});

test('generation errors are shown and copied without leaking keys; denied clipboard selects the text',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copiedAiError=text;}}}));await setup(page);await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}await r.fulfill({headers:cors,status:429,json:{error:{message:openai}}});});await page.locator('#open-ai-workflow').click();await generate(page);await expect(page.locator('#ai-workflow-error')).toHaveValue(/quota/);await expect(page.locator('#ai-workflow-status')).toHaveText('');await expect(page.locator('#ai-workflow-spinner')).not.toBeVisible();await page.locator('#ai-workflow-copy-error').click();await expect(page.locator('#ai-workflow-copy-status')).toHaveText('Error copied.');const error=await page.locator('#ai-workflow-error').inputValue();expect(await page.evaluate(()=>(window as any).copiedAiError)).toBe(error);expect(error).not.toContain(openai);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}}));await page.locator('#ai-workflow-copy-error').click();await expect(page.locator('#ai-workflow-copy-status')).toContainText('Ctrl+C');expect(await page.locator('#ai-workflow-error').evaluate(e=>{const t=e as HTMLTextAreaElement;return t.selectionEnd-t.selectionStart;})).toBe(error.length);
});

test('cancelling the spinner leaves the existing storyboard unchanged',async({page})=>{
 await setup(page);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let paid=0;await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}paid++;await gate;await r.fulfill({headers:cors,json:response('{}')}).catch(()=>{});});await page.locator('#open-ai-workflow').click();await generate(page);await expect(page.locator('#ai-workflow-spinner')).toBeVisible();await expect.poll(()=>paid).toBe(1);await page.locator('#ai-workflow-cancel').click();await expect(page.locator('#ai-workflow-error')).toHaveValue(/cancelled/);await expect(page.locator('#ai-workflow-settings')).not.toBeVisible();release();await page.locator('#ai-workflow-close').click();expect((await exportProject(page)).storyboard!.title).toBe('Space plan');expect(paid).toBe(1);
});


test('model recommendation is compact, above the selected model, and uses an icon-only apply action',async({page})=>{
 await setup(page,fixture(),'de');await page.locator('#open-ai-workflow').click();const box=page.locator('#ai-workflow-model-recommendation'),button=page.locator('#ai-workflow-use-recommendation');await expect(page.locator('#ai-workflow-model-advice')).toHaveText('GPT-6.1 Sol · Mittel');await expect(button).toHaveAttribute('title','Empfehlung übernehmen');await expect(button).toHaveAttribute('aria-label','Empfehlung übernehmen');expect((await button.textContent())?.trim()).toBe('');await expect(button.locator('svg[aria-hidden=true]')).toHaveCount(1);const task=await page.locator('#ai-workflow-action').boundingBox(),recommendation=await box.boundingBox(),model=await page.locator('.ai-model-row').boundingBox();expect(recommendation!.y).toBeGreaterThanOrEqual(task!.y+task!.height);expect(recommendation!.y+recommendation!.height).toBeLessThanOrEqual(model!.y);await button.click();await expect(page.locator('#ai-workflow-model-choice')).toHaveValue('gpt-6.1-sol');await expect(page.locator('#ai-workflow-reasoning')).toHaveValue('medium');await page.locator('#ai-workflow-action').selectOption('script');await expect(page.locator('#ai-workflow-model-advice')).toHaveText('GPT-6.1 Sol · Hoch');
});


test('AI workflow groups settings into responsive task tiles with collapsible hints',async({page},info)=>{
 await setup(page,fixture(),'de');await page.locator('#open-ai-workflow').click();const settings=page.locator('#ai-workflow-settings');await expect(settings.locator('[data-ai-tile]:visible')).toHaveCount(4);for(const key of ['task','reasoning','content','consent'])await expect(settings.locator(`[data-ai-tile=${key}]`)).toBeVisible();
 expect(await settings.locator('input,select,textarea').evaluateAll(controls=>controls.every(e=>!!e.closest('[data-ai-tile]')))).toBe(true);await expect(settings.locator('[data-ai-tile=task] h3')).toHaveText('Aufgabe & Modell');await expect(settings.locator('[data-ai-tile=consent] h3')).toHaveText('Daten & Kosten');const details=settings.locator('[data-ai-tile=task] details');await expect(details).not.toHaveAttribute('open','');await details.locator('summary').click();await expect(details).toHaveAttribute('open','');await details.locator('summary').click();
 expect(await settings.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);expect(await page.locator('#ai-workflow-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);for(const tile of await settings.locator('[data-ai-tile]:visible').all())expect(await tile.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);await expect(page.locator('#ai-workflow-tokens')).toHaveCount(0);const reasoning=await page.locator('[data-ai-tile=reasoning]').boundingBox(),content=await page.locator('[data-ai-tile=content]').boundingBox();if(info.project.name==='desktop')expect(Math.abs(reasoning!.y-content!.y)).toBeLessThan(2);else expect(content!.y).toBeGreaterThanOrEqual(reasoning!.y+reasoning!.height);await page.screenshot({path:info.outputPath('ai-workflow-tiles.png')});
 await page.locator('#ai-workflow-action').selectOption('image');await expect(settings.locator('[data-ai-tile]:visible')).toHaveCount(4);await expect(settings.locator('[data-ai-tile=image]')).toBeVisible();await expect(settings.locator('[data-ai-tile=reasoning]')).not.toBeVisible();await page.locator('#ai-workflow-action').selectOption('speech');await expect(settings.locator('[data-ai-tile]:visible')).toHaveCount(3);await expect(settings.locator('[data-ai-tile=speech]')).toBeVisible();await expect(settings.locator('[data-ai-tile=content]')).not.toBeVisible();await expect(page.locator('#ai-workflow-consent')).toHaveAttribute('role','switch');
});


test('storyboard generation satisfies the API JSON-mode input requirement without user-entered JSON text',async({page})=>{
 await setup(page);let calls=0;await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON(),data=JSON.parse(body.input[0].content[0].text);expect(body.model).toBe('gpt-6.1-sol');expect(data.request).toBe('');expect(body.input[0].content[0].text.toLowerCase()).not.toContain('json');const text=body.input.flatMap((m:any)=>m.content).filter((c:any)=>c.type==='input_text').map((c:any)=>c.text).join(' ');if(!/json/i.test(text)){await r.fulfill({headers:cors,status:400,json:{error:{message:'Response input messages must contain the word json',param:'input'}}});return;}data.storyboard.board.approved=false;data.storyboard.board.title='JSON mode fixed';await r.fulfill({headers:cors,json:response(JSON.stringify(data.storyboard))});});await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-use-recommendation').click();await generate(page);await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-content')).toContainText('JSON mode fixed');expect(calls).toBe(1);
});

test('planning distinguishes reference inputs from separately generated preview images',async({page})=>{
 await setup(page,fixture(),'de');let paid=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().startsWith('https://api.openai.com/'))paid++;});
 await page.locator('#open-ai-workflow').click();
 await expect(page.locator('#ai-workflow-planning-image-hint')).toBeVisible();
 await expect(page.locator('#ai-workflow-planning-image-hint')).toContainText('separate kostenpflichtige Anfrage');
 await expect(page.locator('#ai-workflow-refs-label')).toContainText('erzeugt keine Bilder');
 await page.locator('#ai-workflow-refs').check();expect(paid).toBe(0);
 await page.locator('#ai-workflow-action').selectOption('image');
 await expect(page.locator('#ai-workflow-planning-image-hint')).toBeHidden();
 await expect(page.locator('#ai-workflow-target')).toBeVisible();
 await page.locator('#ai-workflow-target').selectOption('shots:shot');expect(paid).toBe(0);
 await page.locator('#ai-workflow-action').selectOption('script');
 await expect(page.locator('#ai-workflow-planning-image-hint')).toBeHidden();
});

for(const [format,size]of [['landscape','1280x720'],['portrait','720x1280'],['square','816x816']] as const)test('sketch defaults use small project-shaped images: '+format,async({page})=>{
 const p=fixture();p.storyboard!.format=format;await setup(page,p);
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';let calls=0;
 await page.route('https://api.openai.com/v1/images/generations',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON();expect(body.size).toBe(size);expect(body.quality).toBe('low');await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('image');
 await expect(page.locator('#ai-workflow-quality')).toHaveValue('high');await expect(page.locator('#ai-workflow-size')).toHaveValue('1536x864');
 await page.locator('#ai-workflow-target').selectOption('shots:shot');
 await expect(page.locator('#ai-workflow-quality')).toHaveValue('low');await expect(page.locator('#ai-workflow-size')).toHaveValue(size);await expect(page.locator('#ai-workflow-size')).toHaveAttribute('readonly','');
 await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();
 const after=await exportProject(page),data=after.storyboard!.images[after.storyboard!.shots[0].image!].data!;
 expect(await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();return [img.naturalWidth,img.naturalHeight];},data)).toEqual(size.split('x').map(Number));expect(calls).toBe(1);
});
test('fixed-size image models use supported dimensions and crop to the project format',async({page})=>{
 const p=fixture();p.format='portrait';p.storyboard!.format='portrait';await setup(page,p);
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 await page.route('https://api.openai.com/v1/images/generations',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}expect(r.request().postDataJSON()).toMatchObject({model:'gpt-image-1.5',size:'1024x1536',quality:'low'});await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('image');
 await expect(page.locator('#ai-workflow-size')).toHaveValue('864x1536');
 await page.locator('#ai-workflow-target').selectOption('shots:shot');await page.locator('#ai-workflow-model-choice').selectOption('gpt-image-1.5');
 await expect(page.locator('#ai-workflow-size')).toHaveValue('720x1280');await expect(page.locator('#ai-workflow-quality')).toHaveValue('low');
 await generate(page);await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();
 const after=await exportProject(page),data=after.storyboard!.images[after.storyboard!.shots[0].image!].data!;
 expect(await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();return [img.naturalWidth,img.naturalHeight];},data)).toEqual([720,1280]);
});

function quickImageProject(){
 const p=fixture(),b=p.storyboard!;b.characters=[{id:'hero',kind:'character',name:'Copper pilot',description:'Copper robot',image:null,status:'approved',comments:[]},{id:'prop',kind:'object',name:'Survey drone',description:'Small silver drone',image:null,status:'approved',comments:[]}];
 b.settings=[{id:'moon',name:'Lunar base',description:'A crater with a landing pad',image:null,status:'approved',comments:[]}];b.shots[0].characters=['hero','prop'];b.shots[0].settings=['moon'];return p;
}
for(const [tab,kind,id,phrase]of [['characters','characters','hero','ONLY the selected character'],['objects','characters','prop','ONLY the selected object'],['settings','settings','moon','ONLY the selected setting'],['shots','shots','shot','ONE single-frame']] as const)test('inline AI preview uses the selected '+tab+' and defaults after explicit paid confirmation',async({page})=>{
 const p=quickImageProject();await setup(page,p);let calls=0,release!:()=>void;const gate=new Promise<void>(r=>release=r),png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 await page.route('https://api.openai.com/v1/images/generations',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;expect(r.request().postDataJSON()).toMatchObject({model:'gpt-image-2',quality:'low',size:'1280x720',n:1});expect(r.request().postDataJSON().prompt).toContain(phrase);await gate;await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab='+tab+']').click();const button=page.locator('.board-generate-image');
 await expect(button).toHaveCount(1);await expect(button.locator('svg')).toHaveCount(1);await expect(button).toHaveAttribute('title','Generate preview with AI');
 await button.click();await expect(page.locator('#ai-workflow-quick-confirm')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();expect(calls).toBe(0);
 await expect(page.locator('#ai-workflow-quick-summary')).toContainText('1280x720');await expect(page.locator('#ai-workflow-quick-hint')).toContainText('paid OpenAI');
 await page.locator('#ai-workflow-quick-start').click();await expect(page.locator('#ai-workflow-spinner')).toBeVisible();await expect.poll(()=>calls).toBe(1);release();
 await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-dialog')).toBeVisible();await expect(page.locator('.board-sketch')).toHaveCount(1);
 await page.locator('#storyboard-save').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();await page.locator('#storyboard-close').click();const result=await exportProject(page),item=result.storyboard![kind].find(x=>x.id===id)!;
 expect(item.image).toBeTruthy();expect(item.status).toBe('draft');expect(result.scenes).toEqual(p.scenes);expect(calls).toBe(1);
});
test('cancelling inline image confirmation sends no paid request and returns to the element',async({page})=>{
 await setup(page,quickImageProject());let calls=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('api.openai.com'))calls++;});
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();const button=page.locator('.board-generate-image');
 await button.click();await expect(page.locator('#ai-workflow-quick-confirm')).toBeVisible();await page.locator('#ai-workflow-quick-cancel').click();
 await expect(page.locator('#ai-workflow-quick-confirm')).not.toBeVisible();await expect(button).toBeFocused();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();
 await button.click();await expect(page.locator('#ai-workflow-quick-confirm')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#ai-workflow-quick-confirm')).not.toBeVisible();expect(calls).toBe(0);
});
test('inline image generation unlocks the vault before paid confirmation',async({page})=>{
 await setup(page,quickImageProject());await page.locator('#open-api-vault').click();await page.locator('#api-vault-lock').click();await page.locator('#api-vault-close').click();
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();await page.locator('.board-generate-image').click();
 await expect(page.locator('#api-unlock-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-quick-confirm')).not.toBeVisible();
 await page.locator('#api-unlock-password').fill(password);await page.locator('#api-unlock-submit').click();await expect(page.locator('#ai-workflow-quick-confirm')).toBeVisible();await page.locator('#ai-workflow-quick-cancel').click();
});

test('running AI shows elapsed time and theme-aware Matrix rain, respects reduced motion and resets on retry',async({page},testInfo)=>{
 await setup(page);let calls=0;const releases:(()=>void)[]=[];
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;await new Promise<void>(resolve=>releases.push(resolve));await r.fulfill({headers:cors,status:429,json:{error:{}}}).catch(()=>{});});
 await page.locator('#open-ai-workflow').click();await generate(page);
 const matrix=page.locator('#ai-workflow-matrix'),elapsed=page.locator('#ai-workflow-elapsed'),stream=matrix.locator('span').first();
 await expect(matrix).toBeVisible();await expect(matrix).toHaveAttribute('aria-hidden','true');await expect(matrix.locator('span')).toHaveCount(18);
 await expect(elapsed).toHaveAttribute('aria-live','off');await expect(elapsed).toHaveText('00:00');
 await expect(elapsed).not.toHaveText('00:00',{timeout:3000});
 await expect(stream).toHaveCSS('animation-name','ai-matrix-fall');
 const original=await matrix.evaluate(e=>getComputedStyle(e).color);
 await page.evaluate(()=>{document.documentElement.dataset.palette='blue';document.documentElement.dataset.theme='dark';});
 await expect.poll(()=>matrix.evaluate(e=>getComputedStyle(e).color)).not.toBe(original);
 expect(await matrix.evaluate(e=>{const probe=document.createElement('span');probe.style.color='var(--accent)';document.body.append(probe);const same=getComputedStyle(probe).color===getComputedStyle(e).color;probe.remove();return same;})).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(stream).toHaveCSS('animation-name','none');
 const reducedTime=await elapsed.textContent();await expect(elapsed).not.toHaveText(reducedTime!,{timeout:3000});
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(stream).toHaveCSS('animation-name','ai-matrix-fall');
 await page.locator('#ai-workflow-dialog').screenshot({path:'/tmp/scene-ai-matrix-'+testInfo.project.name+'.png'});
 await expect.poll(()=>releases.length).toBe(1);releases[0]();
 await expect(page.locator('#ai-workflow-error')).toHaveValue(/quota/);await expect(matrix).toBeHidden();const stopped=await elapsed.textContent();await page.waitForTimeout(1100);await expect(elapsed).toHaveText(stopped!);
 await page.locator('#ai-workflow-close').click();await page.locator('#open-ai-workflow').click();await generate(page);await expect(elapsed).toHaveText('00:00');await expect(matrix).toBeVisible();await expect.poll(()=>calls).toBe(2);
 await page.locator('#ai-workflow-cancel').click();await expect(matrix).toBeHidden();await expect(page.locator('#ai-workflow-error')).toHaveValue(/cancelled/);releases[1]?.();
});

test('each successful AI storyboard reply is saved without pressing Save and can be undone independently',async({page})=>{
 await setup(page);let calls=0;
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const data=JSON.parse(r.request().postDataJSON().input[0].content[0].text).storyboard;data.board.title='Automatically saved '+calls;data.board.approved=false;await r.fulfill({headers:cors,json:response(JSON.stringify(data))});});
 await page.locator('#open-ai-workflow').click();await generate(page);
 await expect(page.locator('#storyboard-content')).toContainText('Automatically saved 1');await expect(page.locator('#storyboard-status')).toContainText('saved in the project');
 await page.locator('#storyboard-ai-open').click();await generate(page);await expect(page.locator('#storyboard-content')).toContainText('Automatically saved 2');
 await page.locator('#storyboard-close').click();const after=await exportProject(page);expect(after.storyboard!.title).toBe('Automatically saved 2');expect(after.storyboard!.approved).toBe(false);
 await page.locator('#undo-project').click();expect((await exportProject(page)).storyboard!.title).toBe('Automatically saved 1');
 await page.locator('#undo-project').click();expect((await exportProject(page)).storyboard!.title).toBe('Space plan');expect(calls).toBe(2);
});
test('inline AI preview is saved automatically and survives closing without pressing Save',async({page})=>{
 const p=quickImageProject();await setup(page,p);const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 await page.route('https://api.openai.com/v1/images/generations',r=>r.fulfill({headers:cors,json:{data:[{b64_json:png}]}}));
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();await page.locator('.board-generate-image').click();await page.locator('#ai-workflow-quick-start').click();
 await expect(page.locator('.board-sketch')).toHaveCount(1);await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-status')).toContainText('saved in the project');
 await page.locator('#storyboard-close').click();const result=await exportProject(page);expect(result.storyboard!.characters[0].image).toBeTruthy();expect(result.storyboard!.characters[0].status).toBe('draft');expect(result.scenes).toEqual(p.scenes);
});

test('provider error details are visible and copied verbatim except for redacted secrets',async({page})=>{
 await setup(page);await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).providerErrorCopied=text;}}}));
 let calls=0;await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;await r.fulfill({headers:cors,status:400,json:{error:{message:'Unsupported parameter: reasoning.effort. Credential '+openai,type:'invalid_request_error',code:'unsupported_parameter',param:'reasoning.effort',debug:password}}});});
 await page.locator('#open-ai-workflow').click();await generate(page);const field=page.locator('#ai-workflow-error');
 await expect(field).toHaveValue(/Unsupported parameter: reasoning.effort/);const text=await field.inputValue();
 for(const part of ['HTTP 400','invalid_request_error','unsupported_parameter','param: reasoning.effort','[REDACTED]'])expect(text).toContain(part);
 for(const secret of [openai,password,elevenlabs])expect(text).not.toContain(secret);
 await page.locator('#ai-workflow-copy-error').click();expect(await page.evaluate(()=>(window as any).providerErrorCopied)).toBe(text);expect(calls).toBe(1);
 await page.locator('#ai-workflow-close').click();expect((await exportProject(page)).storyboard!.title).toBe('Space plan');
});

test('failed AI requests show only a compact error overlay with copy left and close right',async({page})=>{
 await setup(page);let calls=0;
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;await r.fulfill({headers:cors,status:400,json:{error:{message:'The selected model does not support this parameter.',code:'unsupported_parameter'}}});});
 await page.locator('#open-ai-workflow').click();await generate(page);
 const dialog=page.locator('#ai-workflow-dialog'),copy=page.locator('#ai-workflow-copy-error'),close=page.locator('#ai-workflow-close');
 await expect(dialog).toHaveClass(/ai-error-view/);await expect(page.locator('#ai-workflow-error')).toHaveValue(/does not support/);
 for(const id of ['settings','spinner','preview','status','start','apply','cancel'])await expect(page.locator('#ai-workflow-'+id)).not.toBeVisible();
 await expect(dialog.locator('footer button:visible')).toHaveCount(2);
 await expect(copy).toHaveAttribute('title','Copy error to clipboard');await expect(close).toHaveAttribute('title','Close');
 const box=(await dialog.boundingBox())!,left=(await copy.boundingBox())!,right=(await close.boundingBox())!;
 expect(box.width).toBeLessThanOrEqual(560);expect(left.x-box.x).toBeLessThan(40);expect(box.x+box.width-right.x-right.width).toBeLessThan(40);expect(left.x).toBeLessThan(right.x);
 await close.click();await expect(dialog).not.toBeVisible();expect(calls).toBe(1);
 await page.locator('#open-ai-workflow').click();await expect(dialog).not.toHaveClass(/ai-error-view/);await expect(page.locator('#ai-workflow-settings')).toBeVisible();await expect(copy).not.toBeVisible();
});

test('setting preview sends equipment image pixels but neither customer nor previous setting images',async({page})=>{
 const p=quickImageProject(),b=p.storyboard!,png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 b.images={object:{name:'Drone.png',data:'data:image/png;base64,'+png},person:{name:'Customer.png',data:'data:image/png;base64,'+png},old:{name:'Previous scene.png',data:'data:image/png;base64,'+png}};
 b.characters[0].image='person';b.characters[1].image='object';b.settings[0].objects=['prop'];b.settings[0].image='old';
 await setup(page,p);let calls=0;
 await page.route('https://api.openai.com/v1/images/edits',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON();
  expect(body.images).toEqual([{image_url:'data:image/png;base64,'+png}]);expect(body.prompt).toContain('Small silver drone');expect(body.prompt).toContain('NO people, customers, actors');expect(body.prompt).not.toContain('Copper pilot');expect(body.prompt).toContain('"id":"prop"');
  await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=settings]').click();await page.locator('.board-generate-image').click();
 await expect(page.locator('#ai-workflow-quick-summary')).toContainText('Reference images: 1');await expect(page.locator('#ai-workflow-quick-hint')).toContainText('additional input costs');
 await page.locator('#ai-workflow-quick-start').click();await expect(page.locator('#ai-workflow-quick-confirm')).not.toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-status')).toContainText('saved in the project');expect(calls).toBe(1);
});
test('scene previews rasterize SVG references locally and allow reference uploads to be disabled',async({page})=>{
 const p=quickImageProject(),b=p.storyboard!,png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 b.images.svg={name:'Pilot.svg',data:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="orange"/></svg>').toString('base64')};b.characters[0].image='svg';
 await setup(page,p);let edits=0,generations=0;
 await page.route('https://api.openai.com/v1/images/edits',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}edits++;const body=r.request().postDataJSON();expect(body.images).toHaveLength(1);expect(body.images[0].image_url).toMatch(/^data:image\/png;base64,/);
  const dims=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();return [img.naturalWidth,img.naturalHeight];},body.images[0].image_url);expect(dims).toEqual([512,1024]);await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.route('https://api.openai.com/v1/images/generations',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}generations++;expect(r.request().postDataJSON()).not.toHaveProperty('images');await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('image');await page.locator('#ai-workflow-target').selectOption('shots:shot');await expect(page.locator('#ai-workflow-image-reference-summary')).toContainText('Reference images: 1');await generate(page);
 await expect(page.locator('#storyboard-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();expect(edits).toBe(1);
 await page.locator('#storyboard-ai-open').click();await page.locator('#ai-workflow-action').selectOption('image');await page.locator('#ai-workflow-target').selectOption('shots:shot');await page.locator('#ai-workflow-image-refs').uncheck();await expect(page.locator('#ai-workflow-image-reference-summary')).toContainText('Reference images: 0');await generate(page);
 await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();expect(generations).toBe(1);
});

test('oversized reference sources are compressed to the shared upload budget without changing originals',async({page})=>{
 const original=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(1024,1024);let seed=123456789;
  for(let i=0;i<pixels.data.length;i+=4){for(let channel=0;channel<3;channel++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels.data[i+channel]=seed>>>24;}pixels.data[i+3]=i===0?0:255;}
  ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
 });
 expect(original.length*2).toBeGreaterThan(6*1024*1024);
 const p=quickImageProject(),b=p.storyboard!,png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=';
 b.images={one:{name:'Pilot.png',data:original},two:{name:'Drone.png',data:original}};b.characters[0].image='one';b.characters[1].image='two';
 await setup(page,p);let calls=0;
 await page.route('https://api.openai.com/v1/images/edits',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON();expect(body.images).toHaveLength(2);
  expect(body.images.reduce((n:number,image:{image_url:string})=>n+image.image_url.length,0)).toBeLessThanOrEqual(6*1024*1024);
  for(const ref of body.images){expect(ref.image_url).not.toBe(original);const details=await page.evaluate(async data=>{
   const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return {w:img.naturalWidth,h:img.naturalHeight,alpha:ctx.getImageData(0,0,1,1).data[3]};
  },ref.image_url);expect(details.w).toBeLessThanOrEqual(1024);expect(details.h).toBeLessThanOrEqual(1024);expect(details.alpha).toBe(0);}
  await r.fulfill({headers:cors,json:{data:[{b64_json:png}]}});});
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=shots]').click();await page.locator('.board-generate-image').click();
 await expect(page.locator('#ai-workflow-quick-summary')).toContainText('Reference images: 2');await page.locator('#ai-workflow-quick-start').click();
 await expect(page.locator('#storyboard-status')).toContainText('saved in the project');await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();
 await page.locator('#storyboard-close').click();const saved=await exportProject(page);expect(saved.storyboard!.images.one.data).toBe(original);expect(saved.storyboard!.images.two.data).toBe(original);expect(calls).toBe(1);
});

test('approved storyboard entry permits SceneScript selection and applies the full project only explicitly',async({page})=>{
 const before=fixture();await setup(page,before);
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}
  const project=JSON.parse(r.request().postDataJSON().input[0].content[0].text).project;project.title='Generated from open storyboard';project.scenes[0].duration=4;await r.fulfill({headers:cors,json:response(JSON.stringify(project))});});
 await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-script-open')).toBeEnabled();
 await page.locator('#storyboard-ai-open').click();await expect(page.locator('#ai-workflow-action option[value=script]')).toHaveJSProperty('disabled',false);await page.locator('#ai-workflow-action').selectOption('script');
 await generate(page);await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await expect(page.locator('#ai-workflow-preview')).toBeVisible();await expect(page.locator('#project-title')).toHaveValue(before.title);
 await page.locator('#ai-workflow-apply').click();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#storyboard-dialog')).not.toBeVisible();
 const generated=await exportProject(page);expect(generated.title).toBe('Generated from open storyboard');expect(generated.scenes[0].duration).toBe(4);expect(generated.storyboard).toEqual(before.storyboard);
 await page.locator('#undo-project').click();expect((await exportProject(page)).title).toBe(before.title);
});
test('dedicated storyboard toolbar button confirms the recommended SceneScript quick start without a paid call',async({page})=>{
 await setup(page);let calls=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('api.openai.com'))calls++;});
 await page.locator('#open-storyboard').click();await page.locator('#storyboard-script-open').click();await expect(page.locator('#ai-workflow-quick-confirm')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-quick-summary')).toContainText('GPT-6.1 Sol');
 expect(calls).toBe(0);await page.locator('#ai-workflow-quick-cancel').click();await expect(page.locator('#storyboard-dialog')).toBeVisible();
});
test('unapproved storyboard entry keeps script selection and its toolbar button disabled',async({page})=>{
 const p=fixture();p.storyboard!.approved=false;await setup(page,p);await page.locator('#open-storyboard').click();await expect(page.locator('#storyboard-script-open')).toBeDisabled();
 await page.locator('#storyboard-ai-open').click();await expect(page.locator('#ai-workflow-action option[value=script]')).toHaveJSProperty('disabled',true);
});

test('SceneScript quick start sends the recommended model and effort then requires explicit project apply',async({page})=>{
 await setup(page);let calls=0,release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON();expect(body.model).toBe('gpt-6.1-sol');expect(body.reasoning).toEqual({effort:'high'});
 const p=JSON.parse(body.input[0].content[0].text).project;p.title='Quick-generated video';await gate;await r.fulfill({headers:cors,json:response(JSON.stringify(p))});});
 await page.locator('#open-storyboard').click();await page.locator('#storyboard-script-open').click();await expect(page.locator('#ai-workflow-quick-summary')).toContainText('High');await expect(page.locator('#ai-workflow-quick-hint')).toContainText('charged');expect(calls).toBe(0);
 await page.locator('#ai-workflow-quick-start').click();await expect(page.locator('#ai-workflow-spinner')).toBeVisible();await expect(page.locator('#ai-workflow-settings')).not.toBeVisible();await expect.poll(()=>calls).toBe(1);release();
 await expect(page.locator('#ai-workflow-preview')).toBeVisible();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await expect(page.locator('#project-title')).not.toHaveValue('Quick-generated video');
 await page.locator('#ai-workflow-apply').click();await expect(page.locator('#storyboard-dialog')).not.toBeVisible();await expect(page.locator('#project-title')).toHaveValue('Quick-generated video');expect(calls).toBe(1);
});

test('SceneScript restores storyboard image manifests as render assets and as an unambiguous thumbnail',async({page})=>{
 const p=fixture(),png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=',data='data:image/png;base64,'+png;
 p.storyboard!.images.frame={name:'Approved scene.png',data};p.storyboard!.shots[0].image='frame';
 await setup(page,p);await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}
  const project=JSON.parse(r.request().postDataJSON().input[0].content[0].text).project;
  project.assets={frame:{name:'Approved scene.png'}};project.scenes[0].backgroundAsset='frame';project.thumbnail={name:'Approved scene.png'};project.storyboard=null;
  expect(r.request().postDataJSON().instructions).toContain('Existing storyboard.images may also be reused as render assets');
  await r.fulfill({headers:cors,json:response(JSON.stringify(project))});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('script');await generate(page);
 await expect(page.locator('#ai-workflow-preview')).toBeVisible();await expect(page.locator('#ai-workflow-error-box')).not.toBeVisible();await page.locator('#ai-workflow-apply').click();
 const result=await exportProject(page);expect(result.assets.frame.data).toBe(data);expect(result.scenes[0].backgroundAsset).toBe('frame');expect(result.thumbnail!.data).toBe(data);expect(result.storyboard).toEqual(p.storyboard);
 await page.locator('#undo-project').click();const original=await exportProject(page);expect(original.assets.frame).toBeUndefined();expect(original.storyboard!.images.frame.data).toBe(data);
});

test('SceneScript toolbar stays enabled after reload with a locked vault and requests its password',async({page})=>{
 await setup(page);await page.reload();await expect(page.locator('#open-api-vault')).toHaveAttribute('data-vault-state','locked');
 let calls=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('api.openai.com'))calls++;});
 await page.locator('#open-storyboard').click();const button=page.locator('#storyboard-script-open');await expect(button).toBeEnabled();await expect(button).toHaveAttribute('title',/locked vault prompts for its password/);
 await button.click();await expect(page.locator('#api-unlock-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-quick-confirm')).not.toBeVisible();expect(calls).toBe(0);
 await page.locator('#api-unlock-close').click();await expect(button).toBeEnabled();await expect(page.locator('#storyboard-dialog')).toBeVisible();expect(calls).toBe(0);
 await button.click();await page.locator('#api-unlock-password').fill('Wrong-Password42!');await page.locator('#api-unlock-submit').click();await expect(page.locator('#api-unlock-error')).toContainText('Incorrect password');
 await page.locator('#api-unlock-password').fill(password);await page.locator('#api-unlock-submit').click();
 await expect(page.locator('#api-unlock-dialog')).not.toBeVisible();await expect(page.locator('#ai-workflow-quick-confirm')).toBeVisible();await expect(page.locator('#ai-workflow-quick-summary')).toContainText('GPT-6.1 Sol');expect(calls).toBe(0);
 await page.locator('#ai-workflow-quick-cancel').click();await expect(button).toBeEnabled();
});
test('fully approved items without overall storyboard approval explain why SceneScript is disabled',async({page})=>{
 const p=fixture();p.storyboard!.approved=false;await setup(page,p);await page.locator('#open-storyboard').click();
 await expect(page.locator('#storyboard-script-open')).toBeDisabled();await expect(page.locator('#storyboard-script-action')).toHaveAttribute('title',/Also approve the whole storyboard/);
 await page.locator('#storyboard-approve').click();await expect(page.locator('#storyboard-script-open')).toBeEnabled();
});

test('3D and sound requirements reach the model, mismatches need explicit acknowledgement and pending tasks persist',async({page})=>{
 const p=fixture();p.storyboard!.production={renderMode:'3d',dialogue:true,music:true,sfx:true};p.storyboard!.shots[0].soundEffects=['A short notification beep'];
 await setup(page,p);let calls=0,voiceCalls=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('api.elevenlabs.io'))voiceCalls++;});
 await page.route('https://api.openai.com/v1/responses',async r=>{if(r.request().method()==='OPTIONS'){await r.fulfill({headers:cors});return;}calls++;const body=r.request().postDataJSON();for(const text of ['Binding production requirements','real 3D characters','NOT flat scene replacements','Scene.narration.text','enabled Project.music'])expect(body.instructions).toContain(text);
  const project=JSON.parse(body.input[0].content[0].text).project;await r.fulfill({headers:cors,json:response(JSON.stringify(project))});});
 await page.locator('#open-ai-workflow').click();await page.locator('#ai-workflow-action').selectOption('script');await generate(page);
 await expect(page.locator('#ai-workflow-production-check')).toBeVisible();await expect(page.locator('#ai-workflow-production-issues')).toContainText('Real 3D requested');await expect(page.locator('#ai-workflow-production-issues')).toContainText('Dialogue requested');await expect(page.locator('#ai-workflow-production-issues')).toContainText('Music requested');await expect(page.locator('#ai-workflow-production-issues')).toContainText('A short notification beep');
 await expect(page.locator('#ai-workflow-apply')).toBeDisabled();await page.locator('#ai-workflow-production-ack').check();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await page.locator('#ai-workflow-apply').click();
 const saved=await exportProject(page);expect(saved.storyboard!.production).toEqual(p.storyboard!.production);expect(saved.storyboard!.shots[0].soundEffects).toEqual(['A short notification beep']);expect(calls).toBe(1);expect(voiceCalls).toBe(0);
 await page.locator('#open-storyboard').click();await expect(page.locator('.board-production-tasks')).toContainText('A short notification beep');
});

test('targeted 3D model refinement previews geometry and only saves the chosen element after confirmation',async({page})=>{
 const initial=fixture();initial.storyboard!.characters=[{id:'chocolate',kind:'object',status:'approved',name:'Chocolate',description:'A chocolate bar',image:null,comments:[]}];await setup(page,initial);let calls=0;await page.route('https://api.openai.com/v1/responses',async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({headers:cors});return;}calls++;const body=route.request().postDataJSON(),input=JSON.parse(body.input[0].content[0].text);expect(input.target.id).toBe('chocolate');expect(input.request).toBe('Make the shape rounder');expect(input).not.toHaveProperty('storyboard');expect(body.instructions).toContain('ONLY the selected reusable');
  await route.fulfill({headers:cors,json:response(JSON.stringify({model:{parts:[{id:'round',shape:'sphere',position:{y:1.5},size:{x:1,y:3,z:1},color:'#895236'}]}}))});
 });
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=objects]').click();await page.locator('[data-board-model=chocolate]').click();await expect(page.locator('#ai-workflow-action')).toHaveValue('model');await page.locator('#ai-workflow-prompt').fill('Make the shape rounder');await generate(page);
 await expect(page.locator('#ai-workflow-model-preview canvas')).toBeVisible();await expect(page.locator('#ai-workflow-dialog')).toBeVisible();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();expect(calls).toBe(1);
 await page.locator('#ai-workflow-apply').click();await expect(page.locator('#ai-workflow-dialog')).not.toBeVisible();await expect(page.locator('.board-model-canvas canvas')).toBeVisible();await page.locator('#storyboard-close').click();const p=await exportProject(page);expect(p.storyboard!.characters[0].model3d!.parts[0].id).toBe('round');expect(p.storyboard!.characters[0].status).toBe('draft');expect(p.scenes).toEqual(fixture().scenes);
});

test('invalid model replies are retained for explicit local repair, download and apply without another paid call',async({page})=>{
 const p=fixture();p.storyboard!.characters=[{id:'customer',kind:'character',status:'approved',name:'Customer',description:'Rounded human',image:null,comments:[]}];await setup(page,p);let calls=0;
 const text=JSON.stringify({reply:'A fine face detail',model:{parts:[{id:'detail',shape:'sphere',position:{y:1.5},size:{x:.005,y:1,z:1}}]}});
 await page.route('https://api.openai.com/v1/responses',async route=>{if(route.request().method()==='OPTIONS'){await route.fulfill({headers:cors});return;}calls++;await route.fulfill({headers:cors,json:response(text)});});
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();await page.locator('[data-board-model=customer]').click();await generate(page);
 await expect(page.locator('#ai-workflow-error')).toHaveValue(/size.x: expected number 0.01–50; received 0.005/);await expect(page.locator('#ai-workflow-model-recovery')).not.toBeVisible();await expect(page.locator('#ai-workflow-apply')).toBeDisabled();
 await page.locator('#ai-workflow-close').click();await expect(page.locator('#ai-workflow-model-recovery-json')).toHaveValue(text);await expect(page.locator('#ai-workflow-settings')).not.toBeVisible();await expect(page.locator('#ai-workflow-start')).not.toBeVisible();
 const downloading=page.waitForEvent('download');await page.locator('#ai-workflow-model-download-response').click();const file=await downloading;expect(await readFile((await file.path())!,'utf8')).toBe(text);
 await page.locator('#ai-workflow-model-repair-sizes').click();await expect(page.locator('#ai-workflow-model-preview canvas')).toBeVisible();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();expect(calls).toBe(1);
 const field=page.locator('#ai-workflow-model-recovery-json'),fixed=JSON.parse(await field.inputValue());fixed.model.parts[0].size.x=0;await field.fill(JSON.stringify(fixed));await expect(page.locator('#ai-workflow-apply')).toBeDisabled();await page.locator('#ai-workflow-model-validate-local').click();await expect(page.locator('#ai-workflow-error')).toHaveValue(/received 0/);await page.locator('#ai-workflow-close').click();await page.locator('#ai-workflow-model-repair-sizes').click();await expect(page.locator('#ai-workflow-apply')).toBeDisabled();
 fixed.model.parts[0].size.x=.02;await field.fill(JSON.stringify(fixed));await page.locator('#ai-workflow-model-validate-local').click();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await page.locator('#ai-workflow-apply').click();await page.locator('#storyboard-close').click();
 const saved=await exportProject(page);expect(saved.storyboard!.characters[0].model3d!.parts[0].size.x).toBe(.02);expect(saved.scenes).toEqual(p.scenes);expect(calls).toBe(1);
});
for(const control of ['leftArm','none'])test('joint target 180 with limits ±55: '+control+' preserves driver calibration or offers explicit local repair',async({page})=>{
 const p=fixture();p.storyboard!.characters=[{id:'customer',kind:'character',status:'approved',name:'Customer',description:'Rounded human',image:null,comments:[]}];await setup(page,p);let calls=0;
 await page.route('https://api.openai.com/v1/responses',async route=>{if(route.request().method()==='OPTIONS'){await route.fulfill({headers:cors});return;}calls++;await route.fulfill({headers:cors,json:response(JSON.stringify({model:{parts:[{id:'arm',position:{y:1.5},joints:[{id:'shoulder',min:-55,max:55,control,target:180}]}]}}))});});
 await page.locator('#open-storyboard').click();await page.locator('[data-board-tab=characters]').click();await page.locator('[data-board-model=customer]').click();await generate(page);
 if(control==='none'){await expect(page.locator('#ai-workflow-error')).toHaveValue(/target: expected number -55–55; received 180/);await page.locator('#ai-workflow-close').click();await page.locator('#ai-workflow-model-repair-joints').click();}
 await expect(page.locator('#ai-workflow-model-preview canvas')).toBeVisible();await expect(page.locator('#ai-workflow-apply')).toBeEnabled();await page.locator('#ai-workflow-apply').click();await page.locator('#storyboard-close').click();const saved=await exportProject(page),joint=saved.storyboard!.characters[0].model3d!.parts[0].joints[0];expect(joint.min).toBe(-55);expect(joint.max).toBe(55);expect(joint.target).toBe(control==='leftArm'?180:55);expect(calls).toBe(1);
});
