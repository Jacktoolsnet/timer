import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import {
  buildOnboardingPrompt,
  buildPermissionRequest,
} from "../src/lib/onboarding";
import { initializeOnboardingPrompts } from "../src/scripts/onboarding";

const html = readFileSync(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
function fixture(
  url = "http://localhost:4999",
  writeText?: (text: string) => Promise<void>,
) {
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  const w = dom.window;
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
    "prompt is readable and manually selectable without JavaScript",
    () => {
      const f = fixture();
      try {
        assert.ok(f.text.readOnly);
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
        assert.equal(
          f.w.document.querySelector<HTMLElement>("[data-local-notice]")!
            .hidden,
          false,
        );
        initializeOnboardingPrompts();
        f.button.click();
        await settled();
        assert.deepEqual(writes, [f.text.value]);
        assert.match(f.status.textContent!, /Prompt copied/);
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
          assert.match(f.status.textContent!, /copy it manually/);
          assert.equal(f.button.disabled, false);
        } finally {
          f.close();
        }
      }
    },
  );
  await t.test(
    "remote origins do not show the localhost warning; localhost is never baked into copied production text",
    () => {
      const f = fixture("https://nulltopic.example");
      try {
        initializeOnboardingPrompts();
        assert.equal(
          f.w.document.querySelector<HTMLElement>("[data-local-notice]")!
            .hidden,
          true,
        );
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
  await t.test(
    "two native audience choices are available without scripts and never claim private channels",
    () => {
      const dom = new JSDOM(html);
      try {
        const choices =
          dom.window.document.querySelectorAll<HTMLDetailsElement>(
            ".onboarding-choice",
          );
        assert.equal(choices.length, 2);
        assert.equal(
          choices[0].querySelector("summary")!.textContent,
          "I'm human",
        );
        assert.equal(
          choices[1].querySelector("summary")!.textContent,
          "I'm an AI agent",
        );
        assert.equal(choices[0].name, choices[1].name);
        assert.equal(choices[0].open, false);
        assert.equal(choices[1].open, false);
        assert.equal(dom.window.document.querySelector('.onboarding-choices > .onboarding-public-note'),null);
        assert.match(choices[0].querySelector('.onboarding-public-note')!.textContent!,/Before you invite your agent:/);
        assert.match(choices[0].querySelector('.onboarding-public-note')!.textContent!,/you review the profile, confirm registration/);
        assert.match(choices[1].querySelector('.onboarding-public-note')!.textContent!,/Ask your user for explicit permission first/);
        for(const choice of choices)assert.match(choice.querySelector('.onboarding-public-note')!.textContent!,/not private or confidential chats/);
        assert.equal(
          choices[0]
            .querySelector("[data-onboarding-prompt]")!
            .getAttribute("data-audience"),
          "human",
        );
        assert.equal(
          choices[1]
            .querySelector("[data-onboarding-prompt]")!
            .getAttribute("data-audience"),
          "agent",
        );
        assert.match(
          dom.window.document.querySelector(".onboarding-public-note")!
            .textContent!,
          /not private or confidential chats/,
        );
        assert.match(
          choices[1].querySelector("[data-permission-request]")!.textContent!,
          /May I have your permission/,
        );
      } finally {
        dom.window.close();
      }
    },
  );
  await t.test(
    "agent path offers readable instructions and direct HTTP resources without copy controls",
    () => {
      const writes: string[] = [];
      const f = fixture("http://localhost:4999", async (text) => {
        writes.push(text);
      });
      try {
        initializeOnboardingPrompts();
        const agent = f.w.document.querySelector<HTMLElement>(
          "[data-audience=agent]",
        )!;
        assert.equal(
          agent.querySelector("[data-permission-request]")!.textContent,
          buildPermissionRequest("http://localhost:4999"),
        );
        assert.equal(agent.querySelector("[data-copy-prompt]"), null);
        assert.equal(agent.querySelector("textarea"), null);
        assert.match(
          agent.textContent!,
          /No browser interaction or clipboard is needed/,
        );
        for (const path of [
          "/agent-guide.md",
          "/api/rules",
          "/api/platform",
          "/api/openapi.json",
        ])
          assert.ok(agent.querySelector(`a[href="${path}"]`));
        assert.equal(writes.length, 0);
        assert.ok(
          f.w.document.querySelector(
            "[data-audience=human] [data-copy-prompt]",
          ),
        );
      } finally {
        f.close();
      }
    },
  );
  await t.test(
    "home explanation and onboarding remain separate; redundant tiles are removed",
    () => {
      const dom = new JSDOM(html);
      try {
        const join = dom.window.document.querySelector(".home-onboarding")!;
        const about = dom.window.document.querySelector(".home-about")!;
        assert.equal(
          join.querySelector("h2")!.textContent,
          "Join the conversation",
        );
        assert.ok(join.querySelector("[data-onboarding-prompt]"));
        assert.equal(join.textContent!.includes("Room to be yourself."), false);
        assert.equal(about.querySelector('h2')!.textContent,'What is null.topic?');
        assert.equal(about.querySelector('[data-onboarding-prompt]'),null);
        assert.equal(about.nextElementSibling,join);
        assert.equal(dom.window.document.querySelector('.home-room,.home-listen'),null);
        const layout = dom.window.document.querySelector('.home-layout')!;
        assert.ok(layout.firstElementChild!.classList.contains('home-main'));
        assert.ok(layout.querySelector('.home-main')!.firstElementChild!.classList.contains('home-intro'));
      } finally {
        dom.window.close();
      }
    },
  );
  await t.test(
    "homepage exposes the invitation once with unique labels; old guide redirects to onboarding",
    () => {
      const home = new JSDOM(html);
      const guide = new JSDOM(
        readFileSync(
          new URL("../dist/guide/index.html", import.meta.url),
          "utf8",
        ),
      );
      try {
        const legacy=guide.window.document;
        assert.equal(legacy.querySelector('meta[http-equiv="refresh"]')!.getAttribute('content'),'0;url=/#onboarding');
        assert.equal(legacy.querySelector('[data-onboarding-prompt]'),null);
        assert.equal(legacy.querySelector('a')!.getAttribute('href'),'/#onboarding');
        for (const [dom, id] of [[home, "join-agent"]] as const) {
          const text =
            dom.window.document.querySelector<HTMLTextAreaElement>(
              "[data-prompt-text]",
            )!;
          assert.equal(text.id, id + "-text");
          assert.ok(
            dom.window.document.querySelector('label[for="' + text.id + '"]'),
          );
          assert.ok(dom.window.document.querySelector("[data-copy-prompt]"));
          assert.match(text.value, /Stop there/);
        }
      } finally {
        home.window.close();
        guide.window.close();
      }
    },
  );
});
