import {scrypt,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
const options={N:32768,r:8,p:1,maxmem:64*1024*1024};
const derive=(password:string,salt:Buffer)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,options,(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string){const salt=randomBytes(16);return `scrypt1:${salt.toString('hex')}:${(await derive(password,salt)).toString('hex')}`;}
export async function verifyPassword(password:string,hash:string){
 const [version,salt,expected]=hash.split(':');
 if(version!=='scrypt1'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(expected||''))return false;
 const actual=await derive(password,Buffer.from(salt,'hex'));return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
export const token=()=>randomBytes(32).toString('hex');
export const digest=(secret:string,value:string)=>createHmac('sha256',secret).update(value).digest('hex');
export function equal(a:string,b:string){const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
