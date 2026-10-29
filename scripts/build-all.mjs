/** Finite build runner: explicit progress, exit status and upload archives. */
import {spawn} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PROJECTS = ['company','timer','clock','metronome','stopwatch','breathe','relax','calculator','scenescript','lava'];

export class BuildStepError extends Error {
 constructor(label, code = 1) { super(`${label} fehlgeschlagen (Exit-Code ${code}).`); this.exitCode = code; }
}

export function runCommand(command, args, label, {signal, quietMs = 15000} = {}) {
 return new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(new BuildStepError('Abgebrochen',130)); return; }
  const child = spawn(command,args,{cwd:ROOT,stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'});
  let lastOutput = Date.now(), finished = false;
  const started = lastOutput;
  const heartbeat = setInterval(()=>{
   if(Date.now()-lastOutput>=quietMs) console.log(`[AKTIV] ${label} läuft weiterhin (${Math.floor((Date.now()-started)/1000)} s) …`);
  },quietMs);
  heartbeat.unref();
  let killTimer;
  function kill(signalName) {
   if(!child.pid)return;
   try { if(process.platform!=='win32')process.kill(-child.pid,signalName);else child.kill(signalName); } catch {}
  }
  function abort(){
   kill('SIGTERM');
   killTimer=setTimeout(()=>kill('SIGKILL'),5000);killTimer.unref();
  }
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  function cleanup(){clearInterval(heartbeat);clearTimeout(killTimer);signal?.removeEventListener('abort',abort);}
  child.stdout.on('data',chunk=>{lastOutput=Date.now();process.stdout.write(chunk);});
  child.stderr.on('data',chunk=>{lastOutput=Date.now();process.stderr.write(chunk);});
  child.on('error',error=>{if(finished)return;finished=true;cleanup();reject(new Error(`${label}: ${error.message}`));});
  child.on('close',code=>{
   if(finished)return;finished=true;cleanup();
   if(signal?.aborted)reject(new BuildStepError('Abgebrochen',130));
   else if(code!==0)reject(new BuildStepError(label,Number.isInteger(code)&&code>0?code:1));
   else resolve();
  });
 });
}

export async function buildAll({run=runCommand,log=console.log,signal}={}) {
 const started=Date.now(),total=PROJECTS.length+1;
 log(`\n=== BUILD ALLE SEITEN: ${PROJECTS.length} Builds + ZIP-Archive ===`);
 for(const [index,project] of PROJECTS.entries()){
  const label=`Build: ${project}`;
  log(`\n[${index+1}/${total}] START ${label}`);
  await run(process.platform==='win32'?'npm.cmd':'npm',['--prefix',project,'run','build'],label,{signal});
  log(`[${index+1}/${total}] OK ${label}`);
 }
 log(`\n[${total}/${total}] START ZIP-Archive erstellen und prüfen`);
 await run('python3',['-u', 'scripts/package-dist.py'],'ZIP-Archive',{signal});
 log(`\n============================================================\n[FERTIG] Alle ${PROJECTS.length} Seiten gebaut und ZIP-Archive erstellt.\nDauer: ${Math.ceil((Date.now()-started)/1000)} Sekunden.\nDie Upload-Archive liegen in <projekt>/dist/<projekt>-deploy.zip.\nBuild erfolgreich beendet (Exit-Code 0).\n============================================================\n`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const abort=new AbortController();
 const interrupt=()=>abort.abort();
 process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 try { await buildAll({signal:abort.signal}); }
 catch(error){
  console.error(`\n[FEHLER] ${error.message}\nGesamtbuild abgebrochen – keine vollständige neue Ausgabe aller ZIP-Archive garantiert.\n`);
  process.exitCode=error.exitCode||1;
 } finally {process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);}
}
