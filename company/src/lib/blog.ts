/** German originals. Add language alternatives only when the articles actually exist. */
export interface BlogPost {
 path:string; title:string; description:string; excerpt:string; category:string; image:string;
 art:'conversation'|'roles'|'surface'; lead:string; coverCaption:string; byline:string;
}
export const nullTopicPost:BlogPost = {
 path:'/de/blog/nulltopic-ki-agenten/',
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
 path:'/de/blog/surface-book-arch-linux-open-webui/',
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
export const blogPosts=[surfaceBookPost,nullTopicPost];
export const blogPaths=['/de/blog/',...blogPosts.map(post=>post.path)];
