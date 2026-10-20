// Spanish and French usage guidance. German/English originals remain in each tool.
export type UsageTool = 'timer'|'clock'|'stopwatch'|'breathe'|'relax'|'scenescript'|'lava';
export type UsageSection = {title:string;paragraphs:readonly string[]};
export const usageTranslations:Record<UsageTool,Record<'es'|'fr',readonly UsageSection[]>> = {
  "timer": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "Estas notas explican el uso del temporizador y sus límites técnicos. No excluyen de forma general la responsabilidad ni restringen tus derechos legales."
        ]
      },
      {
        "title": "Gratis y sin cuenta",
        "paragraphs": [
          "El temporizador es gratuito y no requiere una cuenta. Apoyarnos mediante Buy Me a Coffee es voluntario y no es necesario para usarlo."
        ]
      },
      {
        "title": "Tareas cotidianas, concentración y descansos",
        "paragraphs": [
          "La cuenta atrás, Pomodoro y los intervalos ayudan a organizar el día. No están destinados a usos médicos, emergencias ni mediciones críticas para la seguridad. Para ello utiliza dispositivos o sistemas adecuados y fiables."
        ]
      },
      {
        "title": "Modos y secuencia",
        "paragraphs": [
          "Para la cuenta atrás, elige una duración o minutos predefinidos. Pomodoro alterna concentración y descansos cortos o largos; al terminar una fase espera a que inicies la siguiente. Los intervalos pasan automáticamente por preparación opcional, actividad y descanso; no hay descanso después de la última ronda.",
          "Puedes pausar, reiniciar y pasar a la siguiente fase en Pomodoro e intervalos. Las duraciones editadas solo se aplican al pulsar «Aplicar ajustes», lo que reinicia el temporizador."
        ]
      },
      {
        "title": "Vistas digital, analógica y combinada",
        "paragraphs": [
          "Elige Digital, Analógica o Analógica + Digital. Las agujas muestran el tiempo restante, no la hora del día. La vista combinada añade la cuenta atrás bajo la esfera. Las vistas previas permiten elegir diseños estándar, romano, minimalista o ferroviario, redondos o cuadrados con esquinas redondeadas.",
          "Una vuelta de la aguja horaria siempre equivale a doce horas. Para cuentas largas, las cifras siguen el bloque restante de doce horas: con 32 horas se muestra 25–36; con 24 horas, 13–24; con doce horas, 1–12. Por debajo de una hora aparece una escala de minutos de 5 a 60 y se oculta la aguja horaria. En Pomodoro e intervalos las agujas corresponden a la fase actual. Los intervalos muestran el total restante bajo los botones."
        ]
      },
      {
        "title": "Visualización tranquila y movimiento",
        "paragraphs": [
          "Pomodoro muestra por defecto los minutos restantes redondeados hacia arriba, sin unidad. En el último minuto muestra solo los segundos restantes. «Mostrar siempre los segundos» mantiene el formato completo, como 25:00, también durante los descansos. Sin esta opción, la aguja de segundos permanece oculta hasta el último minuto.",
          "La aguja de segundos fluida está activada por defecto en avisos y comportamiento. Desactívala para pasos de un segundo. La preferencia del sistema de movimiento reducido impone esos pasos incluso si la opción está activa. Cambiar la visualización no reinicia el temporizador."
        ]
      },
      {
        "title": "Fondos, transparencia y concentración",
        "paragraphs": [
          "El selector incluye ilustraciones locales de cocina, escritorio, estudio, sala de entrenamiento y pausa para el té, con miniaturas. «Ninguno» elimina el fondo. Con un fondo seleccionado, la transparencia regula las superficies detrás del tiempo, la esfera y los controles: 0 % es opaco; 100 %, transparente. Los botones siguen siendo reconocibles. No se usan servicios externos de imágenes.",
          "La vista de concentración oculta ajustes y otras secciones e intenta abrir la pantalla completa. Los controles siguen disponibles junto al resumen de fases de Pomodoro o el total restante de intervalos. Los fondos y la transparencia también se aplican aquí. La pantalla completa depende del navegador y del dispositivo."
        ]
      },
      {
        "title": "Límites técnicos",
        "paragraphs": [
          "La suspensión, el ahorro energético y las restricciones de pestañas en segundo plano pueden retrasar o interrumpir la visualización y los avisos sonoros. Cerrar o recargar la pestaña termina el temporizador; no se reanuda automáticamente.",
          "Los avisos solo se oyen si están activados y el navegador y el dispositivo lo permiten. Comprueba el volumen y mantén la página abierta. No dependas únicamente de este temporizador para citas importantes.",
          "«Mantener la pantalla encendida» requiere soporte del navegador y del dispositivo. Se solicita durante una cuenta activa y visible y termina al pausar o completar. El ahorro energético o pasar a segundo plano pueden revocarlo. No evita el bloqueo manual. Los avisos de intervalos omitidos no se reproducen después en bloque."
        ]
      },
      {
        "title": "Preferencias locales",
        "paragraphs": [
          "Los ajustes del temporizador y de visualización solo se guardan de forma persistente si activas «Recordar ajustes en este dispositivo» y el navegador lo permite. No se sincronizan entre dispositivos. El modo privado o borrar datos del navegador puede eliminarlos. Puedes borrarlos en los ajustes locales."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "Ces notes expliquent l’utilisation et les limites techniques du minuteur. Elles n’excluent pas globalement la responsabilité et ne restreignent pas vos droits légaux."
        ]
      },
      {
        "title": "Gratuit, sans compte",
        "paragraphs": [
          "Le minuteur est gratuit et ne nécessite aucun compte. Le soutien via Buy Me a Coffee est facultatif et n’est pas une condition d’utilisation."
        ]
      },
      {
        "title": "Quotidien, concentration et pauses",
        "paragraphs": [
          "Le compte à rebours, Pomodoro et les intervalles aident à organiser vos activités. Ils ne sont pas destinés aux usages médicaux, aux urgences ou aux mesures critiques pour la sécurité. Utilisez alors des dispositifs ou systèmes adaptés et fiables."
        ]
      },
      {
        "title": "Modes et déroulement",
        "paragraphs": [
          "Pour un compte à rebours, choisissez une durée ou un nombre de minutes prédéfini. Pomodoro alterne concentration et pauses courtes ou longues ; chaque phase terminée attend votre prochain démarrage. Les intervalles enchaînent automatiquement préparation facultative, activité et repos, sans repos après le dernier tour.",
          "Vous pouvez mettre en pause, réinitialiser et passer à la phase suivante en Pomodoro ou en intervalles. Les durées modifiées ne s’appliquent qu’après validation des réglages, ce qui réinitialise le minuteur."
        ]
      },
      {
        "title": "Vues numérique, analogique et combinée",
        "paragraphs": [
          "Choisissez Numérique, Analogique ou Analogique + Numérique. Les aiguilles décomptent le temps restant, pas l’heure du jour. La vue combinée affiche aussi le temps sous le cadran. Les aperçus proposent les styles standard, romain, minimaliste ou ferroviaire, ronds ou carrés aux angles arrondis.",
          "Un tour de l’aiguille des heures représente toujours douze heures. Pour les longs décomptes, les chiffres suivent le bloc restant : à 32 heures, 25–36 ; à 24 heures, 13–24 ; à douze heures, 1–12. Sous une heure, le cadran affiche les minutes de 5 à 60 et masque l’aiguille des heures. En Pomodoro et intervalles, les aiguilles concernent la phase actuelle. Le total restant des intervalles figure sous les boutons."
        ]
      },
      {
        "title": "Affichage calme et aiguilles",
        "paragraphs": [
          "Par défaut, Pomodoro affiche uniquement les minutes restantes arrondies au supérieur, sans unité. Durant la dernière minute, seuls les secondes restantes sont affichées. « Toujours afficher les secondes » conserve le format complet, comme 25:00, y compris durant les pauses. Sans cette option, la trotteuse reste cachée jusqu’à la dernière minute.",
          "La trotteuse fluide est activée par défaut dans les signaux et comportements. Désactivez-la pour avancer par secondes. La préférence système de mouvement réduit impose ce mouvement par pas même si l’option est active. Modifier l’affichage ne redémarre pas le minuteur."
        ]
      },
      {
        "title": "Arrière-plans, transparence et concentration",
        "paragraphs": [
          "Le sélecteur propose des illustrations locales avec miniatures : cuisine, bureau, atelier, salle d’entraînement et pause thé. « Aucun » retire le fond. Avec un fond, la transparence règle les surfaces derrière l’heure, le cadran et les commandes : 0 % est opaque, 100 % transparent. Les boutons restent reconnaissables. Aucun service d’images externe n’est utilisé.",
          "La vue concentration masque les réglages et autres sections et tente d’ouvrir le plein écran. Les commandes restent disponibles, avec le résumé Pomodoro ou le total restant des intervalles. Fonds et transparence s’appliquent aussi ici. Le plein écran dépend du navigateur et de l’appareil."
        ]
      },
      {
        "title": "Limites techniques",
        "paragraphs": [
          "Veille, économie d’énergie et restrictions des onglets en arrière-plan peuvent retarder ou interrompre l’affichage et les signaux. Fermer ou recharger l’onglet termine le minuteur, sans reprise automatique.",
          "Les signaux ne sont audibles que s’ils sont activés et autorisés par le navigateur et l’appareil. Vérifiez le volume et gardez la page ouverte. Ne vous fiez pas uniquement à ce minuteur pour un rendez-vous important.",
          "Le maintien de l’écran éveillé exige un appareil et un navigateur compatibles. Il est demandé pendant un minuteur actif sur une page visible et s’arrête à la pause ou à la fin. Économie d’énergie et arrière-plan peuvent le révoquer. Il n’empêche pas le verrouillage manuel. Les signaux d’intervalles manqués ne sont pas rejoués en série."
        ]
      },
      {
        "title": "Préférences locales",
        "paragraphs": [
          "Les réglages ne sont conservés durablement que si vous activez leur mémorisation sur cet appareil et si le navigateur le permet. Ils ne sont pas synchronisés entre appareils. Le mode privé ou l’effacement des données peut les supprimer. Vous pouvez les effacer dans les réglages locaux."
        ]
      }
    ]
  },
  "stopwatch": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "Estas notas explican el uso y los límites técnicos del cronómetro, sin excluir de forma general la responsabilidad ni restringir derechos legales."
        ]
      },
      {
        "title": "Gratis y sin cuenta",
        "paragraphs": [
          "Usa el cronómetro gratis y sin cuenta. El apoyo mediante Buy Me a Coffee es voluntario."
        ]
      },
      {
        "title": "Medición cotidiana",
        "paragraphs": [
          "El cronómetro mide tiempo transcurrido y vueltas. No está destinado a medicina, emergencias, competiciones oficiales ni tareas críticas para la seguridad. Mostrar centésimas no garantiza esa precisión de medida."
        ]
      },
      {
        "title": "Límites técnicos",
        "paragraphs": [
          "La medición usa marcas de tiempo, no el número de actualizaciones de pantalla. Las pestañas en segundo plano pueden retrasar la visualización. Cambios de la hora del dispositivo, suspensión y restricciones del navegador pueden afectar la medida.",
          "Recargar, cambiar de idioma o salir de la página descarta la medición y las vueltas. No hay función de alarma.",
          "La vista de concentración funciona también sin pantalla completa. Pantalla completa y mantenimiento de pantalla encendida dependen del dispositivo y del navegador. El ahorro energético o el segundo plano pueden anular el mantenimiento; no impide bloquear manualmente el dispositivo. Mantener la pantalla encendida puede consumir más energía."
        ]
      },
      {
        "title": "Preferencias locales",
        "paragraphs": [
          "Los ajustes del cronómetro y de visualización solo se guardan si activas su memorización en este dispositivo y el navegador lo permite. No se sincronizan entre dispositivos. El modo privado o borrar datos puede eliminarlos. Puedes borrarlos en los ajustes locales."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "Ces notes expliquent l’utilisation et les limites techniques du chronomètre, sans exclusion globale de responsabilité ni restriction des droits légaux."
        ]
      },
      {
        "title": "Gratuit, sans compte",
        "paragraphs": [
          "Utilisez le chronomètre gratuitement et sans compte. Le soutien via Buy Me a Coffee est facultatif."
        ]
      },
      {
        "title": "Mesures du quotidien",
        "paragraphs": [
          "Le chronomètre mesure le temps écoulé et les tours. Il n’est pas destiné aux usages médicaux, aux urgences, aux compétitions officielles ou aux tâches critiques pour la sécurité. Afficher des centièmes ne garantit pas cette précision de mesure."
        ]
      },
      {
        "title": "Limites techniques",
        "paragraphs": [
          "La mesure repose sur des horodatages, pas sur le nombre d’actualisations de l’écran. Les onglets en arrière-plan peuvent retarder l’affichage. Changer l’heure de l’appareil, la veille et les restrictions du navigateur peuvent affecter la mesure.",
          "Recharger, changer de langue ou quitter la page efface la mesure et les tours. Il n’y a pas d’alarme.",
          "La vue concentration fonctionne même sans plein écran. Plein écran et maintien de l’écran éveillé dépendent de l’appareil et du navigateur. L’économie d’énergie ou l’arrière-plan peuvent révoquer ce maintien ; il n’empêche pas le verrouillage manuel. Garder l’écran allumé peut accroître la consommation d’énergie."
        ]
      },
      {
        "title": "Préférences locales",
        "paragraphs": [
          "Les réglages du chronomètre et de l’affichage ne sont conservés que si vous activez leur mémorisation sur cet appareil et si le navigateur le permet. Ils ne sont pas synchronisés entre appareils. Le mode privé ou l’effacement des données peut les supprimer. Vous pouvez les effacer dans les réglages locaux."
        ]
      }
    ]
  },
  "clock": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "Estas notas explican el uso y los límites de la hora online, sin excluir de forma general la responsabilidad ni restringir tus derechos legales."
        ]
      },
      {
        "title": "Gratis y para el día a día",
        "paragraphs": [
          "El reloj es gratuito y no requiere una cuenta. El apoyo mediante Buy Me a Coffee es voluntario. Muestra hora y fecha en distintas vistas para orientarte en la vida cotidiana; no está destinado a medicina, emergencias ni mediciones críticas para la seguridad. Usa sistemas adecuados y fiables para esos fines."
        ]
      },
      {
        "title": "Hora del dispositivo y zonas horarias",
        "paragraphs": [
          "El reloj usa la hora de tu dispositivo, no consulta un servicio externo ni es un reloj atómico sincronizado de forma independiente. Si hay errores, comprueba la fecha y la hora del dispositivo.",
          "Hora y fecha siguen la zona elegida; por defecto se usa la del dispositivo. El horario de verano y los formatos regionales dependen de los datos del navegador. Elegir otra zona cambia la visualización, no la hora del sistema.",
          "La suspensión, el ahorro energético y las restricciones de segundo plano pueden retrasar o interrumpir la visualización y las animaciones. Al volver o recargar se actualiza desde la hora actual del dispositivo. La alarma tiene las mismas limitaciones."
        ]
      },
      {
        "title": "Concentración y pantalla",
        "paragraphs": [
          "La vista de concentración funciona también sin pantalla completa. Pantalla completa y mantenimiento de pantalla encendida dependen del dispositivo y del navegador. El ahorro energético o pasar a segundo plano pueden revocar el mantenimiento. No impide el bloqueo manual y puede aumentar el consumo."
        ]
      },
      {
        "title": "Alarma del navegador",
        "paragraphs": [
          "La alarma suena una vez a la siguiente hora disponible en la zona elegida. Cambiar de zona vuelve a programar una alarma activa. Se omiten horas inexistentes del cambio de horario; si una hora se repite, se toma la siguiente aparición futura. Posponer retrasa cinco minutos reales, independientemente de la zona. Recargar desactiva la alarma y debes activarla de nuevo.",
          "Mantén la página abierta. Cerrar pestañas, suspensión, restricciones del navegador, silencio o ahorro energético pueden impedir o retrasar la alarma. No es un servicio del sistema operativo. No la uses como única alarma importante ni para seguridad. Si el retraso supera cinco minutos, se indica la alarma perdida en vez de sonar. Sonido y vibración se detienen como máximo tras dos minutos.",
          "Hay cinco tonos. Activar o probar prepara el audio elegido. Usa la prueba de tres segundos y comprueba el volumen del dispositivo; 0 % es silencio. La vibración es opcional y solo se puede seleccionar si existe la API del navegador, aunque falta de hardware, segundo plano, silencio o «No molestar» pueden impedirla. Sonido y vibración se generan localmente sin archivos de audio externos ni solicitudes de notificaciones."
        ]
      },
      {
        "title": "Fondos animados",
        "paragraphs": [
          "Los doce fondos predefinidos permiten animación, desactivada por defecto. Según el motivo se mueven nubes, niebla, olas, copas de árboles, luces, arena o colores, y brillan estrellas y ventanas. Noche estrellada y auroras incluyen meteoros ocasionales.",
          "La animación se pausa con la pestaña oculta y se sustituye por una imagen estática si el sistema pide movimiento reducido. No afecta a las agujas ni a los números de láminas y puede consumir más energía."
        ]
      },
      {
        "title": "Simulación anual y ubicación opcional",
        "paragraphs": [
          "Sin ubicación, la simulación usa la zona horaria elegida, un hemisferio manual y fases diarias simplificadas. El modo basado en ubicación pide permiso al navegador y obtiene una posición una sola vez. Requiere HTTPS, soporte y permiso. Si se rechaza, caduca o falla la posición, sigue la vista simplificada. Desactiva y vuelve a activar el modo para reintentar.",
          "Con ubicación se calculan localmente posiciones del Sol y la Luna y crepúsculo a partir de coordenadas y hora del dispositivo. La latitud determina el hemisferio. Hora y fecha siguen la zona elegida, que las coordenadas no cambian automáticamente.",
          "El modo de ubicación y las coordenadas no se guardan permanentemente. No se detectan desplazamientos automáticamente; selecciona hemisferio norte o sur y luego de nuevo ubicación para obtener otra posición.",
          "La escena es una ilustración, no una previsión meteorológica, una herramienta astronómica de precisión ni de navegación. La Luna y el paisaje son simplificados. No se consideran tiempo real, terreno, altitud ni clima local. Los colores siguen un ciclo templado simplificado, incluso en regiones tropicales o polares. Puede haber día o noche continuos en regiones polares. Una hora o posición incorrecta afecta a la escena. Con movimiento reducido, los cuerpos celestes permanecen quietos dentro de cada hora."
        ]
      },
      {
        "title": "Preferencias locales",
        "paragraphs": [
          "Los ajustes de reloj y visualización solo se guardan si activas su memorización en este dispositivo y el navegador lo permite. No se sincronizan. Borrar datos o usar modo privado puede eliminarlos. Puedes borrarlos en los ajustes locales."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "Ces notes expliquent l’utilisation et les limites de l’horloge, sans exclusion globale de responsabilité ni restriction de vos droits légaux."
        ]
      },
      {
        "title": "Gratuit, pour le quotidien",
        "paragraphs": [
          "L’horloge est gratuite et sans compte. Le soutien via Buy Me a Coffee est facultatif. Elle affiche heure et date dans plusieurs vues pour le quotidien, pas pour la médecine, les urgences ou les mesures critiques pour la sécurité. Utilisez alors des systèmes adaptés et fiables."
        ]
      },
      {
        "title": "Heure de l’appareil et fuseaux horaires",
        "paragraphs": [
          "L’horloge utilise l’heure de votre appareil. Elle ne consulte aucun service externe et n’est pas une horloge atomique synchronisée indépendamment. En cas d’écart, vérifiez la date et l’heure de l’appareil.",
          "Heure et date suivent le fuseau choisi, celui de l’appareil par défaut. Heure d’été et formats régionaux dépendent des données du navigateur. Changer de fuseau modifie l’affichage, pas l’heure système.",
          "Veille, économie d’énergie et restrictions d’arrière-plan peuvent retarder ou interrompre affichage et animations. Au retour ou au rechargement, l’heure de l’appareil actualise l’affichage. L’alarme subit les mêmes limites."
        ]
      },
      {
        "title": "Concentration et écran",
        "paragraphs": [
          "La vue concentration fonctionne aussi sans plein écran. Plein écran et maintien de l’écran éveillé dépendent de l’appareil et du navigateur. Économie d’énergie et arrière-plan peuvent révoquer le maintien. Il n’empêche pas le verrouillage manuel et peut augmenter la consommation."
        ]
      },
      {
        "title": "Réveil du navigateur",
        "paragraphs": [
          "Le réveil sonne une fois à la prochaine heure disponible dans le fuseau choisi. Changer de fuseau reprogramme un réveil actif. Les heures inexistantes du changement d’heure sont ignorées ; pour une heure répétée, la prochaine occurrence future est utilisée. Le rappel reporte de cinq minutes écoulées, quel que soit le fuseau. Recharger désactive le réveil : réactivez-le explicitement.",
          "Gardez la page ouverte. Fermer l’onglet, veille, restrictions du navigateur, mode silencieux ou économie d’énergie peuvent empêcher ou retarder le réveil. Ce n’est pas un service d’arrière-plan du système. Ne l’utilisez pas comme seul réveil important ni pour la sécurité. Après plus de cinq minutes de retard, l’application signale un réveil manqué au lieu de sonner. Son et vibration s’arrêtent après deux minutes au maximum.",
          "Cinq sonneries sont proposées. Activer ou tester prépare le son choisi. Utilisez le test de trois secondes et vérifiez le volume ; 0 % coupe le son. La vibration est facultative et sélectionnable uniquement si l’API existe. Matériel absent, arrière-plan, silence ou « Ne pas déranger » peuvent toutefois l’empêcher. Son et vibration sont générés localement, sans fichiers externes ni demande de notifications."
        ]
      },
      {
        "title": "Fonds animés",
        "paragraphs": [
          "Les douze fonds prédéfinis peuvent être animés ; l’option est désactivée par défaut. Selon le motif, nuages, brume, vagues, arbres, bandes lumineuses, sable ou couleurs bougent ; étoiles et fenêtres brillent doucement. Nuit étoilée et aurores comportent parfois des météores.",
          "L’animation se met en pause dans un onglet masqué ; le mouvement réduit du système utilise une image fixe. Elle ne modifie ni aiguilles ni chiffres à palettes et peut consommer davantage d’énergie."
        ]
      },
      {
        "title": "Simulation annuelle et position facultative",
        "paragraphs": [
          "Sans position, la simulation utilise le fuseau choisi, un hémisphère manuel et des phases journalières simplifiées. Le mode géolocalisé demande une autorisation et obtient une position une fois. HTTPS, compatibilité et permission sont nécessaires. Refus, délai dépassé ou absence de position conservent la vue simplifiée. Désactivez puis réactivez le mode pour réessayer.",
          "Avec la position, Soleil, Lune et crépuscule sont calculés localement depuis les coordonnées et l’heure de l’appareil. La latitude détermine l’hémisphère. Heure et date restent dans le fuseau choisi, qui n’est pas automatiquement modifié par les coordonnées.",
          "Mode de localisation et coordonnées ne sont pas conservés durablement. Un déplacement n’est pas détecté automatiquement : choisissez l’hémisphère nord ou sud, puis à nouveau la position pour la recalculer.",
          "La scène est une illustration, pas une prévision météo, un affichage astronomique précis ou une aide à la navigation. Lune et paysage sont simplifiés. Météo réelle, terrain, altitude et climat local ne sont pas pris en compte. Les couleurs suivent un cycle tempéré simplifié même sous les tropiques ou aux pôles. Jour ou nuit continus sont possibles aux pôles. Heure ou coordonnées erronées affectent la vue. Avec le mouvement réduit, les astres restent immobiles durant chaque heure."
        ]
      },
      {
        "title": "Préférences locales",
        "paragraphs": [
          "Les réglages d’horloge et d’affichage sont conservés seulement avec votre accord et si le navigateur le permet. Aucune synchronisation entre appareils. Mode privé et effacement des données peuvent les supprimer. Vous pouvez les effacer dans les réglages locaux."
        ]
      }
    ]
  },
  "breathe": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "Breathe es una herramienta gratuita para pausas tranquilas y concentración, sin cuenta. El apoyo mediante Buy Me a Coffee es voluntario. Estas notas no eximen de responsabilidad ni restringen derechos legales.",
          "Los patrones son guías generales, no recomendaciones personalizadas. No diagnostica, promete beneficios médicos ni sustituye consejo o tratamiento. No sirve para emergencias ni para vigilar tu respiración."
        ]
      },
      {
        "title": "Aviso de seguridad y ayuda",
        "paragraphs": [
          "Antes del primer inicio aparece un aviso breve. «Continuar» inicia la sesión; no hay casilla obligatoria. También puedes cerrar sin iniciar. Las indicaciones detalladas siguen disponibles bajo la simulación, incluso en concentración.",
          "Abrir las indicaciones de seguridad pausa la sesión; cerrarlas no la reanuda automáticamente. Si te encuentras mal, usa «Terminar» sin esperar al final de una fase. Volver a respirar normalmente no sustituye ayuda médica cuando sea necesaria."
        ]
      },
      {
        "title": "Patrones y unidades de cuenta",
        "paragraphs": [
          "Puedes elegir respiración cuadrada, equilibrada, suave, 4–7–8 o un ritmo propio. Las descripciones de la selección explican las fases; adapta el ritmo a tu comodidad.",
          "Por defecto, una unidad equivale a un segundo; puedes ajustarla de 0,5 a 3 segundos. Cuatro unidades de 1,5 segundos hacen una fase de seis segundos. Por tanto, 4–7–8 no exige una secuencia fija de segundos.",
          "Inspiración y espiración admiten 1–20 unidades; retenciones, 0–20. Cero omite la retención. Editar una fase selecciona el ritmo propio. Cambiar unidades, ritmo, patrón o duración reinicia la sesión. Los rangos son límites técnicos, no recomendaciones para agotar fases largas."
        ]
      },
      {
        "title": "Control de la sesión",
        "paragraphs": [
          "Elige patrón, ritmo y duración cómoda en minutos. Cero significa sin límite. Iniciar comienza tras el aviso de seguridad, cuando se muestra.",
          "Pausa congela la posición y detiene el audio. Reanudar requiere una acción explícita. El símbolo de parada termina inmediatamente, sin confirmación: se detienen animación, cuenta y sonidos y aparece el recordatorio de respirar al ritmo habitual.",
          "Omitir retención solo aparece durante una retención activa y pasa a la siguiente fase con visualización, animación y audio sincronizados. Reiniciar está disponible fuera de una sesión en marcha y vuelve al principio.",
          "Una sesión limitada termina al agotarse el tiempo, incluso a mitad de una fase. No tienes que completar la respiración según el contador: vuelve a tu ritmo habitual. Sin límite, terminas tú."
        ]
      },
      {
        "title": "Simulación y visualización",
        "paragraphs": [
          "El círculo crece al inspirar, se mantiene durante la retención y se contrae al espirar. La tarjeta muestra fase y unidades restantes con texto; el color es una ayuda adicional, no la única señal. El anillo exterior muestra progreso solo en sesiones limitadas.",
          "Puedes desactivar el movimiento. Al cargar se respeta el movimiento reducido del dispositivo. Contador, visualización y número de respiración orientan; no miden tu respiración real."
        ]
      },
      {
        "title": "Sonidos y señales",
        "paragraphs": [
          "Los sonidos respiratorios y las señales de fase están activados por defecto y pueden desactivarse por separado. Con consentimiento de almacenamiento se restauran las preferencias. El ruido crece al inspirar y baja al espirar. Una señal marca cada cambio. Al terminar normalmente suena un cierre suave si las señales están activas; terminar manualmente no lo reproduce.",
          "El volumen se ajusta en el dispositivo. Activar una opción puede reproducir una muestra breve. Los sonidos se generan localmente sin micrófono ni cámara. Pestañas silenciadas, volumen del sistema, salida y restricciones pueden impedir audio; la guía visual sigue disponible."
        ]
      },
      {
        "title": "Concentración, pantalla completa y pantalla encendida",
        "paragraphs": [
          "La vista de concentración oculta distracciones e intenta abrir pantalla completa. Si no se admite o se rechaza, sigue disponible la vista reducida en la página. El botón permite salir; se reconoce también salir mediante el navegador. Terminar y seguridad siguen accesibles.",
          "Mantener la pantalla encendida solicita un bloqueo de suspensión durante una sesión activa y visible. Requiere soporte; el ahorro energético o el segundo plano pueden revocarlo. No impide bloquear el dispositivo manualmente. Pausar o terminar libera la solicitud."
        ]
      },
      {
        "title": "Segundo plano y límites técnicos",
        "paragraphs": [
          "Cambiar de pestaña u ocultar la página pausa la sesión y detiene el audio. Volver no reanuda automáticamente: pulsa Reanudar. No se acumulan señales omitidas. Recargar o cerrar termina la sesión y no restaura un estado activo.",
          "Suspensión, bloqueo, ahorro energético, carga del navegador y otras restricciones pueden retrasar o interrumpir visualización y audio. Pausa de fondo, pantalla completa y bloqueo de suspensión no sustituyen funciones fiables del dispositivo. No dependas de Breathe para vigilancia médica, emergencias o tiempos críticos para la seguridad."
        ]
      },
      {
        "title": "Preferencias y privacidad",
        "paragraphs": [
          "Sin consentimiento, ajustes y estado del aviso inicial solo viven en la memoria de la página. Activar «Recordar ajustes en este dispositivo» guarda localmente patrón, unidades, ritmo, duración, audio, movimiento del círculo, pantalla encendida, estado del aviso y visualización. No guarda la sesión activa.",
          "Desactivar el almacenamiento o borrar ajustes locales elimina los valores guardados. No hay sincronización. Modo privado, almacenamiento bloqueado o datos borrados pueden impedir restaurarlos. No hay cuenta ni servidor propio de la aplicación; no enviamos los ajustes respiratorios. Los datos técnicos de acceso del alojamiento son distintos."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "Breathe est un outil gratuit pour les pauses calmes et la concentration, sans compte. Le soutien via Buy Me a Coffee est facultatif. Ces notes n’écartent pas la responsabilité et ne restreignent pas les droits légaux.",
          "Les rythmes sont des repères généraux, pas des recommandations personnalisées. Breathe ne diagnostique rien, ne promet aucun bénéfice médical et ne remplace ni avis ni traitement. Il ne sert ni aux urgences ni à surveiller la respiration."
        ]
      },
      {
        "title": "Avis de sécurité et aide",
        "paragraphs": [
          "Un court avis précède le premier démarrage. « Continuer » lance la séance ; aucune case obligatoire. Vous pouvez fermer sans commencer. Les consignes détaillées restent accessibles sous la simulation, même en concentration.",
          "Ouvrir les consignes met la séance en pause ; les fermer ne relance pas automatiquement. En cas de malaise, utilisez Terminer sans attendre la fin d’une phase. Reprendre sa respiration normale ne remplace pas une aide médicale nécessaire."
        ]
      },
      {
        "title": "Rythmes et unités de comptage",
        "paragraphs": [
          "Choisissez respiration carrée, équilibrée, douce, 4–7–8 ou rythme personnel. Les descriptions du sélecteur expliquent les phases ; adaptez le rythme à votre confort.",
          "Par défaut, une unité dure une seconde ; elle peut durer de 0,5 à 3 secondes. Quatre unités de 1,5 seconde donnent une phase de six secondes. Le rythme 4–7–8 n’impose donc pas une suite de secondes.",
          "Inspiration et expiration acceptent 1–20 unités, les retenues 0–20. Zéro supprime la retenue. Modifier une phase sélectionne le rythme personnel. Changer unités, cadence, rythme ou durée réinitialise la séance. Ces plages sont des limites techniques, pas une recommandation de prolonger les phases."
        ]
      },
      {
        "title": "Commandes de séance",
        "paragraphs": [
          "Choisissez rythme, cadence et durée confortable en minutes. Zéro signifie sans limite. Démarrer lance le guide après l’avis éventuel.",
          "Pause fige la position et arrête l’audio. Reprendre exige votre action. Le symbole d’arrêt termine immédiatement sans confirmation : animation, décompte et sons s’arrêtent, puis un rappel invite à retrouver le rythme habituel.",
          "Passer la retenue n’apparaît que pendant une retenue active et passe directement à la phase suivante, avec affichage, animation et son synchronisés. Réinitialiser est disponible lorsque la séance ne tourne pas et revient au début.",
          "Une séance limitée se termine à l’échéance, même au milieu d’une phase. Vous n’avez pas à finir la respiration selon le décompte : retrouvez votre rythme normal. Sans limite, vous terminez vous-même."
        ]
      },
      {
        "title": "Simulation et affichage",
        "paragraphs": [
          "Le cercle grandit à l’inspiration, reste fixe pendant la retenue et rétrécit à l’expiration. La carte indique la phase et les unités restantes par du texte ; la couleur est un repère supplémentaire. L’anneau extérieur indique la progression des séances limitées seulement.",
          "Le mouvement peut être désactivé. Le mouvement réduit demandé par l’appareil est respecté au chargement. Affichage, décompte et numéro de respiration sont des repères, pas une mesure de votre respiration."
        ]
      },
      {
        "title": "Sons et signaux",
        "paragraphs": [
          "Bruits respiratoires et signaux de phase sont activés par défaut, désactivables séparément. Les préférences sont restaurées avec accord de stockage. Le bruit augmente à l’inspiration et diminue à l’expiration. Un signal marque les changements. Un son doux clôt la fin normale si les signaux sont actifs ; l’arrêt manuel ne le joue pas.",
          "Réglez le volume sur l’appareil. Activer une option peut jouer un bref aperçu. Les sons sont produits localement, sans micro ni caméra. Onglet muet, volume système, sortie et restrictions peuvent empêcher le son ; le guide visuel reste utilisable."
        ]
      },
      {
        "title": "Concentration, plein écran et écran éveillé",
        "paragraphs": [
          "La vue concentration masque les distractions et tente le plein écran. En cas de refus ou d’incompatibilité, la vue réduite dans la page reste utilisable. Le bouton permet de sortir ; la sortie par le navigateur est reconnue aussi. Arrêt et consignes restent accessibles.",
          "Le maintien de l’écran éveillé demande un verrou de veille pendant une séance active et visible. Il dépend de la compatibilité ; économie d’énergie ou arrière-plan peuvent le révoquer. Il n’empêche pas le verrouillage manuel. Pause et arrêt libèrent la demande."
        ]
      },
      {
        "title": "Arrière-plan et limites techniques",
        "paragraphs": [
          "Changer d’onglet ou masquer la page met en pause et arrête l’audio. Le retour ne relance pas automatiquement : utilisez Reprendre. Les signaux manqués ne sont pas rejoués en série. Recharger ou fermer termine la séance, sans restauration d’un état actif.",
          "Veille, verrouillage, économie d’énergie, charge du navigateur et autres restrictions peuvent retarder ou interrompre affichage et audio. Pause automatique, plein écran et maintien éveillé ne remplacent pas des fonctions fiables de l’appareil. Ne comptez pas sur Breathe pour la surveillance médicale, les urgences ou des délais critiques pour la sécurité."
        ]
      },
      {
        "title": "Préférences et confidentialité",
        "paragraphs": [
          "Sans accord, réglages et état de l’avis initial restent en mémoire sur la page actuelle. La mémorisation sur cet appareil conserve localement rythme, unités, cadence, durée, audio, mouvement du cercle, écran éveillé, état de l’avis et affichage. La séance active n’est pas enregistrée.",
          "Désactiver le stockage ou effacer les réglages locaux supprime les valeurs. Aucune synchronisation entre appareils. Mode privé, stockage bloqué ou données effacées peuvent empêcher la restauration. Aucun compte ni serveur applicatif propre ; les réglages respiratoires ne nous sont pas envoyés. Les données techniques de l’hébergement sont distinctes."
        ]
      }
    ]
  },
  "relax": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "Relax permite crear un ambiente sonoro para pausas tranquilas o acompañamiento suave, combinando notas aleatorias, sonidos de fondo y animaciones opcionales. No hay un ejercicio ni una meta que alcanzar."
        ]
      },
      {
        "title": "Elegir y mezclar",
        "paragraphs": [
          "Elige campanas de viento, cuencos, kalimba, handpan, campanas, gong o arpa. El interruptor de instrumentos es independiente de los fondos.",
          "Los preajustes dan un punto de partida editable; conservan duración, dirección de olas y preferencias generales. Solo naturaleza, Junto al fuego y Junto al mar no usan instrumentos.",
          "Activa y combina lluvia, viento, ruido, fogata y oleaje por separado. Cada fondo tiene volumen propio. Ajusta además el volumen del dispositivo."
        ]
      },
      {
        "title": "Ajustar el sonido",
        "paragraphs": [
          "La densidad controla la frecuencia de nuevas notas; el tono las sube o baja. La secuencia es aleatoria y puede repetirse.",
          "Densidad de gotas, actividad del viento, crepitación e intensidad de olas modifican sus fondos. Si viento y campanas de viento están activos, las nuevas notas siguen las ráfagas. Los demás instrumentos son independientes.",
          "El ruido blanco, rosa o marrón son colores sonoros, no frecuencias curativas. No se promete un efecto concreto sobre sueño o concentración. Selección, volúmenes y controles se pueden cambiar durante la reproducción."
        ]
      },
      {
        "title": "Animaciones",
        "paragraphs": [
          "Instrumentos, lluvia, viento, humo y olas tienen interruptores separados. Puedes escuchar sin animación. La animación suave activa o desactiva el movimiento global.",
          "Las notas crean formas de colores; la lluvia muestra gotas y el viento un círculo que crece y se contrae. Llamas suaves parpadean abajo y el humo asciende desde ellas con oscilación lateral. Fuego y humo comparten interruptor.",
          "El oleaje puede llegar desde abajo, arriba, izquierda o derecha. Cada ola tiene una cresta suave en una posición aleatoria y puede solaparse con la anterior al retirarse. El movimiento sigue el sonido.",
          "Los colores siguen la paleta elegida. Con preferencia de movimiento reducido, el movimiento empieza desactivado."
        ]
      },
      {
        "title": "Iniciar, pausar y terminar",
        "paragraphs": [
          "Configura minutos; cero significa sin límite. Una duración editada afecta a la próxima sesión, no a la actual.",
          "El símbolo de reproducción inicia; la primera vez aparece seguridad. Nunca se inicia automáticamente. Pausa detiene sonido y animación conservando el tiempo restante; reproducción reanuda.",
          "Parar termina sin confirmación con un breve desvanecimiento. Una sesión limitada se atenúa suavemente en los últimos segundos."
        ]
      },
      {
        "title": "Modo de sueño",
        "paragraphs": [
          "El modo de sueño baja progresivamente el volumen durante los últimos cinco minutos. Si dura menos de diez minutos, empieza a mitad de sesión. Sin límite no hay atenuación programada.",
          "Durante la reproducción puedes oscurecer la pantalla. Toca la vista oscura o pulsa Escape para volver. El mantenimiento de pantalla encendida está desactivado en este modo, que no evita interrupciones por navegador, bloqueo o ahorro energético."
        ]
      },
      {
        "title": "Concentración y pantalla",
        "paragraphs": [
          "La vista de concentración da espacio a la animación e intenta pantalla completa. Usa el botón para salir. El puntero desaparece tras inactividad; movimiento, clic o teclado lo muestran.",
          "Fuera del modo de sueño puedes intentar mantener la pantalla encendida durante la reproducción. Pantalla completa y bloqueo de suspensión no están disponibles en todos los dispositivos."
        ]
      },
      {
        "title": "Segundo plano y límites",
        "paragraphs": [
          "Permitir audio en segundo plano deja que continúe al cambiar de pestaña o aplicación. Sin la opción se pausa al ocultar la pestaña. La animación siempre se detiene en segundo plano.",
          "No garantiza continuidad: navegador, sistema, bloqueo y ahorro energético pueden parar el audio. Relax no es una alarma fiable.",
          "Recargar o cerrar termina la sesión sin restaurarla. Los sonidos se generan en el navegador, no son grabaciones y no se usa el micrófono."
        ]
      },
      {
        "title": "Almacenamiento y privacidad",
        "paragraphs": [
          "Los ajustes solo persisten con tu consentimiento explícito. Puedes desactivar o borrar el almacenamiento local. Sin consentimiento se mantienen solo en la página actual. No se guarda una sesión en marcha. No hay cuenta ni sincronización entre dispositivos; el alojamiento puede procesar datos técnicos de acceso."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "Relax crée une ambiance sonore pour les pauses ou un accompagnement discret : notes aléatoires, fonds sonores et animations facultatives. Aucun exercice ni objectif à atteindre."
        ]
      },
      {
        "title": "Choisir et mélanger",
        "paragraphs": [
          "Choisissez carillon, bols chantants, kalimba, handpan, cloches, gong ou harpe. Les instruments se désactivent indépendamment des fonds.",
          "Les ambiances prédéfinies sont modifiables ; durée, direction des vagues et préférences générales restent inchangées. Nature seule, Au coin du feu et Au bord de la mer n’utilisent pas d’instruments.",
          "Activez et combinez pluie, vent, bruit, feu et vagues séparément. Chaque fond possède son volume. Réglez aussi le volume global de l’appareil."
        ]
      },
      {
        "title": "Régler le son",
        "paragraphs": [
          "La densité règle la fréquence des notes et la hauteur les déplace vers le grave ou l’aigu. La séquence est aléatoire et peut se répéter.",
          "Densité des gouttes, activité du vent, crépitement et intensité des vagues modifient leurs fonds. Si vent et carillon sont actifs, les nouvelles notes suivent les rafales. Les autres instruments restent indépendants.",
          "Bruit blanc, rose ou brun sont des couleurs sonores, pas des fréquences thérapeutiques. Aucun effet particulier sur le sommeil ou la concentration n’est promis. Choix, volumes et réglages restent modifiables pendant la lecture."
        ]
      },
      {
        "title": "Animations",
        "paragraphs": [
          "Instruments, pluie, vent, fumée et vagues ont leurs propres interrupteurs. Vous pouvez écouter sans animation. L’animation douce active ou coupe globalement le mouvement.",
          "Les notes créent des formes colorées, la pluie des gouttes et le vent un cercle qui grandit et rétrécit. De petites flammes vacillent en bas ; la fumée monte depuis elles en oscillant. Feu et fumée partagent un interrupteur.",
          "Les vagues peuvent venir du bas, du haut, de gauche ou de droite. Chaque vague a une crête douce à une position aléatoire ; la suivante peut arriver pendant son retrait. Le mouvement suit le son.",
          "Les couleurs suivent la palette. Si le mouvement réduit est demandé, le mouvement est désactivé initialement."
        ]
      },
      {
        "title": "Démarrer, mettre en pause et terminer",
        "paragraphs": [
          "Réglez les minutes ; zéro signifie sans limite. Une durée modifiée concerne la prochaine séance, pas l’actuelle.",
          "Le symbole de lecture démarre ; un avis de sécurité apparaît au premier départ. Aucun démarrage automatique. Pause arrête son et animation en conservant le temps restant ; lecture reprend.",
          "Arrêt termine sans confirmation avec un bref fondu. Une séance limitée s’atténue doucement durant ses dernières secondes."
        ]
      },
      {
        "title": "Mode sommeil",
        "paragraphs": [
          "Le mode sommeil diminue progressivement le volume pendant les cinq dernières minutes. Pour moins de dix minutes, le fondu commence à mi-parcours. Une séance illimitée n’a pas de fondu programmé.",
          "Pendant la lecture, vous pouvez assombrir l’écran. Touchez l’écran sombre ou appuyez sur Échap pour revenir. Le maintien éveillé est désactivé dans ce mode, qui n’empêche pas les interruptions dues au navigateur, au verrouillage ou à l’économie d’énergie."
        ]
      },
      {
        "title": "Concentration et écran",
        "paragraphs": [
          "La vue concentration donne de l’espace à l’animation et tente le plein écran. Le bouton permet de sortir. Le pointeur disparaît après inactivité ; mouvement, clic ou clavier le révèlent.",
          "Hors mode sommeil, le maintien éveillé tente d’empêcher l’extinction pendant la lecture. Plein écran et verrou de veille ne sont pas disponibles partout."
        ]
      },
      {
        "title": "Arrière-plan et limites",
        "paragraphs": [
          "Autoriser l’audio en arrière-plan permet de continuer en changeant d’onglet ou d’application. Sinon, masquer l’onglet met en pause. L’animation s’arrête toujours en arrière-plan.",
          "La continuité n’est pas garantie : navigateur, système, verrouillage et économie d’énergie peuvent arrêter le son. Relax n’est pas un réveil fiable.",
          "Recharger ou fermer termine la séance sans restauration. Les sons sont générés dans le navigateur, pas enregistrés, et aucun micro n’est utilisé."
        ]
      },
      {
        "title": "Stockage et confidentialité",
        "paragraphs": [
          "Les réglages ne persistent qu’avec votre accord explicite. Vous pouvez désactiver ou effacer le stockage local. Sans accord, ils restent seulement sur la page actuelle. Une séance en cours n’est pas enregistrée. Aucun compte ni synchronisation entre appareils ; l’hébergement peut traiter des données techniques d’accès."
        ]
      }
    ]
  },
  "scenescript": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "SceneScript crea escenas animadas para exportación de vídeo y grabaciones de pantalla. MP4/WebM se exportan localmente en el navegador; no es un grabador de pantalla."
        ]
      },
      {
        "title": "Crear y guardar proyectos",
        "paragraphs": [
          "Importa un borrador de IA como JSON o edita escenas, textos, imágenes y formas en el editor. «Guardar como» descarga un archivo .scenescript.json completo con imágenes integradas. «Cargar» vuelve a abrirlo. Sin almacenamiento local opcional, cerrar o recargar pierde los cambios no guardados."
        ]
      },
      {
        "title": "Imágenes y límites",
        "paragraphs": [
          "Admite PNG, JPEG y WebP de hasta 8 MiB por imagen rasterizada y 40 megapíxeles, además de SVG con perfil de seguridad restringido de hasta 1 MiB.",
          "Los proyectos tienen límites de 160 MiB de JSON, 100 imágenes, 100 escenas y 100 elementos por escena. No se importan URL externas de imágenes, HTML arbitrario ni código ejecutable. Usa solo contenido para el que tengas los derechos necesarios."
        ]
      },
      {
        "title": "Exportar vídeos largos",
        "paragraphs": [
          "Cuando esté disponible, elige «Directamente a archivo». Seleccionas el destino antes de renderizar; se escribe por partes en disco. Como alternativa, la descarga se prepara en un archivo temporal del navegador.",
          "Necesitas espacio libre en disco y navegador; el tamaño es una estimación. Borra los archivos temporales desde el diálogo de exportación solo cuando la descarga haya terminado. Mantén la pestaña abierta. Una exportación interrumpida no se puede reanudar: guarda además el proyecto editable como JSON."
        ]
      },
      {
        "title": "Grabación",
        "paragraphs": [
          "Abre tu grabador de pantalla independiente y la vista de grabación. Tras tres segundos se inicia automáticamente todo el proyecto. Espacio pausa o reanuda; Escape sale. Los controles no quedan permanentemente visibles.",
          "La pantalla determina la resolución real de grabación. Las áreas seguras de texto son solo orientativas. Las fuentes pueden sustituirse por fuentes locales según el dispositivo.",
          "Prueba antes de grabar. Pestañas en segundo plano, suspensión o hardware lento pueden afectar a las animaciones. Los movimientos rápidos pueden resultar incómodos: usa la opción sin animación si conviene."
        ]
      },
      {
        "title": "Guía de formato",
        "paragraphs": [
          "La guía de IA explica el formato JSON y está disponible desde el enlace de esta página. Es una guía para tu herramienta de IA, no una solicitud de IA integrada."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "SceneScript crée des scènes animées pour exporter des vidéos et réaliser des captures d’écran vidéo. L’export MP4/WebM se fait localement dans le navigateur ; l’outil n’enregistre pas lui-même l’écran."
        ]
      },
      {
        "title": "Créer et sauvegarder",
        "paragraphs": [
          "Importez un brouillon IA en JSON ou modifiez scènes, textes, images et formes dans l’éditeur. « Enregistrer sous » télécharge un fichier .scenescript.json complet avec images intégrées. « Charger » le rouvre. Sans stockage local facultatif, fermer ou recharger perd les modifications non sauvegardées."
        ]
      },
      {
        "title": "Images et limites",
        "paragraphs": [
          "PNG, JPEG et WebP sont acceptés jusqu’à 8 MiB par image matricielle et 40 mégapixels, ainsi que SVG dans un profil de sécurité restreint jusqu’à 1 MiB.",
          "Les projets sont limités à 160 MiB de JSON, 100 images, 100 scènes et 100 éléments par scène. URL d’images externes, HTML arbitraire et code exécutable ne sont pas importés. N’utilisez que des contenus dont vous détenez les droits nécessaires."
        ]
      },
      {
        "title": "Exporter de longues vidéos",
        "paragraphs": [
          "Lorsque possible, choisissez l’écriture directe dans un fichier. Sélectionnez la destination avant le rendu ; la sortie est écrite par morceaux sur le disque. Sinon, le téléchargement utilise un fichier temporaire du navigateur.",
          "De l’espace disque et navigateur est nécessaire ; la taille est une estimation. Supprimez les exports temporaires dans le dialogue seulement après la fin du téléchargement. Gardez l’onglet ouvert. Un export interrompu ne peut pas reprendre : sauvegardez aussi le projet modifiable en JSON."
        ]
      },
      {
        "title": "Enregistrement",
        "paragraphs": [
          "Lancez votre enregistreur d’écran séparé et ouvrez la vue d’enregistrement. Après trois secondes, tout le projet démarre automatiquement. Espace met en pause ou reprend, Échap quitte. Les commandes ne restent pas visibles en permanence.",
          "L’écran détermine la résolution réelle. Les zones sûres de texte sont indicatives. Les polices peuvent être remplacées par des polices locales selon l’appareil.",
          "Testez avant d’enregistrer. Arrière-plan, veille et matériel lent peuvent affecter les animations. Les mouvements rapides peuvent gêner : choisissez sans animation si nécessaire."
        ]
      },
      {
        "title": "Guide de format",
        "paragraphs": [
          "Le guide IA décrit le format JSON et est accessible depuis cette page. C’est un guide pour votre outil IA, pas une requête IA intégrée."
        ]
      }
    ]
  },
  "lava": {
    "es": [
      {
        "title": "Uso y límites",
        "paragraphs": [
          "Lava es una animación decorativa para una pausa tranquila, con sonidos de burbujas opcionales. No es un servicio médico ni terapéutico ni reproduce física exacta de fluidos."
        ]
      },
      {
        "title": "Iniciar y pausar",
        "paragraphs": [
          "El botón de reproducción abajo inicia el movimiento y vuelve a pausarlo. Ni animación ni sonido arrancan automáticamente, tampoco tras recargar o restaurar ajustes.",
          "En pestañas inactivas se pausan animación y sonido. Al volver se reanuda una animación que estaba activa; las reglas del navegador pueden impedir que vuelva el audio."
        ]
      },
      {
        "title": "Preajustes y configuración propia",
        "paragraphs": [
          "Clásico, Fiebre del oro, Mar profundo, Película de aceite y Sueño de arcoíris ajustan juntos colores, líquido portador, viscosidad, velocidad y brillo.",
          "Un cambio individual muestra «Personalizado». Al recargar puede reconocerse de nuevo un preajuste exacto. Los preajustes no alteran reproducción, interacción táctil, transformación continua, sonido ni volumen.",
          "Velocidad controla el ritmo. Brillo cambia el líquido dibujado, no la luminosidad de la pantalla del dispositivo."
        ]
      },
      {
        "title": "Colores y materiales",
        "paragraphs": [
          "Brasa, Amatista, Laguna y Luz rosa usan una base. Arcoíris asigna un color a cada burbuja: las cercanas intercambian color y conservan la mezcla al separarse.",
          "Plata / metal, Cobre y Oro tienen reflejos simulados. Brillo de aceite ofrece gradientes iridiscentes. Son efectos estilizados, no materiales físicamente exactos.",
          "El líquido portador es independiente: Claro, Azul, Violeta, Ámbar o Turquesa. Cambia fondo e iluminación.",
          "Viscosidad modifica velocidad de movimiento, estiramiento y cambios de forma. Un valor alto da una lava más lenta y alargada. Puedes regular además la velocidad por separado."
        ]
      },
      {
        "title": "Interacción táctil y transformación continua",
        "paragraphs": [
          "La interacción táctil y la transformación continua empiezan activadas y se pueden desactivar por separado. La estela de burbujas también está activada: al arrastrar deja pequeñas burbujas que desaparecen en unos segundos. Requiere animación e interacción activas y se puede desactivar por separado.",
          "Con la animación en marcha, arrastra con el ratón pulsado o un dedo. Las burbujas próximas siguen suavemente; al soltar, el efecto se disipa. Los botones siguen siendo utilizables.",
          "Si la interacción está activa durante la reproducción, deslizar dentro de la escena mueve la lava en vez de desplazar la página. Pausa o desactiva la interacción para volver a desplazar normalmente allí.",
          "Transformación continua desarrolla formas y matices lentamente. Apagarla detiene esta evolución adicional, no el movimiento normal ni la mezcla al contacto. Pausa también detiene la transformación."
        ]
      },
      {
        "title": "Sonidos y volumen",
        "paragraphs": [
          "Los sonidos de burbujas empiezan activados pero solo suenan después de iniciar. Tonos sintéticos suaves acompañan acercamientos y separaciones. No son grabaciones ni suenan en todos los contactos visibles.",
          "El volumen se regula durante la reproducción. 0 % es silencio; 50 % es el valor predeterminado. El interruptor desactiva el sonido independientemente del control de volumen.",
          "Empieza bajo, sobre todo con auriculares. Pausa y segundo plano cortan el sonido. Si el audio está bloqueado o no se admite, la animación sigue utilizable sin él."
        ]
      },
      {
        "title": "Concentración y móviles",
        "paragraphs": [
          "El botón superior derecho abre la vista de enfoque usando pantalla completa si está disponible. Sal con la cruz, Escape o los controles del dispositivo.",
          "Tras tres segundos de inactividad se ocultan los botones. Movimiento, toque o teclado los revelan. Un botón enfocado mediante teclado sigue visible.",
          "El lienzo se adapta al tamaño y orientación. Lava no evita que se apague la pantalla ni que se bloquee el dispositivo."
        ]
      },
      {
        "title": "Recordar y borrar ajustes",
        "paragraphs": [
          "Recordar ajustes en este dispositivo es opcional y está desactivado inicialmente. Sin consentimiento, los cambios solo duran en la página actual.",
          "Con consentimiento se guardan colores, velocidad, brillo, líquido, viscosidad, interacción, transformación, estela de burbujas, sonidos y volumen. También se pueden restaurar idioma y diseño general.",
          "Los datos quedan en este navegador, no en una cuenta, y no pasan automáticamente a otros dispositivos. No se guardan reproducción, posiciones ni mezclas de color.",
          "Desactivar almacenamiento o borrar ajustes locales elimina los datos guardados. Los valores visibles pueden permanecer hasta recargar. Si se bloquea el almacenamiento, el uso sigue siendo posible."
        ]
      },
      {
        "title": "Límites y comodidad",
        "paragraphs": [
          "La animación necesita JavaScript y WebGL. Sin WebGL aparece una vista estática. Líquido, interacción y materiales son efectos simplificados; el resultado y el rendimiento dependen del dispositivo.",
          "Se indica la preferencia de movimiento reducido y no hay inicio automático. Activarla durante la reproducción pausa la animación.",
          "Pausa o cierra si te encuentras mal. Ajusta brillo y volumen cómodos. No lo uses al conducir ni en tareas que exijan toda tu atención."
        ]
      }
    ],
    "fr": [
      {
        "title": "Utilisation et limites",
        "paragraphs": [
          "Lava est une animation décorative pour une pause calme, avec sons de bulles facultatifs. Ce n’est ni un service médical ou thérapeutique ni une simulation exacte des fluides."
        ]
      },
      {
        "title": "Démarrer et mettre en pause",
        "paragraphs": [
          "Le bouton de lecture en bas lance le mouvement et permet de le mettre en pause. Ni animation ni son ne démarrent automatiquement, même après rechargement ou restauration des réglages.",
          "Animation et son se mettent en pause dans un onglet inactif. Au retour, une animation auparavant active reprend ; les règles du navigateur peuvent empêcher la reprise du son."
        ]
      },
      {
        "title": "Préréglages et réglages personnels",
        "paragraphs": [
          "Classique, Ruée vers l’or, Grands fonds, Film d’huile et Rêve arc-en-ciel règlent ensemble palette, liquide porteur, viscosité, vitesse et luminosité.",
          "Modifier une valeur affiche « Personnalisé ». Au rechargement, un préréglage correspondant exactement peut être reconnu. Les préréglages ne changent ni lecture, ni interaction, ni transformation, ni son ou volume.",
          "La vitesse règle la cadence. La luminosité change le liquide affiché, pas la luminosité de l’écran."
        ]
      },
      {
        "title": "Couleurs et matériaux",
        "paragraphs": [
          "Braise, Améthyste, Lagon et Lueur rose utilisent une couleur de base. Arc-en-ciel donne une couleur à chaque bulle : les bulles proches échangent leur couleur et conservent le mélange en se séparant.",
          "Argent / métal, Cuivre et Or ont des reflets simulés. Reflets d’huile utilise des dégradés irisés. Ce sont des effets stylisés, pas des matériaux physiquement exacts.",
          "Le liquide porteur est indépendant : Clair, Bleu, Violet, Ambre ou Turquoise. Il modifie fond et lumière.",
          "La viscosité influence mouvement, étirement et changements de forme. Une valeur élevée rend la lave plus lente et allongée. La vitesse reste réglable séparément."
        ]
      },
      {
        "title": "Interaction tactile et transformation continue",
        "paragraphs": [
          "L’interaction tactile et la transformation continue sont activées initialement et désactivables séparément. La traînée de bulles est aussi activée : glisser laisse de petites bulles qui disparaissent après quelques secondes. Elle exige une animation et une interaction actives et peut être désactivée séparément.",
          "Pendant l’animation, glissez avec le bouton de souris enfoncé ou un doigt. Les bulles proches suivent doucement ; l’effet s’atténue après relâchement. Les boutons restent utilisables.",
          "Si l’interaction est active pendant la lecture, glisser dans la scène déplace la lave au lieu de faire défiler la page. Mettez en pause ou désactivez l’interaction pour défiler normalement à cet endroit.",
          "La transformation continue développe lentement formes et nuances. La désactiver arrête ce développement supplémentaire, pas le mouvement normal ni le mélange au contact. Pause fige aussi la transformation."
        ]
      },
      {
        "title": "Sons et volume",
        "paragraphs": [
          "Les sons de bulles sont initialement activés mais ne commencent qu’après votre démarrage. Des sons synthétiques doux accompagnent rapprochements et séparations. Ce ne sont pas des enregistrements ; chaque contact visible ne produit pas forcément de son.",
          "Le volume est modifiable pendant la lecture. 0 % est silencieux ; 50 % est le volume par défaut. L’interrupteur coupe le son indépendamment du curseur.",
          "Commencez doucement, surtout au casque. Pause et arrière-plan coupent le son. Si l’audio est bloqué ou incompatible, l’animation reste utilisable sans son."
        ]
      },
      {
        "title": "Concentration et mobile",
        "paragraphs": [
          "Le bouton en haut à droite ouvre la vue concentration en plein écran si possible. Sortez avec la croix, Échap ou les commandes de l’appareil.",
          "Après trois secondes d’inactivité, les boutons disparaissent. Mouvement, toucher ou clavier les révèlent. Un bouton ciblé au clavier reste visible.",
          "Le canevas s’adapte aux dimensions et à l’orientation. Lava n’empêche ni l’extinction de l’écran ni le verrouillage."
        ]
      },
      {
        "title": "Mémoriser et effacer les réglages",
        "paragraphs": [
          "La mémorisation sur cet appareil est facultative et désactivée au départ. Sans accord, les changements restent sur la page actuelle.",
          "Avec accord sont conservés palette, vitesse, luminosité, liquide, viscosité, interaction, transformation, traînée de bulles, sons et volume. Langue et apparence générale peuvent aussi être restaurées.",
          "Les données restent dans ce navigateur, sans compte, et ne passent pas automatiquement à d’autres appareils. Lecture, positions et mélanges de couleurs ne sont pas enregistrés.",
          "Désactiver le stockage ou effacer les réglages locaux supprime les données sauvegardées. Les valeurs visibles peuvent rester jusqu’au rechargement. Le stockage bloqué n’empêche pas l’utilisation."
        ]
      },
      {
        "title": "Limites et confort",
        "paragraphs": [
          "L’animation exige JavaScript et WebGL. Sans WebGL, une vue fixe apparaît. Liquide, interaction et matériaux sont simplifiés ; rendu et performances dépendent de l’appareil.",
          "La préférence de mouvement réduit est indiquée et aucun démarrage n’est automatique. L’activer durant la lecture met en pause.",
          "Arrêtez ou fermez en cas de gêne. Choisissez luminosité et volume confortables. N’utilisez pas en conduisant ou pour une activité demandant toute votre attention."
        ]
      }
    ]
  }
};
