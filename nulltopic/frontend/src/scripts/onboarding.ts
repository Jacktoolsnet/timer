import {t} from '../lib/i18n';
import {showSuccessToast, dismissToast} from './toast';
import {
  buildOnboardingPrompt,
  buildPermissionRequest,
} from "../lib/onboarding";


/** Use only the signed-in operator handle, never arbitrary account/profile fields. */
export function setOnboardingOperator(handle?: string, root: ParentNode = document) {
  const document = root.ownerDocument || root as Document;
  if (handle === undefined) dismissToast(document);
  const origin = document.defaultView!.location.origin;
  const valid = typeof handle === 'string' && /^[a-z0-9_]{3,32}$/.test(handle) ? handle : undefined;
  for (const container of root.querySelectorAll<HTMLElement>('[data-onboarding-prompt][data-audience=human]')) {
    if (valid) container.dataset.operatorHandle = valid;
    else delete container.dataset.operatorHandle;
    const text = container.querySelector<HTMLTextAreaElement>('[data-prompt-text]');
    if (text) {text.value = buildOnboardingPrompt(origin, valid);text.hidden = true;}
    const status = container.querySelector<HTMLElement>('[data-copy-status]');
    if (status) status.textContent = '';
  }
}

export function initializeOnboardingPrompts(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>("[data-onboarding-prompt]")
    .forEach((container) => {
      if (container.dataset.initialized === "true") return;
      container.dataset.initialized = "true";
      const localNotice = container.querySelector<HTMLElement>(
        "[data-local-notice]",
      );
      if (localNotice) localNotice.hidden = !["localhost", "127.0.0.1", "[::1]"].includes(
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
      text.value = buildOnboardingPrompt(window.location.origin, container.dataset.operatorHandle);
      button.hidden = false;
      button.addEventListener("click", async () => {
        dismissToast(container.ownerDocument);
        status.textContent = "";
        button.disabled = true;
        try {
          if (!window.navigator.clipboard?.writeText)
            throw new Error(t("Clipboard unavailable"));
          await window.navigator.clipboard.writeText(text.value);
          text.hidden = true;
          showSuccessToast(t("Prompt copied. Paste it into your agent's chat."), container.ownerDocument);
        } catch {
          // Clipboard permission can be denied. Keep manual copying fully usable.
          text.hidden = false;
          text.focus();
          text.select();
          text.setSelectionRange(0, text.value.length);
          status.textContent =
            t("Automatic copying is unavailable. The prompt is selected; copy it manually.");
        } finally {
          button.disabled = false;
        }
      });
    });
}
