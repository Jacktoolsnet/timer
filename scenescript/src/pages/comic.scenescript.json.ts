import {comicProject} from '../lib/comic-example';
export function GET(){return new Response(JSON.stringify(comicProject(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});}
