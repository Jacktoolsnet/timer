// Explicit allowlist: never load .env or inspect credentials.
import {readFile,readdir,lstat,rm,mkdir,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {crc32,deflateRawSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url));
if(!process.env.npm_execpath)throw new Error('Use npm run deploy:zip.');
await rm(join(root,'dist'),{recursive:true,force:true});
const build=spawnSync(process.execPath,[process.env.npm_execpath,'run','build'],{cwd:root,stdio:'inherit'});
if(build.error)throw build.error;
if(build.status!==0)process.exit(build.status||1);
const files=[];
async function collect(path){
 const info=await lstat(path);
 if(info.isSymbolicLink())throw new Error('Symbolic links are not allowed in deployment packages.');
 if(info.isDirectory()){
  for(const child of (await readdir(path)).sort())await collect(join(path,child));
 }else if(info.isFile()){
  const name=relative(root,path).split(sep).join('/');
  const allowed=/^dist\/[a-zA-Z0-9_/-]+\.js(?:\.map)?$/.test(name)||
   /^migrations\/\d+_[a-z0-9_]+\.sql$/.test(name)||
   ['package.json','package-lock.json','README.md','.env.example'].includes(name);
  if(!allowed)throw new Error('Unexpected deployment file: '+name);
  files.push({name,data:await readFile(path)});
 }else throw new Error('Unsupported deployment file.');
}
for(const name of ['dist','migrations','package.json','package-lock.json','README.md','.env.example'])await collect(join(root,name));
if(!files.some(f=>f.name==='dist/server.js')||!files.some(f=>f.name==='dist/cli.js'))throw new Error('Missing production entry points.');
files.push({name:'DEPLOY.txt',data:Buffer.from(
 'JackTools Backend - Node.js >=24.17.0\n\n'+
 'Extract into the Node.js application directory, not a public static web root.\n'+
 'Keep dist/ and migrations/ beside package.json. No node_modules or real .env is included.\n'+
 'Set production environment variables using your hosting panel; see .env.example and README.md.\n'+
 'Do not use example credentials in production. Back up the database before upgrading.\n\n'+
 'Run on the server in this directory, with production environment variables:\n'+
 '  npm ci --omit=dev\n'+
 '  npm start\n\n'+
 'Alternatively configure startup file dist/server.js in the hosting panel.\n'+
 'Startup applies pending migrations automatically. Packaging runs no database commands.\n'
)});
// Classic ZIP, standard DEFLATE + UTF-8, with only Node built-ins.
// Fixed timestamps avoid leaking filesystem dates. ZIP64 is not supported.
const chunks=[],directory=[];
let offset=0,centralSize=0;
for(const {name:filename,data} of files){
 const name=Buffer.from(filename),compressed=deflateRawSync(data),checksum=crc32(data);
 if(name.length>65535||data.length>0xffffffff||compressed.length>0xffffffff)throw new Error('ZIP size limit exceeded.');
 const header=Buffer.alloc(30);
 header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);
 header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);
 header.writeUInt16LE(33,12); // 1980-01-01.
 header.writeUInt32LE(checksum,14);header.writeUInt32LE(compressed.length,18);
 header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
 chunks.push(header,name,compressed);
 const entry=Buffer.alloc(46);
 entry.writeUInt32LE(0x02014b50,0);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);
 entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(8,10);entry.writeUInt16LE(33,14);
 entry.writeUInt32LE(checksum,16);entry.writeUInt32LE(compressed.length,20);
 entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);
 directory.push(entry,name);centralSize+=entry.length+name.length;
 offset+=header.length+name.length+compressed.length;
 if(offset>0xffffffff)throw new Error('ZIP size limit exceeded.');
}
if(files.length>65535||centralSize>0xffffffff)throw new Error('ZIP size limit exceeded.');
const end=Buffer.alloc(22);
end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);
const output=join(root,'releases','jacktools-backend.zip');
await mkdir(join(root,'releases'),{recursive:true});
await writeFile(output+'.tmp',Buffer.concat([...chunks,...directory,end]));
await rename(output+'.tmp',output);
console.log('\nDeployment ZIP: '+output+'\n'+files.length+' files; no node_modules or real .env included.');
