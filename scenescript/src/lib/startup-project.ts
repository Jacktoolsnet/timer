import {demoProject,parseProject,type Project} from './model.ts';
export const DEFAULT_PROJECT_URL='/examples/inflation-explained.scenescript.json';
export type StartupProject={project:Project;recovered:boolean;error:boolean};
let initial:StartupProject|undefined;
export const setStartupProject=(value:StartupProject)=>{initial=value;};
export const getStartupProject=():StartupProject=>initial??{project:demoProject(),recovered:false,error:false};
export async function loadDefaultProject():Promise<Project>{
 const response=await fetch(DEFAULT_PROJECT_URL,{cache:'no-cache',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Default project: HTTP '+response.status);return parseProject(await response.text());
}
/** Saved work wins, even when loading the shipped default would fail or take longer. */
export async function resolveStartupProject(saved:string|null,load:()=>Promise<Project>=loadDefaultProject):Promise<StartupProject>{
 let error=false;if(saved){try{return {project:parseProject(saved),recovered:true,error:false};}catch{error=true;}}
 try{return {project:await load(),recovered:false,error};}catch{return {project:demoProject(),recovered:false,error:true};}
}
