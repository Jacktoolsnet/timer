import {currentLanguage} from '../lib/i18n';
import {imprintCopy} from '../lib/imprint-copy';
/** Only fixed legal-copy fields are translated; legal entity/contact data stay literal. */
export function initializeImprint(){
 const language=currentLanguage(),copy=imprintCopy[language],article=document.querySelector<HTMLElement>('#imprint-document')!;
 for(const field of document.querySelectorAll<HTMLElement>('[data-imprint-copy]'))field.textContent=copy[field.dataset.imprintCopy as keyof typeof copy];
 const title=document.getElementById('imprint-title')!;title.lang=language;article.lang=language;article.setAttribute('aria-label',copy.title);
 const note=document.getElementById('imprint-translation-notice')!;note.lang=language;note.hidden=language==='de';
}
