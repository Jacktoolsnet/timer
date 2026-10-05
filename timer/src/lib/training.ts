export const TRAINING_KEY = 'jacktools.timer.training.v1';
export const trainingDefaults = { preparation: 10, work: 60, rest: 20, rounds: 8, countdown: 3, halfway: true, sound: true, awake: true };
export type TrainingSettings = typeof trainingDefaults;
export function sanitizeTraining(input: unknown): TrainingSettings {
  const s = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const result = { ...trainingDefaults };
  for (const key of ['preparation','work','rest','rounds','countdown'] as const) {
    const min = key === 'work' || key === 'rounds' ? 1 : 0;
    const max = key === 'rounds' ? 100 : key === 'countdown' ? 10 : 3600;
    const n = s[key];
    if (typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max) result[key] = n;
  }
  for (const key of ['halfway','sound','awake'] as const) if (typeof s[key] === 'boolean') result[key] = s[key];
  return result;
}
export function trainingPhases(s: TrainingSettings) {
  const phases: { kind: 'preparation' | 'work' | 'rest'; seconds: number; round: number }[] = [];
  if (s.preparation) phases.push({ kind: 'preparation', seconds: s.preparation, round: 1 });
  for (let round = 1; round <= s.rounds; round++) {
    phases.push({ kind: 'work', seconds: s.work, round });
    if (round < s.rounds && s.rest) phases.push({ kind: 'rest', seconds: s.rest, round });
  }
  return phases;
}
export const trainingText = {
 de: { title:'Trainingstimer', intro:'Dein Rhythmus für Training und Erholung.', preparation:'Vorbereitung', work:'Training', rest:'Pause', rounds:'Runden', countdown:'Countdown-Signale · letzte Sekunden (0 = aus)', halfway:'Halbzeit-Signal beim Training', sound:'Signaltöne', awake:'Bildschirm wach halten', unavailable:'Bildschirm kann derzeit nicht wach gehalten werden. Lass die Seite sichtbar und prüfe die Geräteeinstellungen.', active:'Bildschirm bleibt während des Trainings wach.', total:'Gesamt verbleibend', done:'Training abgeschlossen!', hint:'Zeiten in Sekunden. Nach der letzten Runde entfällt die Pause. Signale können im Hintergrund oder bei gesperrtem Gerät ausbleiben.' },
 en: { title:'Training timer', intro:'Find your rhythm for exercise and recovery.', preparation:'Preparation', work:'Exercise', rest:'Rest', rounds:'Rounds', countdown:'Countdown alerts · last seconds (0 = off)', halfway:'Halfway alert during exercise', sound:'Sound alerts', awake:'Keep screen awake', unavailable:'Cannot keep the screen awake right now. Keep this page visible and check device settings.', active:'Screen stays awake during training.', total:'Total remaining', done:'Training complete!', hint:'Times in seconds. No rest after the final round. Alerts may not play in the background or with the device locked.' },
 es: { title:'Temporizador de entrenamiento', intro:'Tu ritmo para entrenar y descansar.', preparation:'Preparación', work:'Ejercicio', rest:'Descanso', rounds:'Rondas', countdown:'Señales finales · segundos (0 = desactivado)', halfway:'Señal a mitad del ejercicio', sound:'Señales sonoras', awake:'Mantener la pantalla encendida', unavailable:'No se puede mantener la pantalla encendida. Mantén visible esta página y revisa los ajustes del dispositivo.', active:'La pantalla permanece encendida durante el entrenamiento.', total:'Tiempo total restante', done:'¡Entrenamiento terminado!', hint:'Tiempos en segundos. Sin descanso después de la última ronda. Las señales pueden fallar en segundo plano o con el dispositivo bloqueado.' },
 fr: { title:'Minuteur d’entraînement', intro:'Votre rythme pour bouger et récupérer.', preparation:'Préparation', work:'Exercice', rest:'Repos', rounds:'Tours', countdown:'Signaux finaux · secondes (0 = désactivé)', halfway:'Signal à mi-parcours de l’exercice', sound:'Signaux sonores', awake:'Garder l’écran allumé', unavailable:'Impossible de garder l’écran allumé actuellement. Gardez cette page visible et vérifiez les réglages de votre appareil.', active:'L’écran reste allumé pendant l’entraînement.', total:'Temps total restant', done:'Entraînement terminé !', hint:'Durées en secondes. Aucun repos après le dernier tour. Les signaux peuvent manquer en arrière-plan ou lorsque l’appareil est verrouillé.' }
};
