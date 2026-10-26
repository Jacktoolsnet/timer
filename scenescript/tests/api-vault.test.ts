import {test} from 'node:test';import assert from 'node:assert/strict';
import {ApiVault,API_VAULT_KEY,VAULT_IDLE_MS,VaultError,validVaultPassword} from '../src/lib/api-vault.ts';
const password='A-Strong-Local-Password42!';
const openai='sk-project-ONLY-TEST-SECRET-001',elevenlabs='el-ONLY-TEST-SECRET-002';
function storage(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};}
const code=(name:string)=>(e:unknown)=>e instanceof VaultError&&e.code===name;
test('vault password rules enforce length and classes without rejecting Unicode or long passwords',()=>{
 assert.ok(validVaultPassword(password));assert.ok(validVaultPassword('Ärger-Übergröße-123!'));
 for(const value of ['Short1!','all-lowercase-123!','ALL-UPPERCASE-123!','No-Numbers-In-This!','NoSymbolsPassword123','A1!'+ 'x'.repeat(254)])assert.equal(validVaultPassword(value),false);
});
test('only an authenticated encrypted envelope is persisted; reload needs the password; updates rotate IVs',async()=>{
 const s=storage(),vault=new ApiVault(s);assert.equal(vault.state,'empty');await vault.create(password,{openai,elevenlabs});
 assert.equal(vault.state,'unlocked');assert.deepEqual(vault.providers,['openai','elevenlabs']);assert.equal(await vault.getKey('openai'),openai);
 const raw=s.getItem(API_VAULT_KEY)!;for(const secret of [password,openai,elevenlabs])assert.ok(!raw.includes(secret));
 const encrypted=JSON.parse(raw);assert.deepEqual(Object.keys(encrypted).sort(),['cipher','data','iterations','iv','kdf','salt','version']);assert.equal(encrypted.iterations,600000);assert.equal(atob(encrypted.iv).length,12);assert.equal(atob(encrypted.salt).length,16);
 const reloaded=new ApiVault(s);assert.equal(reloaded.state,'locked');await assert.rejects(reloaded.getKey('openai'),code('locked'));
 await assert.rejects(reloaded.unlock('wrong password'),code('credentials'));assert.equal(reloaded.state,'locked');await reloaded.unlock(password);assert.equal(await reloaded.getKey('elevenlabs'),elevenlabs);
 await reloaded.update({openai:'sk-replaced-test-key'});const updated=JSON.parse(s.getItem(API_VAULT_KEY)!);assert.notEqual(updated.iv,encrypted.iv);assert.notEqual(updated.data,encrypted.data);assert.equal(updated.salt,encrypted.salt);assert.equal(await reloaded.getKey('openai'),'sk-replaced-test-key');assert.equal(await reloaded.getKey('elevenlabs'),elevenlabs);
 await reloaded.update({openai:undefined});assert.equal(await reloaded.getKey('openai'),'sk-replaced-test-key');await assert.rejects(reloaded.update([] as never),code('keys'));
 await reloaded.update({elevenlabs:null});assert.deepEqual(reloaded.providers,['openai']);await assert.rejects(reloaded.update({openai:null}),code('keys'));
});
test('fresh vaults randomize salt and nonce, and reject tampering or unsupported envelopes',async()=>{
 const a=storage(),b=storage();await new ApiVault(a).create(password,{openai});await new ApiVault(b).create(password,{openai});
 const original=JSON.parse(a.getItem(API_VAULT_KEY)!);assert.notEqual(original.salt,JSON.parse(b.getItem(API_VAULT_KEY)!).salt);assert.notEqual(original.iv,JSON.parse(b.getItem(API_VAULT_KEY)!).iv);
 for(const field of ['salt','iv','data']){const changed={...original,[field]:(original[field][0]==='A'?'B':'A')+original[field].slice(1)};a.setItem(API_VAULT_KEY,JSON.stringify(changed));const vault=new ApiVault(a);assert.equal(vault.state,'locked');await assert.rejects(vault.unlock(password),code('credentials'));assert.equal(vault.state,'locked');}
 for(const changed of [{...original,iterations:1},{...original,iterations:10**12},{...original,version:2},{...original,extra:'no'},{...original,iv:'bad'},null,{},[]]){a.setItem(API_VAULT_KEY,JSON.stringify(changed));const vault=new ApiVault(a);assert.equal(vault.state,'corrupt');await assert.rejects(vault.unlock(password),code('data'));vault.reset();assert.equal(vault.state,'empty');}
 a.setItem(API_VAULT_KEY,'x'.repeat(20_000));assert.equal(new ApiVault(a).state,'corrupt');
});
test('lock, timeout and reset invalidate pending work and never recreate a deleted vault',async()=>{
 const s=storage();let now=1000;const vault=new ApiVault(s,()=>now);const pending=vault.create(password,{openai});vault.lock();await assert.rejects(pending,code('changed'));assert.equal(s.getItem(API_VAULT_KEY),null);
 await vault.create(password,{openai});now+=VAULT_IDLE_MS-1;vault.touch();now+=VAULT_IDLE_MS-1;assert.equal(vault.state,'unlocked');now+=1;vault.touch();assert.equal(vault.state,'locked');await assert.rejects(vault.getKey('openai'),code('locked'));
 const unlocking=vault.unlock(password);vault.reset();await assert.rejects(unlocking,code('changed'));assert.equal(vault.state,'empty');assert.equal(s.data.size,0);
 await vault.create(password,{elevenlabs});vault.lock();assert.equal(vault.state,'locked');await vault.unlock(password);const updating=vault.update({openai});vault.reset();await assert.rejects(updating,code('changed'));assert.equal(s.getItem(API_VAULT_KEY),null);
});
test('cross-tab changes invalidate sessions and stale writes; reset leaves project data alone',async()=>{
 const s=storage();s.setItem('project','do-not-touch');const first=new ApiVault(s);await first.create(password,{openai});const second=new ApiVault(s);await second.unlock(password);await first.update({elevenlabs});assert.equal(second.state,'locked');await assert.rejects(second.getKey('openai'),code('locked'));
 await second.unlock(password);const stale=first.update({openai:'stale-key'});second.reset();await assert.rejects(stale,code('changed'));assert.equal(s.getItem(API_VAULT_KEY),null);assert.equal(s.getItem('project'),'do-not-touch');assert.equal(first.state,'empty');
});
test('invalid keys and storage failures do not overwrite an existing vault or leak credentials in errors',async()=>{
 const s=storage();const vault=new ApiVault(s);await assert.rejects(vault.create('weak',{openai}),code('password'));await assert.rejects(vault.create(password,{}),code('keys'));
 for(const key of ['', 'bad key','line\nbreak','a'.repeat(1025)])await assert.rejects(vault.create(password,{openai:key}),code('keys'));
 await vault.create(password,{openai});const before=s.getItem(API_VAULT_KEY);const mutable={openai:'new-secret'};const updating=vault.update(mutable);mutable.openai='changed-after-call';await updating;assert.equal(await vault.getKey('openai'),'new-secret');
 const working=s.setItem;s.setItem=()=>{throw new Error(openai);};await assert.rejects(vault.update({elevenlabs}),e=>code('storage')(e)&&!(e as Error).message.includes(openai));s.setItem=working;
 assert.notEqual(before,s.getItem(API_VAULT_KEY));assert.equal(await vault.getKey('openai'),'new-secret');
 const get=s.getItem;s.getItem=()=>{throw new Error('unavailable');};assert.throws(()=>vault.state,code('storage'));s.getItem=get;assert.equal(vault.state,'locked');
});
