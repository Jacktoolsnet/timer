import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('WLAN complete launch preserves the local start and exposes only the backend explicitly',()=>{
 const launch=JSON.parse(readFileSync(new URL('../../../.vscode/launch.json',import.meta.url),'utf8'));
 const scripts=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).scripts;
 const starts=launch.configurations.filter((c:{name:string})=>c.name==='Start: NullTopic komplett im WLAN (DB + Migrationen + Server)');
 assert.equal(starts.length,1);const entry=starts[0];
 assert.equal(entry.cwd,'${workspaceFolder}/nulltopic');assert.equal(entry.type,'node-terminal');
 assert.match(entry.command,/^docker compose --env-file \/dev\/null up -d --wait && /);
 assert.match(entry.command,/npm run migrate && .*npm run dev:lan:all$/);
 assert.match(entry.command,/--package=node@24 --package=npm@11/);
 assert.equal(scripts['dev:lan:all'],'BACKEND_HOST=0.0.0.0 npm run dev');
 assert.equal(scripts['dev:lan'],'BACKEND_HOST=0.0.0.0 npm run dev -w backend');
 assert.ok(launch.configurations.find((c:{name:string,command:string})=>c.name==='Start: NullTopic komplett (DB + Migrationen + Server)'&&!c.command.includes('dev:lan')));
 const frontend=JSON.parse(readFileSync(new URL('../../frontend/package.json',import.meta.url),'utf8'));
 assert.match(frontend.scripts.dev,/--host 127\.0\.0\.1/);
});
