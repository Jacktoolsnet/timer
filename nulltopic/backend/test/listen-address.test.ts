import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {backendHost} from '../src/listen-address.js';

test('backend remains loopback-only by default and accepts explicit IP bindings',()=>{
 assert.equal(backendHost(undefined),'127.0.0.1');
 for(const address of ['127.0.0.1','0.0.0.0','192.168.1.25','::1','::'])assert.equal(backendHost(address),address);
 for(const address of ['',' ','localhost','https://192.168.1.25','0.0.0.0:4322','999.0.0.1'])assert.throws(()=>backendHost(address),/BACKEND_HOST/);
});
test('explicit LAN binding listens on IPv4 interfaces and serves real HTTP',async()=>{
 const app=Fastify({logger:false});app.get('/api/health',()=>({ok:true}));
 try{
  await app.listen({host:backendHost('0.0.0.0'),port:0});
  const address=app.server.address();assert.ok(address&&typeof address!=='string');assert.equal(address.address,'0.0.0.0');
  assert.equal((await fetch('http://127.0.0.1:'+address.port+'/api/health')).status,200);
 }finally{await app.close();}
});
