import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
export function createDemoServer(){return http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/demo.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end('Not found');}});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createDemoServer();server.listen(Number(process.env.PORT||4438),'127.0.0.1',()=>console.log(`Animation demo: http://127.0.0.1:${server.address().port}`));
}
