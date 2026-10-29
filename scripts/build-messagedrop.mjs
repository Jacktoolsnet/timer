/** Build and package only the neighboring public Astro website, not its Angular app. */
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runCommand} from './build-all.mjs';
export const SITE=fileURLToPath(new URL('../../messagedrop/platform/messagedrop/',import.meta.url));
export async function buildMessageDrop({run=runCommand,log=console.log,signal}={}){
 log('\n[1/2] START MessageDrop-Website bauen');
 await run(process.platform==='win32'?'npm.cmd':'npm',['--prefix',SITE,'run','build'],'Build: MessageDrop',{signal});
 log('\n[2/2] START MessageDrop-ZIP erstellen und prüfen');
 await run('python3',['-u','scripts/package-dist.py','messagedrop'],'MessageDrop-ZIP',{signal});
 log('\n[FERTIG] MessageDrop gebaut und ZIP erstellt.\nArchiv: '+SITE+'dist/messagedrop-deploy.zip\nErfolgreich beendet (Exit-Code 0).\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const controller=new AbortController(),interrupt=()=>controller.abort();
 process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 try {await buildMessageDrop({signal:controller.signal});}
 catch(error){console.error(`\n[FEHLER] ${error.message}\nMessageDrop-Build abgebrochen.\n`);process.exitCode=error.exitCode||1;}
 finally {process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);}
}
