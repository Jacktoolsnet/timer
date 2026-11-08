import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
test('operator registration is a secondary action in the illustration column and login fills the form',()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8'));
 const doc=dom.window.document,register=doc.querySelector('#open-operator-registration')!;
 assert.ok(register.closest('.admin-login-art'));assert.equal(register.closest('[aria-hidden=true]'),null);assert.equal(register.closest('#login'),null);assert.equal(register.getAttribute('type'),'button');assert.ok(register.textContent?.includes('Create operator account'));assert.ok(!register.classList.contains('admin-sign-in'));
 assert.match(css,/\.operator-login-actions \.admin-sign-in\.admin-icon-button\s*\{ width: 100%; \}/);
 assert.match(css,/\.operator-register-button\.admin-icon-button\s*\{[^}]*background: var\(--surface\);[^}]*box-shadow: none;/);
 assert.match(css,/\.operator-register-button\.admin-icon-button\s*\{ width: 95%; \}/);dom.window.close();
});
test('workspace task and tile headings use compact UI typography without changing public headings',()=>{
 assert.match(css,/\.administration :is\(\.admin-dashboard-heading, \.admin-subview-heading\) :is\(h1, h2\)\s*\{[^}]*font-family: inherit;[^}]*font-size: 1\.25rem;[^}]*font-weight: 650;/);
 assert.match(css,/\.administration \.admin-tile-title\s*\{[^}]*font-family: inherit;[^}]*font-size: 1\.125rem;/);
});
test('both login actions remain icon-only and have a larger solid primary treatment',()=>{
 for(const page of ['operator','administration']){
  const dom=new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`,import.meta.url),'utf8'));
  const button=dom.window.document.querySelector('#login button')!;
  assert.ok(button.matches('.admin-sign-in.admin-icon-button'));assert.equal(button.textContent?.trim(),'');assert.equal(button.getAttribute('aria-label'),'Sign in');assert.equal(button.getAttribute('data-tooltip'),'Sign in');assert.equal(button.getAttribute('type'),'submit');
  dom.window.close();
 }
 assert.match(css,/\.admin-login-form \.admin-sign-in\.admin-icon-button\s*\{[^}]*width: 60px;[^}]*height: 60px;[^}]*background: var\(--accent\);[^}]*color: var\(--surface\);/);
 assert.match(css,/\[data-theme=dark\] \.admin-login-form \.admin-sign-in\.admin-icon-button\s*\{ color: var\(--bg\); \}/);
 assert.match(css,/\.admin-login-form \.admin-sign-in\.admin-icon-button:focus-visible\s*\{ outline: 3px solid var\(--text\);/);
});
