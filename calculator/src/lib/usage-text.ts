import type {Language} from './i18n';
interface UsageSection {id:string;title:string;paragraphs?:readonly string[];items?:readonly string[]}
interface UsageText {title:string;description:string;intro:string;contents:string;sections:readonly UsageSection[];contact:string;privacy:string;back:string;notice:string}
export const usageText:Record<Language,UsageText>={
 de:{
  title:'Nutzungshinweise',description:'Rechenlogik, Rundung, Speicherung und PDF-Export des Jacktools Taschenrechners verständlich erklärt.',intro:'Der kaufmännische Taschenrechner macht Rechenwege nachvollziehbar. Hier findest du die wichtigsten Regeln und Hinweise, damit Eingaben, Ergebnisse und gespeicherte Rechnungen zusammenpassen.',contents:'Auf dieser Seite',
  sections:[
   {id:'start',title:'Schnell starten',items:[
    'Wert eingeben, bei Bedarf eine Notiz ergänzen und mit ↵ oder Enter als Schritt übernehmen. Den Rechnungstitel änderst du über den Stift neben dem Titel.',
    'Im Wertfeld wählen +, −, × und ÷ beziehungsweise die Tastaturzeichen +, -, * und / die Rechenart. Steht bereits eine Zahl im Feld, wird sie im normalen Eingabemodus zuerst mit der bisher gewählten Rechenart übernommen. Weitere Rechenzeichen ohne neue Zahl ändern nur die Auswahl.',
    'Negative Eingabewerte erhältst du über ± oder durch Einfügen einer Zahl mit Vorzeichen. Die Minustaste auf der Tastatur wählt Subtrahieren, statt ein Minus in das leere Wertfeld zu schreiben.',
    'Komma und Punkt sind als Dezimaltrennzeichen erlaubt, Tausendertrennzeichen nicht. Schreibe beispielsweise 1234,50 oder 1234.50, nicht 1.234,50.',
    'Ziffern werden auch ohne aktives Eingabefeld an das Wertfeld weitergegeben; Buchstaben beginnen eine Notiz. Bereits aktive Textfelder und geöffnete Dialoge behalten ihre normale Bedienung. Der Info-Button im Ergebnisfeld erklärt die gewählte Rechenart.'
   ]},
   {id:'logic',title:'Tischrechnerlogik statt Punkt vor Strich',paragraphs:[
    'Die Schritte werden der Reihe nach ausgeführt. Jeder aktive Schritt verwendet das vorherige Ergebnis. 100 + 20, danach × 2 ergibt daher 240 und nicht 140.',
    '„Startwert / ersetzen“ setzt den laufenden Wert neu. Zwischensummen und reine Notizen verändern ihn nicht. Deaktivierte Schritte werden übersprungen, bleiben aber in der Rechnung erhalten.'
   ]},
   {id:'editing',title:'Rechenstreifen bearbeiten und Ansicht wählen',items:[
    'Standard ist der vereinfachte Papierstreifen mit Notiz und Rechenzeile. Klicke einen Schritt an, um seinen Aktiv-Schalter und die Aktionen einzublenden. Ein weiterer Klick klappt sie wieder zu.',
    'Du kannst Schritte bearbeiten, davor einen Schritt einfügen, verschieben, deaktivieren oder löschen. Alle nachfolgenden Ergebnisse werden neu berechnet. In der ausführlichen Ansicht ist zusätzlich Ziehen und Ablegen möglich.',
    'In den Einstellungen wechselst du zwischen vereinfachter und ausführlicher Ansicht und legst fest, auf welcher Seite der Rechner bei nebeneinanderliegenden Bereichen steht. Die Fokusansicht blendet die umgebenden Seitenbereiche aus.',
    'Rückgängig und Wiederholen gelten für Änderungen an der Rechnung, auch für „Neue Rechnung“, Import und geladene Beispiele. Es werden höchstens 100 Rückgängig-Stände gehalten. Entwürfe in den Eingabefeldern und die Historie werden nicht mitgespeichert.'
   ]},
   {id:'percent',title:'Prozent, Brutto und Netto',items:[
    'Prozentaufschlag und Prozentrabatt beziehen sich auf das vorherige Ergebnis. Aus 200 werden bei 10 % Aufschlag 220 und bei 10 % Rabatt 180.',
    '„Steuer hinzufügen / Brutto“ ergänzt die eingegebene Steuer zum bisherigen Nettobetrag: Netto × (1 + Steuersatz / 100). Beispielsweise ergeben 100 und eine Eingabe von 19 den Bruttobetrag 119.',
    '„Enthaltene Steuer herausrechnen“ liefert den Nettobetrag: Brutto ÷ (1 + Steuersatz / 100). Aus 119 werden bei einer Eingabe von 19 somit 100. Das Ergebnis ist der Nettobetrag, nicht der herausgerechnete Steuerbetrag.',
    'Du gibst den Prozentsatz selbst ein. Das Tool wählt keinen für deinen Fall geltenden Steuersatz aus.'
   ]},
   {id:'rounding',title:'Nachkommastellen und Rundung',paragraphs:[
    'Intern rechnet das Tool mit exakten Brüchen statt binären Gleitkommazahlen. Standardmäßig wird nur die Anzeige auf zwei Nachkommastellen gerundet. In den Einstellungen sind null bis acht Nachkommastellen wählbar.',
    'Mit „Jeden Schritt runden“ wird auch das Zwischenergebnis vor dem nächsten Schritt gerundet. Das kann das Endergebnis verändern: 1 ÷ 3 × 3 ergibt bei reiner Anzeigerundung 1,00, mit Rundung jedes Schritts auf zwei Stellen dagegen 0,99.',
    'Genau auf der Hälfte wird von null weg gerundet: 1,005 wird zu 1,01 und −1,005 zu −1,01. Angezeigte und gedruckte Werte können deshalb weniger Stellen zeigen als die gespeicherte Eingabe. Die Eingabe bleibt beim Bearbeiten und im JSON-Export mit ihrer ursprünglichen Genauigkeit erhalten.'
   ]},
   {id:'currency',title:'Währung als Beschriftung',paragraphs:[
    'Unter Einstellungen → Währung wählst du eine Währung oder „Ohne Währung“. Die Auswahl gehört zur jeweiligen Rechnung und erscheint an den Ergebnissen sowie im Ausdruck, beim Kopieren und im Export.',
    'Die Auswahl rechnet keine Beträge um, lädt keine Wechselkurse und ändert weder Nachkommastellen noch Rundungsregeln. Auch ein Währungswechsel lässt die Zahlen unverändert. Vermische daher keine Beträge verschiedener Währungen in derselben Rechnung.'
   ]},
   {id:'saving',title:'Lokal speichern und Daten sichern',paragraphs:[
    'Ohne aktivierte Speicherung kann die Rechnung beim Neuladen, Verlassen der Seite oder Sprachwechsel verloren gehen. „Diese Rechnung auf diesem Gerät speichern“ speichert die aktuelle Rechnung automatisch in diesem Browser. Ungesicherte Eingabeentwürfe werden nicht gespeichert. Stelle vor einem Wechsel sicher, dass wichtige Schritte übernommen sind.',
    'Die Speicherung von Sprache und Darstellung ist davon getrennt und optional. „Lokale Einstellungen“ → Löschen entfernt gespeicherte Einstellungen und die gespeicherte Rechnung; die gerade sichtbare Rechnung bleibt zunächst geöffnet. Es gibt keine Synchronisation und keine Serversicherung.',
    'Das Rechnen erfolgt im Browser; Rechendaten werden vom Tool nicht an einen Server gesendet. Browserdaten können gelöscht oder im privaten Modus nur vorübergehend verfügbar sein. Lokales Speichern ist deshalb kein Backup: Lade wichtige Rechnungen zusätzlich als JSON-Datei herunter.'
   ]},
   {id:'export',title:'Dateien, Kopieren und Drucken / PDF',items:[
    'JSON sichert die bearbeitbare Rechnung einschließlich deaktivierter Schritte, ursprünglicher Eingabewerte, Notizen, Währung und Recheneinstellungen. Du kannst die Datei später wieder öffnen. Eine gültige Datei ersetzt nach Bestätigung die vorhandenen Rechenschritte.',
    'CSV ist für Tabellenprogramme gedacht; „Kopieren“ überträgt den Rechenstreifen als Text in die Zwischenablage. Beide enthalten auch deaktivierte Schritte mit Status. CSV verwendet Semikolon als Trennzeichen. Potenziell als Formel interpretierbare Zellen werden mit einem Apostroph geschützt.',
    'Drucken / PDF enthält nur aktive Schritte und zeigt Schrittnummer, Notiz, Rechenoperation und Ergebnis. Werte werden mit den gewählten Nachkommastellen dargestellt. Währung und Rundungseinstellungen stehen ebenfalls im Ausdruck. Die ursprünglichen Schrittnummern bleiben erhalten; durch ausgelassene Schritte können Lücken entstehen.',
    'Zum Speichern als PDF wählst du im Druckdialog deines Browsers die entsprechende PDF-Option, sofern verfügbar. Eine so gespeicherte Datei kannst du anschließend selbst an eine E-Mail anhängen. Das Tool versendet keine Rechnungen.'
   ]},
   {id:'examples',title:'Beispielrechnungen',paragraphs:[
    'Das Buchsymbol öffnet Beispiele für Familienbudget, Urlaubsplanung und eine Handwerkerkalkulation. Die Zahlen sind frei gewählte Beispiele, keine statistischen Durchschnittswerte oder vollständigen Rechnungsdokumente. Alle Schritte bleiben bearbeitbar.',
    'Das Laden eines Beispiels ersetzt nach Bestätigung die bisherige Rechnung und Eingabeentwürfe. Beispiele verwenden zwei Nachkommastellen und Rundung pro Schritt. Prüfe nach dem Laden die Einstellungen und wähle bei Bedarf eine Währung.'
   ]},
   {id:'limits',title:'Fehler erkennen und Grenzen beachten',paragraphs:[
    'Pro Rechnung sind bis zu 500 Schritte möglich, pro eingegebenem Wert bis zu 24 Vor- und 12 Nachkommastellen. Bei sehr großen Zwischenwerten greifen zusätzlich technische Schutzgrenzen.',
    'Division durch null oder überschrittene Rechengrenzen werden am betroffenen Schritt angezeigt. Nachfolgende Ergebnisse bleiben ungültig, bis du den ersten problematischen Schritt korrigierst, löschst oder deaktivierst. Ein neuer Startwert hinter dem Fehler behebt ihn nicht.',
    'Die Nutzung ist kostenlos und ohne Anmeldung möglich; Unterstützung ist freiwillig. Prüfe wichtige Ergebnisse und die für deinen Zweck erforderlichen Rundungsregeln unabhängig. Das Tool ersetzt keine Buchhaltungssoftware oder fachliche Beratung.'
   ]}
  ],contact:'Fehler oder Fragen?',privacy:'Datenschutzerklärung',back:'Zurück zum Taschenrechner',notice:'Diese Hinweise enthalten keinen pauschalen Haftungsausschluss und schränken gesetzliche Rechte nicht ein. Die deutsche Fassung ist das redaktionelle Original; die weiteren Sprachfassungen sind Übersetzungen.'
 },
 en:{
  title:'Usage notes',description:'Understand the Jacktools calculator’s calculation order, rounding, saving and PDF export.',intro:'This commercial calculator makes calculations traceable. These notes explain how inputs, results and saved calculations work together.',contents:'On this page',
  sections:[
   {id:'start',title:'Getting started',items:[
    'Enter a value, optionally add a note, then confirm with ↵ or Enter. Use the pencil beside the calculation title to rename it.',
    'In the value field, +, −, × and ÷, or the keyboard characters +, -, * and /, select an operation. During normal entry, an existing number is first submitted using the previously selected operation. Further operators without a new number only change the selection.',
    'Use ± or paste a signed number to enter negative values. The keyboard minus key selects subtraction rather than typing a minus into an empty value field.',
    'A comma or point is accepted as the decimal separator; thousands separators are not supported. Enter 1234.50 or 1234,50, not 1,234.50.',
    'Typing digits outside an input field sends them to the value field; letters start a note. Active text fields and open dialogs retain their normal behaviour. The info button in the result display explains the selected operation.'
   ]},
   {id:'logic',title:'Sequential calculator logic, not operator precedence',paragraphs:[
    'Steps run in sequence. Each active step uses the previous result. Therefore 100 + 20, followed by × 2, gives 240, not 140.',
    '“Starting value / replace” replaces the running value. Subtotals and note-only steps do not change it. Disabled steps are skipped but remain in the calculation.'
   ]},
   {id:'editing',title:'Editing the tape and choosing a view',items:[
    'The default is the simplified receipt view with notes and calculation lines. Select a step to reveal its enable switch and actions; select it again to collapse them.',
    'Edit, insert before, reorder, disable or delete steps. All following results recalculate. Drag and drop is also available in the detailed view.',
    'Settings let you switch between simplified and detailed views and choose which side the calculator occupies when the panels are side by side. Focus view hides the surrounding page sections.',
    'Undo and redo apply to calculation changes, including new calculations, imports and examples. Up to 100 undo snapshots are kept. Input drafts and history are not saved with the calculation.'
   ]},
   {id:'percent',title:'Percentages, gross and net',items:[
    'Percentage increases and discounts use the previous result as their base. Starting from 200, a 10% increase gives 220 and a 10% discount gives 180.',
    '“Add tax / gross amount” adds the entered tax to the previous net amount: net × (1 + rate / 100). For example, 100 with an entered rate of 19 gives a gross amount of 119.',
    '“Remove included tax” returns the net amount: gross ÷ (1 + rate / 100). Thus 119 with an entered rate of 19 gives 100. The result is the net amount, not the tax removed.',
    'You enter the percentage yourself. The tool does not choose a tax rate applicable to your situation.'
   ]},
   {id:'rounding',title:'Decimal places and rounding',paragraphs:[
    'Internally, the tool uses exact fractions instead of binary floating-point numbers. By default, only the display is rounded to two decimal places. Settings allow zero to eight decimal places.',
    '“Round every step” also rounds each intermediate result before the next step. This can change the final result: 1 ÷ 3 × 3 gives 1.00 with display-only rounding, but 0.99 when rounding each step to two decimal places.',
    'Exact halfway values round away from zero: 1.005 becomes 1.01 and −1.005 becomes −1.01. Displayed and printed values can therefore show fewer digits than the stored input. Editing and JSON export retain the original input precision.'
   ]},
   {id:'currency',title:'Currency as a label',paragraphs:[
    'Choose a currency or “No currency” under Settings → Currency. The choice belongs to the calculation and labels results, printouts, copied text and exports.',
    'Selecting another currency does not convert amounts, retrieve exchange rates or change decimal places or rounding. The numbers stay unchanged. Do not mix amounts in different currencies within one calculation.'
   ]},
   {id:'saving',title:'Local saving and backups',paragraphs:[
    'Without saving enabled, reloading, leaving the page or switching language can lose the calculation. “Save this calculation on this device” automatically saves the current calculation in this browser. Unsubmitted input drafts are not saved. Confirm important steps before navigating away.',
    'Saving language and appearance is separate and optional. “Local settings” → Delete removes saved preferences and the saved calculation; the currently visible calculation initially stays open. There is no synchronisation or server backup.',
    'Calculations run in your browser; the tool does not send calculation data to a server. Browser data can be deleted or be temporary in private browsing. Local saving is not a backup: download important calculations as JSON files as well.'
   ]},
   {id:'export',title:'Files, copying and Print / PDF',items:[
    'JSON saves the editable calculation, including disabled steps, original input values, notes, currency and calculation settings. Open the file again later. After confirmation, a valid imported file replaces the current steps.',
    'CSV is intended for spreadsheets; Copy places the tape on the clipboard as text. Both include disabled steps with their status. CSV uses semicolons as separators. Potentially formula-like cells are protected with an apostrophe.',
    'Print / PDF includes active steps only, with step number, note, operation and result. Values use the selected decimal places. Currency and rounding settings also appear on the printout. Original step numbers are retained, so skipped steps can leave gaps.',
    'To save a PDF, select the PDF option in your browser’s print dialog, if available. You can then attach the saved file to an email yourself. The tool does not send calculations.'
   ]},
   {id:'examples',title:'Example calculations',paragraphs:[
    'The book icon opens examples for a family budget, holiday planning and a tradesperson’s calculation. Values are illustrative, not statistical averages or complete invoices. All steps remain editable.',
    'Loading an example replaces the existing calculation and input drafts after confirmation. Examples use two decimal places with rounding at each step. Check the settings afterwards and choose a currency if needed.'
   ]},
   {id:'limits',title:'Errors and limits',paragraphs:[
    'A calculation supports up to 500 steps, with up to 24 integer digits and 12 fractional digits per input. Additional technical safeguards apply to very large intermediate values.',
    'Division by zero or exceeded calculation limits are shown on the affected step. Following results remain invalid until you correct, delete or disable the first problematic step. A new starting value after the error does not bypass it.',
    'The tool is free and requires no account; support is optional. Independently verify important results and the rounding rules your purpose requires. This tool does not replace accounting software or professional advice.'
   ]}
  ],contact:'Problems or questions?',privacy:'Privacy notice',back:'Back to calculator',notice:'These notes contain no blanket exclusion of liability and do not restrict statutory rights. German is the editorial original; other language versions are translations.'
 },
 es:{
  title:'Indicaciones de uso',description:'Orden de cálculo, redondeo, almacenamiento y exportación PDF de la calculadora Jacktools.',intro:'Esta calculadora comercial permite seguir cada cálculo. Aquí se explica cómo funcionan las entradas, los resultados y los cálculos guardados.',contents:'En esta página',
  sections:[
   {id:'start',title:'Primeros pasos',items:[
    'Introduce un valor, añade una nota si lo deseas y confirma con ↵ o Enter. El lápiz junto al título permite cambiar el nombre del cálculo.',
    'En el campo de valor, +, −, × y ÷ o las teclas +, -, * y / seleccionan la operación. Durante la entrada normal, un número ya introducido se añade primero con la operación seleccionada anteriormente. Otros operadores sin un número nuevo solo cambian la selección.',
    'Usa ± o pega un número con signo para introducir valores negativos. La tecla menos selecciona la resta en lugar de escribir un signo en un campo vacío.',
    'Se acepta coma o punto decimal, pero no separadores de miles. Escribe 1234,50 o 1234.50, no 1.234,50.',
    'Fuera de un campo de entrada, los dígitos se dirigen al campo de valor y las letras inician una nota. Los campos de texto activos y los diálogos mantienen su funcionamiento normal. El botón de información junto al resultado explica la operación seleccionada.'
   ]},
   {id:'logic',title:'Cálculo secuencial, sin prioridad de operadores',paragraphs:[
    'Los pasos se ejecutan en orden. Cada paso activo utiliza el resultado anterior. Por eso 100 + 20, seguido de × 2, da 240 y no 140.',
    '«Valor inicial / reemplazar» sustituye el valor acumulado. Los subtotales y los pasos de nota no lo modifican. Los pasos desactivados se omiten, pero permanecen en el cálculo.'
   ]},
   {id:'editing',title:'Editar el historial y elegir la vista',items:[
    'La vista predeterminada es el historial simplificado, con notas y líneas de cálculo. Selecciona un paso para mostrar su interruptor y sus acciones; selecciónalo otra vez para ocultarlos.',
    'Puedes editar, insertar antes, reordenar, desactivar o eliminar pasos. Todos los resultados posteriores se recalculan. La vista detallada también permite arrastrar y soltar.',
    'En Opciones puedes elegir la vista simplificada o detallada y el lado de la calculadora cuando los paneles aparecen en paralelo. La vista de concentración oculta las secciones de la página que la rodean.',
    'Deshacer y rehacer se aplican a los cambios del cálculo, incluidos cálculos nuevos, importaciones y ejemplos. Se conservan hasta 100 estados de deshacer. Los borradores de entrada y el historial no se guardan con el cálculo.'
   ]},
   {id:'percent',title:'Porcentajes, bruto y neto',items:[
    'Los aumentos y descuentos porcentuales toman como base el resultado anterior. Partiendo de 200, un aumento del 10 % da 220 y un descuento del 10 % da 180.',
    '«Añadir impuesto / bruto» añade el impuesto indicado al importe neto anterior: neto × (1 + porcentaje / 100). Por ejemplo, 100 con una entrada de 19 da un importe bruto de 119.',
    '«Extraer impuesto incluido» devuelve el importe neto: bruto ÷ (1 + porcentaje / 100). Así, 119 con una entrada de 19 da 100. El resultado es el importe neto, no el impuesto extraído.',
    'Tú introduces el porcentaje. La herramienta no selecciona el tipo impositivo aplicable a tu caso.'
   ]},
   {id:'rounding',title:'Decimales y redondeo',paragraphs:[
    'Internamente se utilizan fracciones exactas en lugar de números binarios de coma flotante. Por defecto solo se redondea la visualización a dos decimales. Se pueden elegir de cero a ocho decimales.',
    '«Redondear cada paso» redondea también cada resultado intermedio antes del siguiente paso. Esto puede cambiar el resultado final: 1 ÷ 3 × 3 da 1,00 si solo se redondea la visualización y 0,99 si se redondea cada paso a dos decimales.',
    'Los valores exactamente a mitad se redondean alejándose de cero: 1,005 pasa a 1,01 y −1,005 a −1,01. Los valores mostrados e impresos pueden tener menos cifras que la entrada guardada. La edición y la exportación JSON conservan la precisión original.'
   ]},
   {id:'currency',title:'La moneda como etiqueta',paragraphs:[
    'En Opciones → Moneda elige una moneda o «Sin moneda». La selección pertenece al cálculo y aparece en los resultados, impresiones, texto copiado y exportaciones.',
    'Cambiar de moneda no convierte importes, no consulta tipos de cambio ni modifica los decimales o el redondeo. Los números no cambian. No mezcles importes de diferentes monedas en el mismo cálculo.'
   ]},
   {id:'saving',title:'Guardar localmente y hacer copias',paragraphs:[
    'Sin almacenamiento activado, el cálculo puede perderse al recargar, salir de la página o cambiar de idioma. «Guardar este cálculo en este dispositivo» guarda automáticamente el cálculo actual en este navegador. No se guardan los borradores sin confirmar. Confirma los pasos importantes antes de salir.',
    'Guardar el idioma y la apariencia es una opción independiente y voluntaria. «Ajustes locales» → Borrar elimina los ajustes y el cálculo guardados; el cálculo visible permanece inicialmente abierto. No hay sincronización ni copia en el servidor.',
    'Los cálculos se realizan en el navegador; la herramienta no envía datos de cálculo a un servidor. Los datos del navegador pueden borrarse o ser temporales en modo privado. El almacenamiento local no es una copia de seguridad: descarga también los cálculos importantes como archivos JSON.'
   ]},
   {id:'export',title:'Archivos, copiar e imprimir / PDF',items:[
    'JSON guarda el cálculo editable, incluidos pasos desactivados, valores originales, notas, moneda y ajustes de cálculo. Puedes volver a abrir el archivo. Tras confirmar, un archivo válido importado reemplaza los pasos actuales.',
    'CSV está pensado para hojas de cálculo; Copiar coloca el historial como texto en el portapapeles. Ambos incluyen pasos desactivados con su estado. CSV utiliza punto y coma como separador. Las celdas que podrían interpretarse como fórmulas se protegen con un apóstrofo.',
    'Imprimir / PDF incluye solo pasos activos y muestra número de paso, nota, operación y resultado. Los valores usan los decimales seleccionados. También aparecen la moneda y los ajustes de redondeo. Se mantienen los números originales, por lo que los pasos omitidos pueden dejar saltos.',
    'Para guardar un PDF, elige la opción PDF del diálogo de impresión del navegador, si está disponible. Después puedes adjuntar el archivo a un correo por tu cuenta. La herramienta no envía cálculos.'
   ]},
   {id:'examples',title:'Cálculos de ejemplo',paragraphs:[
    'El icono del libro abre ejemplos de presupuesto familiar, planificación de vacaciones y cálculo de un profesional. Los valores son ilustrativos, no promedios estadísticos ni facturas completas. Todos los pasos siguen siendo editables.',
    'Tras confirmar, cargar un ejemplo reemplaza el cálculo actual y los borradores de entrada. Los ejemplos usan dos decimales y redondeo por paso. Comprueba los ajustes y elige una moneda si es necesario.'
   ]},
   {id:'limits',title:'Errores y límites',paragraphs:[
    'Se admiten hasta 500 pasos por cálculo y hasta 24 cifras enteras y 12 decimales por valor introducido. Hay límites técnicos adicionales para resultados intermedios muy grandes.',
    'La división por cero y los límites de cálculo superados se indican en el paso correspondiente. Los resultados posteriores siguen siendo inválidos hasta corregir, eliminar o desactivar el primer paso problemático. Un nuevo valor inicial después del error no lo soluciona.',
    'La herramienta es gratuita y no requiere cuenta; el apoyo es voluntario. Verifica de forma independiente los resultados importantes y las reglas de redondeo necesarias. No sustituye a un programa de contabilidad ni al asesoramiento profesional.'
   ]}
  ],contact:'¿Problemas o preguntas?',privacy:'Aviso de privacidad',back:'Volver a la calculadora',notice:'Estas indicaciones no contienen una exclusión general de responsabilidad ni limitan los derechos legales. La versión alemana es el original editorial; las demás versiones son traducciones.'
 },
 fr:{
  title:'Conseils d’utilisation',description:'Ordre des opérations, arrondi, sauvegarde et export PDF de la calculatrice Jacktools.',intro:'Cette calculatrice commerciale rend les calculs faciles à suivre. Ces conseils expliquent le fonctionnement des saisies, des résultats et des calculs enregistrés.',contents:'Sur cette page',
  sections:[
   {id:'start',title:'Bien démarrer',items:[
    'Saisissez une valeur, ajoutez éventuellement une note et validez avec ↵ ou Entrée. Le crayon à côté du titre permet de renommer le calcul.',
    'Dans le champ de valeur, +, −, × et ÷ ou les touches +, -, * et / sélectionnent une opération. En saisie normale, un nombre déjà saisi est d’abord ajouté avec l’opération précédemment sélectionnée. Les opérateurs suivants, sans nouveau nombre, changent uniquement la sélection.',
    'Utilisez ± ou collez un nombre signé pour saisir une valeur négative. La touche moins sélectionne la soustraction au lieu de saisir un signe dans un champ vide.',
    'La virgule et le point sont acceptés comme séparateurs décimaux, mais pas les séparateurs de milliers. Saisissez 1234,50 ou 1234.50, et non 1 234,50.',
    'En dehors d’un champ de saisie, les chiffres sont dirigés vers la valeur et les lettres commencent une note. Les champs de texte actifs et les dialogues conservent leur fonctionnement habituel. Le bouton d’information dans la zone de résultat explique l’opération choisie.'
   ]},
   {id:'logic',title:'Calcul séquentiel, sans priorité des opérateurs',paragraphs:[
    'Les étapes sont exécutées dans l’ordre. Chaque étape active utilise le résultat précédent. Ainsi, 100 + 20, puis × 2, donne 240 et non 140.',
    '« Valeur initiale / remplacer » remplace la valeur courante. Les sous-totaux et les notes seules ne la modifient pas. Les étapes désactivées sont ignorées mais restent dans le calcul.'
   ]},
   {id:'editing',title:'Modifier l’historique et choisir l’affichage',items:[
    'L’affichage par défaut est le ticket simplifié, avec notes et lignes de calcul. Sélectionnez une étape pour afficher son interrupteur et ses actions ; sélectionnez-la à nouveau pour les masquer.',
    'Vous pouvez modifier, insérer avant, déplacer, désactiver ou supprimer des étapes. Tous les résultats suivants sont recalculés. Le glisser-déposer est également disponible dans l’affichage détaillé.',
    'Les options permettent de choisir l’affichage simplifié ou détaillé et le côté de la calculatrice lorsque les panneaux sont côte à côte. Le mode concentration masque les sections environnantes de la page.',
    'Annuler et rétablir concernent les modifications du calcul, y compris les nouveaux calculs, importations et exemples. Jusqu’à 100 états d’annulation sont conservés. Les brouillons de saisie et l’historique ne sont pas enregistrés avec le calcul.'
   ]},
   {id:'percent',title:'Pourcentages, brut et net',items:[
    'Les majorations et remises prennent le résultat précédent comme base. À partir de 200, une majoration de 10 % donne 220 et une remise de 10 % donne 180.',
    '« Ajouter la taxe / brut » ajoute la taxe saisie au montant net précédent : net × (1 + taux / 100). Par exemple, 100 avec un taux saisi de 19 donne un montant brut de 119.',
    '« Extraire la taxe incluse » donne le montant net : brut ÷ (1 + taux / 100). Ainsi, 119 avec un taux saisi de 19 donne 100. Le résultat est le montant net, et non la taxe retirée.',
    'Vous saisissez vous-même le pourcentage. L’outil ne sélectionne pas le taux fiscal applicable à votre situation.'
   ]},
   {id:'rounding',title:'Décimales et arrondi',paragraphs:[
    'L’outil utilise des fractions exactes plutôt que des nombres binaires à virgule flottante. Par défaut, seul l’affichage est arrondi à deux décimales. Les options permettent de choisir de zéro à huit décimales.',
    '« Arrondir chaque étape » arrondit aussi chaque résultat intermédiaire avant l’étape suivante. Le résultat final peut changer : 1 ÷ 3 × 3 donne 1,00 avec l’arrondi de l’affichage seul, mais 0,99 avec l’arrondi de chaque étape à deux décimales.',
    'Les valeurs exactement à mi-chemin sont arrondies en s’éloignant de zéro : 1,005 devient 1,01 et −1,005 devient −1,01. Les valeurs affichées et imprimées peuvent donc avoir moins de chiffres que la saisie enregistrée. La modification et l’export JSON conservent la précision d’origine.'
   ]},
   {id:'currency',title:'La devise comme indication',paragraphs:[
    'Dans Options → Devise, choisissez une devise ou « Sans devise ». Le choix appartient au calcul et figure dans les résultats, impressions, textes copiés et exports.',
    'Changer de devise ne convertit pas les montants, ne consulte pas les taux de change et ne modifie ni les décimales ni l’arrondi. Les nombres restent identiques. Ne mélangez pas différentes devises dans le même calcul.'
   ]},
   {id:'saving',title:'Enregistrement local et sauvegardes',paragraphs:[
    'Sans enregistrement activé, le calcul peut être perdu en rechargeant la page, en la quittant ou en changeant de langue. « Enregistrer ce calcul sur cet appareil » enregistre automatiquement le calcul courant dans ce navigateur. Les brouillons non validés ne sont pas enregistrés. Validez les étapes importantes avant de quitter la page.',
    'La mémorisation de la langue et de l’apparence est distincte et facultative. « Réglages locaux » → Effacer supprime les réglages et le calcul enregistrés ; le calcul visible reste d’abord ouvert. Il n’y a ni synchronisation ni sauvegarde sur serveur.',
    'Les calculs sont effectués dans le navigateur ; l’outil n’envoie pas les données de calcul à un serveur. Les données du navigateur peuvent être supprimées ou temporaires en navigation privée. L’enregistrement local n’est pas une sauvegarde : téléchargez aussi les calculs importants en JSON.'
   ]},
   {id:'export',title:'Fichiers, copie et impression / PDF',items:[
    'JSON enregistre le calcul modifiable, y compris les étapes désactivées, valeurs d’origine, notes, devise et réglages de calcul. Vous pouvez rouvrir le fichier plus tard. Après confirmation, un fichier importé valide remplace les étapes courantes.',
    'CSV est destiné aux tableurs ; Copier place l’historique dans le presse-papiers sous forme de texte. Les deux incluent les étapes désactivées avec leur état. CSV utilise le point-virgule comme séparateur. Les cellules pouvant être interprétées comme des formules sont protégées par une apostrophe.',
    'Imprimer / PDF inclut uniquement les étapes actives, avec numéro, note, opération et résultat. Les valeurs utilisent les décimales choisies. La devise et les réglages d’arrondi figurent également dans l’impression. Les numéros d’origine sont conservés, ce qui peut laisser des écarts lorsque des étapes sont omises.',
    'Pour enregistrer un PDF, choisissez l’option PDF du dialogue d’impression du navigateur, si elle est disponible. Vous pourrez ensuite joindre le fichier à un e-mail vous-même. L’outil n’envoie pas les calculs.'
   ]},
   {id:'examples',title:'Exemples de calculs',paragraphs:[
    'L’icône du livre ouvre des exemples de budget familial, de préparation de vacances et de calcul d’un artisan. Les valeurs sont illustratives : ce ne sont ni des moyennes statistiques ni des factures complètes. Toutes les étapes restent modifiables.',
    'Après confirmation, un exemple remplace le calcul existant et les brouillons de saisie. Les exemples utilisent deux décimales avec arrondi à chaque étape. Vérifiez ensuite les réglages et choisissez une devise si nécessaire.'
   ]},
   {id:'limits',title:'Erreurs et limites',paragraphs:[
    'Un calcul peut contenir jusqu’à 500 étapes, avec jusqu’à 24 chiffres entiers et 12 décimales par valeur saisie. Des limites techniques supplémentaires s’appliquent aux très grands résultats intermédiaires.',
    'La division par zéro et le dépassement des limites de calcul sont signalés sur l’étape concernée. Les résultats suivants restent invalides jusqu’à correction, suppression ou désactivation de la première étape problématique. Une nouvelle valeur initiale après l’erreur ne la contourne pas.',
    'L’outil est gratuit et sans compte ; le soutien est facultatif. Vérifiez indépendamment les résultats importants et les règles d’arrondi nécessaires. L’outil ne remplace ni un logiciel comptable ni un conseil professionnel.'
   ]}
  ],contact:'Un problème ou une question ?',privacy:'Notice de confidentialité',back:'Retour à la calculatrice',notice:'Ces conseils ne contiennent aucune exclusion générale de responsabilité et ne limitent pas les droits légaux. La version allemande est l’original éditorial ; les autres versions sont des traductions.'
 }
};
