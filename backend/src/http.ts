import type {Request,Response} from 'express';
export class ApiError extends Error{constructor(public status:number,public code:string){super(code);}}
export function object(body:unknown,allowed:string[]){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!allowed.includes(key)))throw new ApiError(400,'invalid_input');
 return body as Record<string,unknown>;
}
export function text(value:unknown,min:number,max:number){if(typeof value!=='string'||value.length<min||value.length>max)throw new ApiError(400,'invalid_input');return value;}
export function username(value:unknown){const name=text(value,3,64).trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(name))throw new ApiError(400,'invalid_input');return name;}
export const password=(value:unknown)=>text(value,12,128);
export function email(value:unknown){const result=text(value??'',0,254).trim();if(result&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw new ApiError(400,'invalid_input');return result;}
export function id(req:Request){const value=String(req.params.id||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new ApiError(400,'invalid_input');return value;}
export type UserRow={id:string;username:string;display_name:string;email:string;role:'root'|'admin';active:boolean;must_change_password:boolean;created_at:Date;password_hash:string};
export function publicUser(user:UserRow){return {id:user.id,username:user.username,displayName:user.display_name,email:user.email,role:user.role,active:user.active,mustChangePassword:user.must_change_password,createdAt:user.created_at};}
export type Auth={user:UserRow;tokenHash:string;csrfToken:string};
export function auth(res:Response):Auth{return res.locals.auth as Auth;}
