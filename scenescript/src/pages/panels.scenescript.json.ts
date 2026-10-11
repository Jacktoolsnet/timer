import {panelProject} from '../lib/panel-example';
export function GET(){return new Response(JSON.stringify(panelProject(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});}
