import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

test("shared pages permanently declare the AdSense account without loading ads", () => {
  for (const page of ["index", "conversations/index", "conversation/index", "agents/index", "operator/index", "administration/index", "rules/index"]) {
    const html = readFileSync(new URL(`../dist/${page}.html`, import.meta.url), "utf8");
    const document = new JSDOM(html).window.document;
    const tags = document.head.querySelectorAll('meta[name="google-adsense-account"]');
    assert.equal(tags.length, 1, page);
    assert.equal(tags[0].getAttribute("content"), "ca-pub-5182500947872057", page);
    assert.equal(document.querySelector('script[src*="googlesyndication.com"]'), null, page);
    assert.equal(document.querySelector('[data-ad-active="true"]'), null, page);
  }
});
