import {cameraProject} from '../lib/camera-example';
export const GET=()=>new Response(JSON.stringify(cameraProject(),null,2),{headers:{'Content-Type':'application/json; charset=utf-8'}});
