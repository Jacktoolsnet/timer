import { getDictionary, type Language } from './i18n';
const copy = {
 de: {
  supportTitle:'Kleine Tools. Gemeinsam möglich.',supportBody:'Du magst unsere Projekte? Mit einem Kaffee kannst du unsere Arbeit unterstützen.',
  rememberHint:'Optional: Sprache, Farbe, Stil, Hell-/Dunkelmodus und Schriftgröße in diesem Browser für spätere Besuche speichern. Keine Übertragung an uns. Ausschalten oder lokale Einstellungen löschen entfernt die Daten. Ohne Auswahl gelten Änderungen nur auf der aktuellen Seite.',
  privacyBody:'Diese Homepage verwendet keine Analyse- oder Trackingskripte. Dauerhaftes Speichern deiner Anzeigeeinstellungen ist optional und standardmäßig ausgeschaltet. Sie werden nicht an uns gesendet.',
  privacyNote:'Hier kannst du die lokal gespeicherten Einstellungen dieser Homepage löschen. Die Einstellungen der Tools bleiben davon unberührt.',
  tools:'Tools',idea:'Unsere Idee',navigation:'Hauptnavigation',home:'JackTools.Net Startseite',
 },
 en: {
  supportTitle:'Small tools. Made possible together.',supportBody:'Enjoy our projects? You can support our work with a coffee.',
  rememberHint:'Optional: save language, colours, style, light/dark mode and font size in this browser for future visits. Nothing is sent to us. Disable storage or delete local preferences to remove the data. Otherwise changes only apply on the current page.',
  privacyBody:'This homepage uses no analytics or tracking scripts. Saving display preferences is optional and disabled by default. Preferences are not sent to us.',
  privacyNote:'You can delete the locally saved preferences for this homepage here. Settings for the tools are not affected.',
  tools:'Tools',idea:'Our idea',navigation:'Main navigation',home:'JackTools.Net home',
 },
 es: {
  supportTitle:'Pequeñas herramientas. Posibles gracias a todos.',supportBody:'¿Te gustan nuestros proyectos? Puedes apoyar nuestro trabajo con un café.',
  rememberHint:'Opcional: guarda idioma, colores, estilo, modo claro/oscuro y tamaño de letra en este navegador. No se nos envía nada. Desactiva el almacenamiento o borra los ajustes locales para eliminar los datos. Sin esta opción, los cambios solo se aplican a la página actual.',
  privacyBody:'Esta página no utiliza scripts de análisis ni rastreo. Guardar los ajustes de visualización es opcional y está desactivado por defecto. No se nos envían los ajustes.',
  privacyNote:'Aquí puedes borrar los ajustes guardados de esta página. Los ajustes de las herramientas no se modifican.',
  tools:'Herramientas',idea:'Nuestra idea',navigation:'Navegación principal',home:'Inicio de JackTools.Net',
 },
 fr: {
  supportTitle:'Petits outils. Ensemble, c’est possible.',supportBody:'Nos projets vous plaisent ? Vous pouvez soutenir notre travail avec un café.',
  rememberHint:'Facultatif : enregistrer la langue, les couleurs, le style, le mode clair/sombre et la taille du texte dans ce navigateur. Rien ne nous est transmis. Désactivez le stockage ou supprimez les préférences pour effacer les données. Sinon, les changements ne valent que pour la page actuelle.',
  privacyBody:'Cette page n’utilise aucun script d’analyse ou de suivi. L’enregistrement des préférences est facultatif et désactivé par défaut. Elles ne nous sont pas transmises.',
  privacyNote:'Vous pouvez supprimer ici les préférences locales de cette page. Les paramètres des outils ne sont pas affectés.',
  tools:'Outils',idea:'Notre idée',navigation:'Navigation principale',home:'Accueil JackTools.Net',
 },
} satisfies Record<Language,Record<string,string>>;
export function getCompanyDictionary(lang:Language) { return {...getDictionary(lang),...copy[lang]}; }
