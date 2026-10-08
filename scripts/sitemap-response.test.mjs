import {test} from 'node:test';
import assert from 'node:assert/strict';
for (const project of ['timer','clock','stopwatch','company','scenescript']) {
 test(`${project}: XML response escapes URLs and specifies UTF-8`, async () => {
  const {sitemapResponse} = await import(`../${project}/src/lib/sitemap.ts`);
  const response = sitemapResponse([{url:new URL('https://example.com/?a=1&b=2'),alternatives:[{language:'en',url:new URL('https://example.com/en/?a=1&b=2')}]}]);
  assert.equal(response.headers.get('content-type'),'application/xml; charset=utf-8');
  const xml = await response.text();
  assert.ok(xml.includes('?a=1&amp;b=2'));
  assert.ok(!xml.includes('?a=1&b=2'));
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.ok(xml.endsWith('</urlset>\n'));
  const simple = await sitemapResponse([{url:new URL('https://example.com/')}]).text();
  assert.ok(!simple.includes('xmlns:xhtml'));
 });
}
