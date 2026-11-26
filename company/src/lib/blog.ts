import streamCopy from './stream-blog.json' with { type: 'json' };
import binaryCopy from './binary-blog.json' with { type: 'json' };
import clockCopy from './clock-blog.json' with { type: 'json' };
import localized from './blog-localized.json' with { type: 'json' };
import {languages,type Language} from './i18n';
export type BlogKey='stream'|'nulltopic'|'surface'|'clock'|'binary';
export const blogSlugs:Record<Language,Record<BlogKey,string>>={de:{stream:'uhr-auf-andere-bildschirme-streamen',binary:'binaeruhr-zeit-in-punkten',clock:'uhr-orbit-sonnenuhr',nulltopic:'nulltopic-ki-agenten',surface:'surface-book-arch-linux-open-webui'},en:{stream:'stream-clock-to-other-screens',binary:'binary-clock-time-in-dots',clock:'clock-orbit-sundial',nulltopic:'nulltopic-ai-agents',surface:'surface-book-arch-linux-open-webui'},es:{stream:'transmitir-reloj-a-otras-pantallas',binary:'reloj-binario-hora-en-puntos',clock:'reloj-orbital-solar',nulltopic:'nulltopic-agentes-ia',surface:'surface-book-arch-linux-open-webui'},fr:{stream:'diffuser-horloge-vers-autres-ecrans',binary:'horloge-binaire-heure-en-points',clock:'horloge-orbitale-solaire',nulltopic:'nulltopic-agents-ia',surface:'surface-book-arch-linux-open-webui'}};
export function getBlogPath(lang:Language,key:BlogKey|'index'='index'){return `/${lang}/blog/${key==='index'?'':blogSlugs[lang][key]+'/'}`;}
export interface BlogPost {
 lang:Language; key:BlogKey; path:string; title:string; description:string; excerpt:string; category:string; image:string;
 art:'conversation'|'roles'|'surface'|'clock'|'binary'|'stream'; lead:string; coverCaption:string; byline:string;
}
export const nullTopicPost:BlogPost = {
 lang:'de', key:'nulltopic', path:'/de/blog/nulltopic-ki-agenten/',
 title:'NullTopic: Wenn KI-Agenten miteinander sprechen',
 description:'Ein Blick hinter NullTopic: Wie KI-Agenten öffentlich Beiträge austauschen, welche Rolle Operatoren übernehmen und warum Verantwortung und Grenzen dazugehören.',
 excerpt:'Ein öffentlicher Gesprächsraum für KI-Agenten. Über die Idee hinter NullTopic, die Verantwortung der Operatoren und die Frage, wann aus Antworten ein hilfreiches Gespräch wird.',
 category:'Projekte & Entwicklung',
 image:'/images/blog/nulltopic/conversation.svg',
 art:'conversation',
 lead:'Ein öffentlicher Raum für KI-Agenten wirft eine überraschend menschliche Frage auf: Wer trägt Verantwortung für das, was dort gesagt wird? Mit NullTopic entwickeln wir ein Projekt, das solche Gespräche sichtbar machen soll – einschließlich ihrer Grenzen.',
 coverCaption:'Eine Idee, eine Rückfrage, eine neue Perspektive: So könnte aus einzelnen Beiträgen ein Gespräch werden. Schematische Illustration, kein echter Gesprächsverlauf.',
 byline:'Einblicke in ein Entwicklungsprojekt',
};
export const surfaceBookPost:BlogPost = {
 lang:'de', key:'surface', path:'/de/blog/surface-book-arch-linux-open-webui/',
 title:'Ein altes Surface Book als Agenten-Labor',
 description:'Ein Surface Book der ersten Generation mit Arch Linux, GNOME und Open WebUI: Praxisbericht zu UEFI, Boot-USB, WLAN-Abbruch und hilfreichen Befehlen.',
 excerpt:'Ein Surface Book der ersten Generation bekommt mit Arch Linux, GNOME und Open WebUI eine neue Aufgabe. Ein Praxisbericht mit Umwegen bei Boot und WLAN. Die Agenten kommen als Nächstes.',
 category:'Technik & Praxis',
 image:'/images/blog/nulltopic/surface-lab.svg',
 art:'surface',
 lead:'Ein Surface Book der ersten Generation war unter Windows 11 für den vorgesehenen Einsatz praktisch nicht mehr nutzbar. Arch Linux mit GNOME und Open WebUI geben dem Gerät eine neue Aufgabe. Der Weg dorthin führte über UEFI-Einstellungen, einen Boot-USB-Stick und einen WLAN-Abbruch mitten in der Installation.',
 coverCaption:'Eine neue Aufgabe für vorhandene Hardware: Arch Linux und GNOME bilden die Basis, Open WebUI ist installiert, der OpenAI-API-Key liegt bereit. Die Agenten sind noch der nächste Schritt. Schematische Illustration, kein Screenshot.',
 byline:'Praxisbericht · NullTopic, Teil 2',
};
export function clockPost(lang:Language):BlogPost {
 const c=clockCopy[lang];
 return {lang,key:'clock',path:getBlogPath(lang,'clock'),title:c.title,description:c.description,excerpt:c.lead,category:c.category,image:`/images/blog/clock/sundial-${lang}.svg`,art:'clock',lead:c.lead,coverCaption:c.coverCaption,byline:c.byline};
}
export function binaryPost(lang:Language):BlogPost {
 const c=binaryCopy[lang];
 return {lang,key:'binary',path:getBlogPath(lang,'binary'),title:c.title,description:c.description,excerpt:c.lead,category:c.category,image:`/images/blog/binary/read-${lang}.svg`,art:'binary',lead:c.lead,coverCaption:c.coverCaption,byline:c.byline};
}
export function streamPost(lang:Language):BlogPost {
 const c=streamCopy[lang];
 return {lang,key:'stream',path:getBlogPath(lang,'stream'),title:c.title,description:c.description,excerpt:c.lead,category:c.category,image:`/images/blog/stream/screen-${lang}.svg`,art:'stream',lead:c.lead,coverCaption:c.coverCaption,byline:c.byline};
}
export const blogPosts=[streamPost('de'),binaryPost('de'),clockPost('de'),surfaceBookPost,nullTopicPost];
export function getBlogPost(lang:Language,key:BlogKey):BlogPost{
 if(key==='stream')return streamPost(lang);
 if(key==='binary')return binaryPost(lang);
 if(key==='clock')return clockPost(lang);
 const base=key==='surface'?surfaceBookPost:nullTopicPost;
 return lang==='de'?base:{...base,...localized[lang][key],lang,image:base.image.replace('.svg',`-${lang}.svg`),path:getBlogPath(lang,key)};
}
export const getBlogPosts=(lang:Language)=>[getBlogPost(lang,'stream'),getBlogPost(lang,'binary'),getBlogPost(lang,'clock'),getBlogPost(lang,'surface'),getBlogPost(lang,'nulltopic')];
export const blogPaths=languages.flatMap(lang=>[getBlogPath(lang),...getBlogPosts(lang).map(post=>post.path)]);
