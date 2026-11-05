import argon2 from 'argon2';
import {randomUUID} from 'node:crypto';
import {transaction} from './db.js';

/** Environment owns the one root identity; never promote an existing account. */
export async function syncRootAdministrator() {
  const handle = process.env.ROOT_ADMIN_HANDLE || '';
  const password = process.env.ROOT_ADMIN_PASSWORD || '';
  if (!!handle !== !!password) throw Error('Set both ROOT_ADMIN_HANDLE and ROOT_ADMIN_PASSWORD, or leave both empty');
  if (handle && (!/^[a-z0-9_]{3,32}$/.test(handle) || password.length < 12 || password.length > 256))
    throw Error('Root configuration requires a 3–32 character lowercase handle and a 12–256 character password');
  await transaction(async c => {
    await c.query('SELECT pg_advisory_xact_lock(481917)');
    const root = (await c.query('SELECT * FROM admins WHERE is_root FOR UPDATE')).rows[0];
    if (!handle) {
      if (root?.enabled) await c.query('UPDATE admins SET enabled=false,auth_version=$2 WHERE id=$1', [root.id, randomUUID()]);
      return;
    }
    const conflict = (await c.query('SELECT id FROM admins WHERE handle=$1 AND NOT is_root', [handle])).rows[0];
    if (conflict) throw Error('ROOT_ADMIN_HANDLE conflicts with an existing administrator; choose a distinct root handle');
    if (root && root.handle === handle && root.enabled && await argon2.verify(root.password, password)) return;
    const hashed = await argon2.hash(password);
    if (root) await c.query('UPDATE admins SET handle=$2,password=$3,enabled=true,auth_version=$4 WHERE id=$1', [root.id, handle, hashed, randomUUID()]);
    else await c.query('INSERT INTO admins(id,handle,password,is_root,enabled,auth_version) VALUES($1,$2,$3,true,true,$4)', [randomUUID(), handle, hashed, randomUUID()]);
  });
}
