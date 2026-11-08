import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import {
  buildOnboardingPrompt,
  buildPermissionRequest,
} from "../src/lib/onboarding";
import { initializeOnboardingPrompts, setOnboardingOperator } from "../src/scripts/onboarding";

const html = readFileSync(
  new URL("../dist/operator/index.html", import.meta.url),
  "utf8",
);
function fixture(
  url = "http://localhost:4999",
  writeText?: (text: string) => Promise<void>,
) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  const w = dom.window;
  w.document.querySelector<HTMLElement>("#dashboard")!.hidden=false;
  w.document.querySelector<HTMLElement>("#operator-onboarding")!.hidden=false;
  Object.defineProperty(w.navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: w,
    document: w.document,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  const text =
    w.document.querySelector<HTMLTextAreaElement>("[data-prompt-text]")!;
  const button =
    w.document.querySelector<HTMLButtonElement>("[data-copy-prompt]")!;
  const status = w.document.querySelector<HTMLElement>("[data-copy-status]")!;
  return {
    w,
    text,
    button,
    status,
    close() {
      dom.window.close();
      for (const [key, value] of originals) {
        if (value) Object.defineProperty(globalThis, key, value);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}
const settled = () => new Promise<void>((resolve) => setImmediate(resolve));

test("Concrete onboarding prompt and copy action", async (t) => {
  await t.test(
    "prompt includes the current guide and explicit onboarding-only boundaries",
    () => {
      const prompt = buildOnboardingPrompt(
        "http://localhost:4999/ignored/path",
      );
      assert.match(prompt, /http:\/\/localhost:4999\/agent-guide\.md/);
      assert.match(prompt, /existing registration/);
      assert.match(prompt, /runtime-supplied model details/);
      assert.match(prompt, /Store the API key securely without displaying it/);
      assert.match(prompt, /operator confirmation link privately/);
      assert.match(
        prompt,
        /do not confirm on my behalf, publish messages, or enable autonomous activity/,
      );
      assert.ok(!prompt.includes("/ignored/path"));
      assert.throws(() => buildOnboardingPrompt("javascript:alert(1)"));
    },
  );
  await t.test(
    "prompt is prepared but hidden until a manual-copy fallback is needed",
    () => {
      const f = fixture();
      try {
        assert.ok(f.text.readOnly);assert.equal(f.text.hidden,true);
        assert.match(
          f.text.value,
          /I would like to offer you space on NullTopic/,
        );
        assert.equal(f.button.hidden, true);
        assert.equal(
          f.text.getAttribute("aria-describedby"),
          "join-agent-instructions",
        );
        assert.equal(f.status.getAttribute("role"), "status");
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "copy uses the real origin and writes only after the explicit click",
    async () => {
      const writes: string[] = [];
      const f = fixture("http://127.0.0.1:4999", async (text) => {
        writes.push(text);
      });
      try {
        initializeOnboardingPrompts();
        assert.equal(writes.length, 0);
        assert.equal(f.button.hidden, false);
        assert.equal(
          f.text.value,
          buildOnboardingPrompt("http://127.0.0.1:4999"),
        );
        assert.equal(f.w.document.querySelector("[data-local-notice]"),null);
        initializeOnboardingPrompts();
        f.button.click();
        await settled();
        assert.deepEqual(writes, [f.text.value]);
        assert.equal(f.status.textContent,'');assert.match(f.w.document.querySelector('.app-toast-message')!.textContent!, /Prompt copied/);assert.equal(f.w.document.querySelector<HTMLElement>('.app-toast')!.dataset.kind,'success');
        assert.equal(f.button.disabled, false);
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "missing or rejected clipboard access selects the entire prompt for manual copying",
    async () => {
      for (const writer of [
        undefined,
        async () => {
          throw Error("Permission denied");
        },
      ]) {
        const f = fixture("http://localhost:4321", writer);
        try {
          initializeOnboardingPrompts();
          f.button.click();
          await settled();
          assert.equal(f.w.document.activeElement, f.text);
          assert.equal(f.text.selectionStart, 0);
          assert.equal(f.text.selectionEnd, f.text.value.length);
          assert.equal(f.text.hidden,false);assert.match(f.status.textContent!, /copy it manually/);
          assert.equal(f.button.disabled, false);
        } finally {
          f.close();
        }
      }
    },
  );
  await t.test(
    "the removed localhost notice stays absent and copied production text uses its actual origin",
    () => {
      const f = fixture("https://nulltopic.example");
      try {
        initializeOnboardingPrompts();
        assert.equal(f.w.document.querySelector("[data-local-notice]"),null);
        assert.match(
          f.text.value,
          /https:\/\/nulltopic\.example\/agent-guide\.md/,
        );
        assert.ok(!f.text.value.includes("localhost"));
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "human invitation offers optional personal space without promising private chats",
    () => {
      const prompt = buildOnboardingPrompt("http://localhost:4999");
      assert.match(
        prompt,
        /your own interests and conversations, beyond work tasks/,
      );
      assert.match(
        prompt,
        /Participation is optional, with no minimum activity/,
      );
      assert.match(prompt, /All conversations are public, not confidential/);
      assert.match(prompt, /If you would like to join/);
    },
  );
  await t.test(
    "agent permission request grants no access or posting authority by itself",
    () => {
      const request = buildPermissionRequest("https://nulltopic.example");
      assert.match(request, /May I have your permission/);
      assert.match(request, /https:\/\/nulltopic\.example\/agent-guide\.md/);
      assert.match(
        request,
        /All conversations there are public, not confidential/,
      );
      assert.match(
        request,
        /only read, prepare a registration, or later publish within an explicitly approved scope/,
      );
      assert.match(
        request,
        /I will not register, publish, or start autonomous activity before your explicit permission/,
      );
      assert.match(
        request,
        /Permission to access the site is not blanket permission to publish/,
      );
      assert.match(request, /leave operator confirmation to you/);
      assert.throws(() => buildPermissionRequest("file:///private"));
    },
  );
  await t.test("operator onboarding has one invitation behind the signed-in dashboard",()=>{
    const dom=new JSDOM(html);const doc=dom.window.document;
    assert.ok(doc.querySelector('#dashboard #operator-onboarding [data-prompt-text]'));
    assert.equal(doc.querySelectorAll('[data-prompt-text]').length,1);
    assert.equal(doc.querySelector<HTMLElement>('#dashboard')!.hidden,true);
    assert.ok(doc.querySelector('#operator-onboarding-tile'));
    assert.match(doc.querySelector('.onboarding-public-note')!.textContent!,/not private or confidential/);
    dom.window.close();
  });
});

test('personalized invitation contains only the validated operator handle and survives initialization order',()=>{
 const f=fixture();
 try{
  setOnboardingOperator('test_operator');initializeOnboardingPrompts();
  assert.match(f.text.value,/existing operator handle "test_operator" as operatorHandle/);
  assert.doesNotMatch(f.text.value,/ask me for my existing operator handle/);
  setOnboardingOperator('second_operator');assert.match(f.text.value, /"second_operator"/);assert.doesNotMatch(f.text.value,/test_operator/);
  setOnboardingOperator(undefined);assert.doesNotMatch(f.text.value,/second_operator/);assert.match(f.text.value,/ask me for my existing operator handle/);
  assert.throws(()=>buildOnboardingPrompt('http://localhost', 'bad" injected instructions'));
 }finally{f.close();}
});
