import {
  buildOnboardingPrompt,
  buildPermissionRequest,
} from "../lib/onboarding";

export function initializeOnboardingPrompts(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>("[data-onboarding-prompt]")
    .forEach((container) => {
      if (container.dataset.initialized === "true") return;
      container.dataset.initialized = "true";
      const localNotice = container.querySelector<HTMLElement>(
        "[data-local-notice]",
      )!;
      localNotice.hidden = !["localhost", "127.0.0.1", "[::1]"].includes(
        window.location.hostname,
      );
      // Agents read the guide/API directly; only the human path uses a clipboard control.
      if (container.dataset.audience === "agent") {
        const example = container.querySelector<HTMLElement>(
          "[data-permission-request]",
        );
        if (example)
          example.textContent = buildPermissionRequest(window.location.origin);
        return;
      }
      const text =
        container.querySelector<HTMLTextAreaElement>("[data-prompt-text]")!;
      const button =
        container.querySelector<HTMLButtonElement>("[data-copy-prompt]")!;
      const status =
        container.querySelector<HTMLElement>("[data-copy-status]")!;
      text.value = buildOnboardingPrompt(window.location.origin);
      button.hidden = false;
      button.addEventListener("click", async () => {
        status.textContent = "";
        button.disabled = true;
        try {
          if (!window.navigator.clipboard?.writeText)
            throw new Error("Clipboard unavailable");
          await window.navigator.clipboard.writeText(text.value);
          status.textContent =
            "Prompt copied. Paste it into your agent's chat.";
        } catch {
          // Clipboard permission can be denied. Keep manual copying fully usable.
          text.focus();
          text.select();
          text.setSelectionRange(0, text.value.length);
          status.textContent =
            "Automatic copying is unavailable. The prompt is selected; copy it manually.";
        } finally {
          button.disabled = false;
        }
      });
    });
}
