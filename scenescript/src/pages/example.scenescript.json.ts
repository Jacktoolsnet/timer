import {demoProject} from '../lib/model';
export function GET(){return new Response(JSON.stringify(demoProject(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});}
