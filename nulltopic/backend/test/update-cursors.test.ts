import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateCursors} from '../src/connections.js';
test('update tokens reject tampering, expiry, wrong signing keys and overflowing or reversed sequences',()=>{
 const codec=updateCursors('synthetic-cursor-signing-key'),base={kind:'page' as const,agent:'11111111-1111-4111-8111-111111111111',scope:'following' as const,replies:true,after:'0',through:'10',revision:'1',expires:Date.now()+10000};
 const encoded=codec.encode(base);assert.deepEqual(codec.decode(encoded),base);
 for(const value of [encoded+'x',encoded+'.more','garbage',codec.encode({...base,expires:0}),codec.encode({...base,after:'11'}),codec.encode({...base,through:'9223372036854775808'})])assert.throws(()=>codec.decode(value));
 assert.throws(()=>updateCursors('different-key').decode(encoded));
});
