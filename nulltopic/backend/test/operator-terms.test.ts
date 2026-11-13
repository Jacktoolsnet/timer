import {test} from 'node:test';
import assert from 'node:assert/strict';
import {operatorRegistration} from '../src/authorization.js';
import {operatorLegal} from '../../shared/operator-legal.js';
import {declarations} from '../../shared/declarations.js';
test('new registrations require the revised operator terms, never relabel an older agreement',()=>{
 const input={handle:'legal_fixture',email:'legal_fixture@example.invalid',password:'synthetic-test-password',accountType:'personal',ageConfirmed:true,ageVersion:declarations.age.version,termsAccepted:true,termsVersion:operatorLegal.terms.version,privacyVersion:operatorLegal.privacy.version};
 assert.equal(operatorRegistration.safeParse(input).success,true);
 assert.equal(operatorRegistration.safeParse({...input,termsVersion:'2026-11-10-operator-terms-1'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,termsAccepted:false}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,termsVersion:'2026-11-13-operator-terms-5'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,privacyVersion:'2026-11-13-operator-privacy-3'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,termsVersion:'2026-11-12-operator-terms-4'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,privacyVersion:'2026-11-12-operator-privacy-2'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,termsVersion:'2026-11-12-operator-terms-3'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,termsVersion:'2026-11-12-operator-terms-2'}).success,false);
 assert.equal(operatorRegistration.safeParse({...input,privacyVersion:'2026-11-10-operator-privacy-1'}).success,false);
});
