/** Descriptive search metadata and visible headings for the published tools. */
type Language = 'de' | 'en' | 'es' | 'fr';
type Tool = 'countdown' | 'pomodoro' | 'interval' | 'clock' | 'stopwatch' | 'breathe' | 'relax' | 'lava';
type Copy = { title: string; heading: string; description: string };
export const toolSeo: Record<Tool, Record<Language, Copy>> = {
 lava: {
  de:{"title": "Lavalampe online – animierte Lava", "heading": "Online-Lavalampe zum Entspannen", "description": "Beobachte weich fließende Lava in fünf Farbwelten inklusive Regenbogen. Passe Tempo und Helligkeit an und nutze die Fokusansicht. Kostenlos im Browser, ohne Anmeldung."},
  en:{"title": "Online lava lamp – flowing animation", "heading": "Online lava lamp for a quiet break", "description": "Watch softly flowing lava in five colour palettes including rainbow. Adjust speed and brightness or switch to focus view. Free in your browser, with no sign-up."},
  es:{"title": "Lámpara de lava online – animación", "heading": "Lámpara de lava online para desconectar", "description": "Observa lava en movimiento suave con cinco paletas de color, incluido arcoíris. Ajusta velocidad y brillo y activa la vista de enfoque. Gratis en el navegador, sin registro."},
  fr:{"title": "Lampe à lave en ligne – animation", "heading": "Lampe à lave en ligne pour une pause", "description": "Regardez la lave évoluer doucement dans cinq palettes, dont un arc-en-ciel. Réglez vitesse et luminosité et activez la vue concentration. Gratuit dans le navigateur, sans inscription."},
 },
 countdown: {
  de:{title:'Online-Countdown-Timer',heading:'Online-Countdown-Timer',description:'Stelle deinen Countdown frei ein: mit Signalton, analoger oder digitaler Anzeige und Fokusansicht. Kostenlos im Browser, ohne Anmeldung.'},
  en:{title:'Online countdown timer',heading:'Online countdown timer',description:'Set your own countdown with sound alerts, analog or digital display and focus view. Free in your browser, with no sign-up.'},
  es:{title:'Temporizador de cuenta atrás online',heading:'Temporizador de cuenta atrás online',description:'Configura tu cuenta atrás con avisos sonoros, vista analógica o digital y modo de concentración. Gratis en el navegador y sin registro.'},
  fr:{title:'Minuteur en ligne – compte à rebours',heading:'Minuteur et compte à rebours en ligne',description:'Réglez votre compte à rebours avec un signal sonore, un affichage analogique ou numérique et une vue concentration. Gratuit, sans inscription.'},
 },
 pomodoro: {
  de:{title:'Pomodoro-Timer online – Fokus & Pausen',heading:'Pomodoro-Timer für Fokus und Pausen',description:'Plane Fokuszeiten, kurze und lange Pausen mit deinem Pomodoro-Timer. Ruhige Minutenanzeige, optionale Sekunden und Fokusansicht. Kostenlos ohne Anmeldung.'},
  en:{title:'Online Pomodoro timer – focus & breaks',heading:'Pomodoro timer for focus and breaks',description:'Plan focus sessions, short breaks and long breaks. A calm minutes-only display, optional seconds and focus view. Free Pomodoro timer, no sign-up.'},
  es:{title:'Temporizador Pomodoro online – enfoque y descansos',heading:'Temporizador Pomodoro para concentrarte',description:'Organiza sesiones de concentración y descansos cortos y largos. Vista tranquila en minutos, segundos opcionales y modo de concentración. Gratis, sin registro.'},
  fr:{title:'Minuteur Pomodoro en ligne – concentration et pauses',heading:'Minuteur Pomodoro pour travailler et faire des pauses',description:'Organisez vos séances de concentration et vos pauses courtes ou longues. Affichage en minutes, secondes en option et vue concentration. Gratuit, sans inscription.'},
 },
 interval: {
  de:{title:'Intervalltimer online – Aktivphasen & Pausen',heading:'Intervalltimer für Aktivphasen und Pausen',description:'Stelle Vorbereitung, Aktivzeit, Pausen und Runden ein. Dein Intervalltimer wechselt die Phasen automatisch – mit Signaltönen und Fokusansicht. Kostenlos.'},
  en:{title:'Online interval timer – activity & breaks',heading:'Interval timer for activities and breaks',description:'Set preparation, active time, breaks and rounds. Your interval timer advances automatically, with sound alerts and focus view. Free, no sign-up.'},
  es:{title:'Temporizador de intervalos online',heading:'Temporizador de intervalos y pausas',description:'Ajusta preparación, actividad, pausas y rondas. Las fases avanzan automáticamente, con señales sonoras y modo de concentración. Gratis y sin registro.'},
  fr:{title:'Minuteur par intervalles en ligne',heading:'Minuteur pour activités et pauses par intervalles',description:'Réglez la préparation, les phases actives, les pauses et les tours. Les phases changent automatiquement, avec signaux sonores et vue concentration. Gratuit.'},
 },
 clock: {
  de:{title:'Online-Uhr – analog, digital & Klappzahlen',heading:'Online-Uhr mit Datum und Zeitzonen',description:'Deine kostenlose Online-Uhr: analog, digital oder mit Klappzahlen. Wähle Datum, Zeitzone und Design und nutze die Fokusansicht. Ohne Anmeldung.'},
  en:{title:'Online clock – analog, digital & flip clock',heading:'Online clock with date and time zones',description:'A free online clock with analog, digital or flip digits. Choose your date display, time zone and design, or switch to focus view. No sign-up.'},
  es:{title:'Reloj online – analógico, digital y de láminas',heading:'Reloj online con fecha y zonas horarias',description:'Reloj online gratis, analógico, digital o de láminas. Elige fecha, zona horaria y diseño, y activa el modo de concentración. Sin registro.'},
  fr:{title:'Horloge en ligne – analogique, numérique et à palettes',heading:'Horloge en ligne avec date et fuseaux horaires',description:'Horloge gratuite, analogique, numérique ou à palettes. Choisissez la date, le fuseau horaire et le style, avec une vue concentration. Sans inscription.'},
 },
 stopwatch: {
  de:{title:'Online-Stoppuhr mit Rundenzeiten & CSV-Export',heading:'Online-Stoppuhr mit Rundenzeiten',description:'Miss deine Zeit, halte Runden- und Gesamtzeiten fest und exportiere sie als CSV. Analoge oder digitale Ansicht und Fokusmodus. Kostenlos ohne Anmeldung.'},
  en:{title:'Online stopwatch with lap times & CSV export',heading:'Online stopwatch with lap times',description:'Measure elapsed time, record laps and totals, and export them as CSV. Choose analog or digital display and focus view. Free, no sign-up.'},
  es:{title:'Cronómetro online con vueltas y exportación CSV',heading:'Cronómetro online con tiempos por vuelta',description:'Mide el tiempo, registra vueltas y totales y expórtalos en CSV. Vista analógica o digital y modo de concentración. Gratis y sin registro.'},
  fr:{title:'Chronomètre en ligne avec tours et export CSV',heading:'Chronomètre en ligne avec temps par tour',description:'Mesurez le temps écoulé, enregistrez les tours et les totaux et exportez-les en CSV. Vue analogique ou numérique et mode concentration. Gratuit.'},
 },
 breathe: {
  de:{title:'Atemübungen online – Box Breathing & 4–7–8',heading:'Atemübungen online mit Breathe',description:'Kostenlose Atemhilfe mit Animation: Box Breathing, 4–7–8 und eigene Rhythmen. Dauer und Tempo anpassen, direkt im Browser ohne Anmeldung.'},
  en:{title:'Online breathing exercises – box breathing & 4–7–8',heading:'Online breathing exercises with Breathe',description:'A free animated breathing guide with box breathing, 4–7–8 and custom rhythms. Adjust duration and pace, directly in your browser with no sign-up.'},
  es:{title:'Ejercicios de respiración online – cuadrada y 4–7–8',heading:'Ejercicios de respiración online con Breathe',description:'Guía de respiración animada y gratuita: respiración cuadrada, 4–7–8 y ritmos propios. Ajusta la duración y el ritmo en tu navegador, sin registro.'},
  fr:{title:'Exercices de respiration en ligne – carrée et 4–7–8',heading:'Exercices de respiration en ligne avec Breathe',description:'Guide animé gratuit : respiration carrée, 4–7–8 et rythmes personnalisés. Réglez la durée et la cadence dans votre navigateur, sans inscription.'},
 },
 relax: {
  de:{title:'Naturgeräusche & Entspannungsklänge online',heading:'Naturgeräusche und sanfte Klänge mit Relax',description:'Mische Regen, Meeresrauschen und sanfte Instrumente zu deiner Klanglandschaft. Mit eigenen Lautstärken, Animationen und Schlafmodus. Kostenlos ohne Anmeldung.'},
  en:{title:'Nature sounds & relaxing soundscapes online',heading:'Nature sounds and gentle soundscapes with Relax',description:'Mix rain, ocean sounds and gentle instruments into your own soundscape. Adjust volumes, animations and sleep mode. Free in your browser, no sign-up.'},
  es:{title:'Sonidos de la naturaleza y relajación online',heading:'Sonidos de la naturaleza con Relax',description:'Combina lluvia, olas e instrumentos suaves en tu paisaje sonoro. Ajusta volúmenes, animaciones y modo de sueño. Gratis en tu navegador, sin registro.'},
  fr:{title:'Sons de la nature et ambiances relaxantes en ligne',heading:'Sons de la nature et ambiances douces avec Relax',description:'Mélangez pluie, vagues et instruments doux. Réglez les volumes, les animations et le mode sommeil pour votre ambiance sonore. Gratuit, sans inscription.'},
 },
};
