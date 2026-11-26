import {loadEnvironment,loadConfig} from './config.js';
import {Database} from './database.js';
import {migrate,requireSchema} from './migrate.js';
import {bootstrapRoot} from './bootstrap.js';
loadEnvironment();
const action=process.argv[2];
let db:Database|undefined;
try{
 if(!['migrate','root:reset'].includes(action))throw new Error('Unknown command');
 if(action==='root:reset'&&!process.argv.includes('--confirm'))throw new Error('Root reset requires --confirm (revokes all root sessions)');
 const config=loadConfig(process.env);db=new Database(config);
 if(action==='migrate')await migrate(db);
 else{await requireSchema(db);await bootstrapRoot(db,config,true);}
 console.log(`${action}: complete`);
}catch(error){console.error(error instanceof Error&&/^(Invalid|Set |Root|Unknown|Run |Pending)/.test(error.message)?error.message:'Command failed; check database connection and migration state');process.exitCode=1;}
finally{await db?.close();}
