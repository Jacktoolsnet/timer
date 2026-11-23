import content from './tool-guides.json' with { type: 'json' };
export const toolGuides = content;
export type ToolGuide = (typeof toolGuides)[number];
export const guideCards: Record<string, string> = {
 clock: 'online-uhr', stopwatch: 'online-stoppuhr', calculator: 'taschenrechner',
 breathe: 'atemuebungen', relax: 'naturgeraeusche', metronome: 'online-metronom', messagedrop: 'messagedrop',
};
export const guideImages: Record<string, {width:number; height:number; alt:string; caption:string}> = {
 clock:{width:1000,height:679,alt:'Analoge Jacktools Uhr mit Datumsanzeige und Zeitzone.',caption:'Die analoge Uhr in heller Darstellung. Andere Ansichten, Datum und Zeitzone wählst du im Tool.'},
 stopwatch:{width:1000,height:531,alt:'Stoppuhr vor dem Start mit Zeitanzeige und Steuerung für Messung und Runden.',caption:'Die Stoppuhr vor dem ersten Start. Runden erfasst du während einer laufenden Messung.'},
 calculator:{width:1120,height:959,alt:'Taschenrechner mit Eingabe, Rechentasten und bearbeitbarem Rechenstreifen mit einer Beispielrechnung.',caption:'Eingabe und Rechenstreifen gehören zusammen: Die Beispielwerte sind frei gewählt, keine reale Abrechnung.'},
 breathe:{width:1152,height:823,alt:'Breathe mit Atemkreis, Phasenanzeige, Sitzungssteuerung und Sicherheitshinweisen.',caption:'Der Atemkreis gibt Orientierung. Die Steuerung und Hinweise bleiben unterhalb der Anzeige erreichbar.'},
 relax:{width:1000,height:887,alt:'Relax vor der Wiedergabe mit Klangfläche, Starttaste, Sitzungsdauer und Sicherheitshinweisen.',caption:'Die Klangfläche vor dem Start. Die eigentliche Mischung aus Instrumenten und Naturgeräuschen stellst du im Tool ein.'},
 metronome:{width:1000,height:607,alt:'Metronom in der Orbit-Ansicht mit Tempo 90 BPM, Start und Tap Tempo.',caption:'Die Orbit-Ansicht bei 90 BPM. Tempo, Takt und Unterteilungen sind getrennte Einstellungen.'},
};
