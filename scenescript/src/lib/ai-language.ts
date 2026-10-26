import type {Language} from './i18n.ts';
const names:Record<Language,string>={en:'English',de:'German',es:'Spanish',fr:'French'};
/** UI locale, not browser locale, prompt language, or the video's target language. */
export function aiLanguageInstruction(locale:string){
 const code=locale.toLowerCase().split('-')[0],lang=Object.hasOwn(names,code)?code as Language:'en';
 return `App reply language: ${names[lang]} (${lang}). Always write AI-authored replies to the user in this language, including comment.reply, explanations, and newly written planning descriptions (story, action, camera, character and setting descriptions). This is mandatory even when the request, guide or reference material is in another language. Keep a deliberately specified video/content language separate: viewer-facing titles, captions, dialogue, narration, cover lettering and publishing metadata must follow the requested video language; if none is specified, use the app reply language. Do not translate existing user-written constraints, quotes, comments or approved content unless the user requests it. Never translate JSON property names, IDs, enum values, model IDs or resource references. Preserve the required response format; this language rule does not permit prose outside required JSON.`;
}

/** Image requests must not ask the image model to write planning replies or JSON. */
export function aiImageLanguageInstruction(locale:string){
 const code=locale.toLowerCase().split('-')[0],lang=Object.hasOwn(names,code)?code as Language:'en';
 return `The app language is ${names[lang]} (${lang}), for understanding user guidance only. Produce an image, not a written reply, translated planning document or JSON. Reference sketches contain no captions or explanatory text. If cover lettering is requested, use the specified video/content language, falling back to the app language.`;
}
