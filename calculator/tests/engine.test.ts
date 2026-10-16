import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,emptyDocument,fixed,parse,validateDocument,type Operation} from '../src/lib/calculation.ts';
function document(steps:[Operation,string,boolean?][],roundEach=false,decimals=2){return {...emptyDocument(),roundEach,decimals,steps:steps.map(([operation,value,enabled=true],i)=>({id:String(i),name:'',operation,value,enabled}))};}
function result(steps:[Operation,string,boolean?][],round=false){const r=calculate(document(steps,round));return r.result?fixed(r.result,2):null;}
test('table calculator order',()=>assert.equal(result([['set','100'],['add','20'],['multiply','2']]),'240.00'));
test('exact decimal arithmetic',()=>assert.equal(result([['set','0.1'],['add','0.2']]),'0.30'));
test('exact repeated fractions',()=>assert.equal(result([['set','1'],['divide','3'],['multiply','3']]),'1.00'));
test('optional per-step rounding',()=>assert.equal(result([['set','1'],['divide','3'],['multiply','3']],true),'0.99'));
test('half away from zero',()=>{assert.equal(fixed(parse('1.005'),2),'1.01');assert.equal(fixed(parse('-1.005'),2),'-1.01');assert.equal(fixed(parse('-0.001'),2),'0.00');});
test('percent increase discount and tax',()=>{assert.equal(result([['set','100'],['increase','19'],['taxOut','19']]),'100.00');assert.equal(result([['set','200'],['discount','10']]),'180.00');});
test('zero divisors invalidate following steps',()=>{const d=document([['set','5'],['divide','0'],['set','10']]);const r=calculate(d);assert.equal(r.result,null);assert.equal(r.rows[1].error,'zero');assert.equal(r.rows[2].error,'blocked');});
test('disabled invalid operation does not affect following steps',()=>assert.equal(result([['set','5'],['divide','0',false],['add','10']]),'15.00'));
test('notes subtotals and replacing values',()=>assert.equal(result([['set','5'],['note','0'],['subtotal','0'],['set','9']]),'9.00'));
test('edit delete reorder recalculation',()=>{const d=document([['set','100'],['add','20'],['multiply','2']]);d.steps[1].value='30';assert.equal(fixed(calculate(d).result!,2),'260.00');d.steps.splice(1,1);assert.equal(fixed(calculate(d).result!,2),'200.00');d.steps.push({...d.steps[0],id:'new',operation:'add',value:'30'});assert.equal(fixed(calculate(d).result!,2),'230.00');});
test('input grammar',()=>{assert.equal(fixed(parse('-,5'),2),'-0.50');for(const bad of ['1,000.00','1e6','Infinity','NaN','1 000','', '1.2.3','9'.repeat(25)])assert.throws(()=>parse(bad));});
test('tax minus 100 fails explicitly',()=>assert.equal(calculate(document([['set','1'],['taxOut','-100']])).rows[1].error,'zero'));
test('import validation',()=>{assert.deepEqual(validateDocument(emptyDocument()),emptyDocument());for(const d of [null,{...emptyDocument(),decimals:9},document([['add','NaN']]),{...emptyDocument(),steps:Array(501).fill({})}])assert.throws(()=>validateDocument(d));const d=document([['set','1'],['add','2']]);d.steps[1].id=d.steps[0].id;assert.throws(()=>validateDocument(d));});
test('very large intermediate results remain valid with per-step rounding',()=>{const d=document([['set','999999999999999999999999'],['multiply','999999999999999999999999']],true);assert.ok(calculate(d).result);});
test('resource limit is a visible error',()=>{const d=document(Array.from({length:30},()=>['multiply','999999999999999999999999'] as [Operation,string]));d.steps[0].operation='set';assert.equal(calculate(d).result,null);assert.ok(calculate(d).rows.some(row=>row.error==='limit'));});

test('gross tax addition is named separately and roundtrips with net removal',()=>{assert.equal(result([['set','100'],['taxIn','19']]),'119.00');assert.equal(result([['set','100'],['taxIn','19'],['taxOut','19']]),'100.00');assert.equal(result([['set','100'],['taxIn','7']]),'107.00');assert.deepEqual(validateDocument(document([['set','100'],['taxIn','19']])),document([['set','100'],['taxIn','19']]));});
