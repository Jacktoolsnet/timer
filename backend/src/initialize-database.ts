import type {Database} from './database.js';
import type {Config} from './config.js';
import {migrate} from './migrate.js';
import {bootstrapRoot} from './bootstrap.js';

/** Complete schema setup before exposing HTTP or starting scheduled work. */
export async function initializeDatabase(db:Database,config:Config){
 await migrate(db);
 return bootstrapRoot(db,config);
}
