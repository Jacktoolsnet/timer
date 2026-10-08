import {aiGuide} from '../lib/guide';
export function GET(){return new Response(aiGuide,{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
