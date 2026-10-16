import type { Language } from './i18n';
import type { Operation } from './calculation';
export const standardOperations: Record<string, Operation> = { '+':'add', '−':'subtract', '×':'multiply', '÷':'divide' };
export const specialOperations = ['set', 'increase', 'discount', 'taxIn', 'taxOut', 'subtotal', 'note'] as const;
export const specialSymbols = { set: '→ =', increase: '+ %', discount: '− %', taxIn: '+ %', taxOut: '÷ %', subtotal: 'Σ', note: '✎' };
export const operationSymbols: Record<Operation,string> = {...specialSymbols,add:'+',subtract:'−',multiply:'×',divide:'÷'};
interface OperationHelp {
  specials: string;
  current: string;
  labels: Record<typeof specialOperations[number], string>;
  hints: Record<Operation, string>;
}
export const operationHelp: Record<Language, OperationHelp> = {
  de: {
    specials: 'Sonderfunktionen', current: 'Gewählte Rechenart',
    labels: { set: 'Startwert', increase: 'Aufschlag', discount: 'Rabatt', taxIn: 'Brutto', taxOut: 'Netto', subtotal: 'Summe', note: 'Notiz' },
    hints: {
      add: "Addieren: Addiert die eingegebene Zahl zum bisherigen Ergebnis. Beispiel: 100 + 20 → 120. Auch negative Werte sind möglich. Wähle +, gib den Wert ein und bestätige mit =.",
      subtract: "Subtrahieren: Zieht die eingegebene Zahl vom bisherigen Ergebnis ab. Beispiel: 100 − 20 → 80. Eine negative Zahl abzuziehen erhöht das Ergebnis: 100 − (−20) → 120. Wähle −, gib den Wert ein und bestätige mit =.",
      multiply: "Multiplizieren: Multipliziert das bisherige Ergebnis mit der eingegebenen Zahl. Beispiel: 120 × 2 → 240. Der Schritt verwendet das vorherige Ergebnis, ohne Punkt-vor-Strich-Regel. Wähle ×, gib den Faktor ein und bestätige mit =.",
      divide: "Dividieren: Teilt das bisherige Ergebnis durch die eingegebene Zahl. Beispiel: 120 ÷ 3 → 40. Teilen durch null ist nicht möglich; korrigiere oder deaktiviere den fehlerhaften Schritt. Wähle ÷, gib den Teiler ein und bestätige mit =.",
      set: 'Startwert / ersetzen: Die eingegebene Zahl wird zum neuen laufenden Ergebnis. Vorherige Schritte bleiben im Rechenstreifen erhalten, werden aber nicht zu diesem Wert addiert. Beispiel: Bisher 80, Eingabe 100 → Ergebnis 100. Wähle die Taste, gib den Wert ein und bestätige mit =.',
      increase: 'Prozentaufschlag: Erhöht das bisherige Ergebnis um den eingegebenen Prozentsatz. Beispiel: 100 und Eingabe 19 → 119. Formel: bisheriges Ergebnis × (1 + Prozentsatz / 100). Geeignet für allgemeine Preisaufschläge; für Steuer gibt es die Taste Brutto; keine automatische Steuersatzauswahl. Wähle + %, gib den Prozentsatz ein und bestätige mit =.',
      discount: 'Prozentrabatt: Verringert das bisherige Ergebnis um den eingegebenen Prozentsatz. Beispiel: 200 und Eingabe 10 → 180; der Rabatt beträgt 20. Formel: bisheriges Ergebnis × (1 − Prozentsatz / 100). Mehrere Rabatte werden nacheinander auf den jeweils verbleibenden Betrag angewendet. Wähle − %, gib den Prozentsatz ein und bestätige mit =.',
      taxIn: 'Brutto / Steuer hinzufügen: Berechnet den Bruttobetrag aus dem bisherigen Nettobetrag und dem eingegebenen Steuersatz. Beispiel: 100 netto und Eingabe 19 → 119 brutto; die hinzugefügte Steuer beträgt 19. Formel: Netto × (1 + Steuersatz / 100). Es ist kein Steuersatz voreingestellt. Wähle Brutto, gib den Steuersatz ein und bestätige mit =. Die Taste Netto rechnet die enthaltene Steuer wieder heraus.',
      taxOut: 'Enthaltene Steuer herausrechnen: Berechnet den Nettobetrag aus einem Bruttobetrag, in dem die Steuer bereits enthalten ist. Beispiel: 119 brutto und Eingabe 19 → 100 netto. Formel: Brutto ÷ (1 + Steuersatz / 100). Das ist nicht dasselbe wie 19 % Rabatt! Wähle Netto, gib den enthaltenen Steuersatz ein und bestätige mit =.',
      subtotal: 'Zwischensumme: Hält das bisherige Ergebnis als eigenen, benennbaren Schritt fest, ohne es zu verändern. Beispiel: Nach Material und Versand eine Zeile „Kosten gesamt“. Kein Zahlenwert erforderlich. Auch diese Zwischensumme wird bei Änderungen vorheriger Schritte neu berechnet. Wähle Summe, gib optional einen Namen ein und bestätige mit =.',
      note: 'Notiz: Fügt eine beschreibende Zeile in den Rechenstreifen ein, ohne das Ergebnis zu verändern. Trage den Text im Feld „Schrittname / Notiz“ ein, zum Beispiel „Angebot vom Lieferanten“. Kein Zahlenwert erforderlich. Notizen können wie andere Schritte bearbeitet, verschoben, deaktiviert oder gelöscht werden. Bestätige mit =.'
    }
  },
  en: {
    specials: 'Special functions', current: 'Selected operation',
    labels: { set: 'Start value', increase: 'Increase', discount: 'Discount', taxIn: 'Gross', taxOut: 'Net', subtotal: 'Subtotal', note: 'Note' },
    hints: {
      add: "Add: Adds the entered number to the previous result. Example: 100 + 20 → 120. Negative values are supported too. Select +, enter the value and confirm with =.",
      subtract: "Subtract: Subtracts the entered number from the previous result. Example: 100 − 20 → 80. Subtracting a negative number increases the result: 100 − (−20) → 120. Select −, enter the value and confirm with =.",
      multiply: "Multiply: Multiplies the previous result by the entered number. Example: 120 × 2 → 240. Each step uses the previous result, without operator precedence. Select ×, enter the factor and confirm with =.",
      divide: "Divide: Divides the previous result by the entered number. Example: 120 ÷ 3 → 40. Division by zero is not possible; correct or disable the invalid step. Select ÷, enter the divisor and confirm with =.",
      set: 'Starting value / replace: The entered number becomes the running result. Earlier steps remain in the tape but are not added to this value. Example: previous result 80, enter 100 → result 100. Select this key, enter the value and confirm with =.',
      increase: 'Percentage increase: Increases the previous result by the entered percentage. Example: 100 and enter 19 → 119. Formula: previous result × (1 + percentage / 100). Use for general markups; use Gross to add tax; no tax rate is selected automatically. Select + %, enter the percentage and confirm with =.',
      discount: 'Percentage discount: Reduces the previous result by the entered percentage. Example: 200 and enter 10 → 180, a discount of 20. Formula: previous result × (1 − percentage / 100). Successive discounts each use the remaining amount. Select − %, enter the percentage and confirm with =.',
      taxIn: 'Gross / add tax: Calculates the gross amount from the previous net amount and the entered tax rate. Example: 100 net and enter 19 → 119 gross; added tax is 19. Formula: net × (1 + tax rate / 100). No tax rate is preset. Select Gross, enter the rate and confirm with =. Net removes the included tax again.',
      taxOut: 'Remove included tax: Calculates the net amount from a gross amount that already includes tax. Example: 119 gross and enter 19 → 100 net. Formula: gross ÷ (1 + tax rate / 100). This is not the same as a 19 % discount! Select Net, enter the included tax rate and confirm with =.',
      subtotal: 'Subtotal: Records the running result as a separate named step without changing it. Example: a “Total costs” line after materials and shipping. No number is needed. This subtotal also recalculates when earlier steps change. Select Subtotal, optionally enter a name and confirm with =.',
      note: 'Note: Adds a descriptive line to the tape without changing the result. Enter the text in “Step name / note”, for example “Supplier quotation”. No number is needed. Notes can be edited, moved, disabled or deleted just like other steps. Confirm with =.'
    }
  },
  es: {
    specials: 'Funciones especiales', current: 'Operación seleccionada',
    labels: { set: 'Inicial', increase: 'Aumento', discount: 'Descuento', taxIn: 'Bruto', taxOut: 'Neto', subtotal: 'Subtotal', note: 'Nota' },
    hints: {
      add: "Sumar: Añade el número introducido al resultado anterior. Ejemplo: 100 + 20 → 120. También admite valores negativos. Selecciona +, introduce el valor y confirma con =.",
      subtract: "Restar: Resta el número introducido del resultado anterior. Ejemplo: 100 − 20 → 80. Restar un número negativo aumenta el resultado: 100 − (−20) → 120. Selecciona −, introduce el valor y confirma con =.",
      multiply: "Multiplicar: Multiplica el resultado anterior por el número introducido. Ejemplo: 120 × 2 → 240. Cada paso usa el resultado anterior, sin prioridad de operadores. Selecciona ×, introduce el factor y confirma con =.",
      divide: "Dividir: Divide el resultado anterior entre el número introducido. Ejemplo: 120 ÷ 3 → 40. No se puede dividir entre cero; corrige o desactiva el paso incorrecto. Selecciona ÷, introduce el divisor y confirma con =.",
      set: 'Valor inicial / reemplazar: El número introducido pasa a ser el resultado actual. Los pasos anteriores siguen en el historial, pero no se suman a este valor. Ejemplo: resultado anterior 80, introduce 100 → resultado 100. Selecciona la tecla, introduce el valor y confirma con =.',
      increase: 'Aumento porcentual: Aumenta el resultado anterior en el porcentaje introducido. Ejemplo: 100 e introduce 19 → 119. Fórmula: resultado anterior × (1 + porcentaje / 100). Para recargos generales; usa Bruto para añadir impuestos; no se selecciona una tasa automáticamente. Selecciona + %, introduce el porcentaje y confirma con =.',
      discount: 'Descuento porcentual: Reduce el resultado anterior en el porcentaje introducido. Ejemplo: 200 e introduce 10 → 180, un descuento de 20. Fórmula: resultado anterior × (1 − porcentaje / 100). Los descuentos sucesivos usan el importe restante. Selecciona − %, introduce el porcentaje y confirma con =.',
      taxIn: 'Bruto / añadir impuesto: Calcula el importe bruto a partir del neto anterior y la tasa introducida. Ejemplo: 100 netos e introduce 19 → 119 brutos; el impuesto añadido es 19. Fórmula: neto × (1 + tasa / 100). No hay tasa predefinida. Selecciona Bruto, introduce la tasa y confirma con =. Neto vuelve a extraer el impuesto incluido.',
      taxOut: 'Extraer impuesto incluido: Calcula el importe neto a partir de un importe bruto que ya incluye impuestos. Ejemplo: 119 brutos e introduce 19 → 100 netos. Fórmula: bruto ÷ (1 + tasa / 100). ¡No equivale a un descuento del 19 %! Selecciona Neto, introduce la tasa incluida y confirma con =.',
      subtotal: 'Subtotal: Registra el resultado actual como un paso con nombre, sin modificarlo. Ejemplo: “Costes totales” después de materiales y envío. No requiere número. También se recalcula al modificar pasos anteriores. Selecciona Subtotal, añade un nombre opcional y confirma con =.',
      note: 'Nota: Añade una línea descriptiva al historial sin cambiar el resultado. Escribe en “Nombre del paso / nota”, por ejemplo “Oferta del proveedor”. No requiere número. Puedes editar, mover, desactivar o eliminar las notas. Confirma con =.'
    }
  },
  fr: {
    specials: 'Fonctions spéciales', current: 'Opération sélectionnée',
    labels: { set: 'Départ', increase: 'Majoration', discount: 'Remise', taxIn: 'Brut', taxOut: 'Net', subtotal: 'Sous-total', note: 'Note' },
    hints: {
      add: "Additionner : Ajoute le nombre saisi au résultat précédent. Exemple : 100 + 20 → 120. Les valeurs négatives sont également acceptées. Sélectionnez +, saisissez la valeur et confirmez avec =.",
      subtract: "Soustraire : Retire le nombre saisi du résultat précédent. Exemple : 100 − 20 → 80. Soustraire un nombre négatif augmente le résultat : 100 − (−20) → 120. Sélectionnez −, saisissez la valeur et confirmez avec =.",
      multiply: "Multiplier : Multiplie le résultat précédent par le nombre saisi. Exemple : 120 × 2 → 240. Chaque étape utilise le résultat précédent, sans priorité des opérateurs. Sélectionnez ×, saisissez le facteur et confirmez avec =.",
      divide: "Diviser : Divise le résultat précédent par le nombre saisi. Exemple : 120 ÷ 3 → 40. La division par zéro est impossible ; corrigez ou désactivez l’étape incorrecte. Sélectionnez ÷, saisissez le diviseur et confirmez avec =.",
      set: 'Valeur initiale / remplacer : Le nombre saisi devient le résultat courant. Les étapes précédentes restent dans l’historique mais ne sont pas ajoutées à cette valeur. Exemple : résultat précédent 80, saisissez 100 → résultat 100. Sélectionnez cette touche, saisissez la valeur et confirmez avec =.',
      increase: 'Majoration en pourcentage : Augmente le résultat précédent du pourcentage saisi. Exemple : 100 et saisissez 19 → 119. Formule : résultat précédent × (1 + pourcentage / 100). Pour les majorations générales ; utilisez Brut pour ajouter la taxe ; aucun taux n’est choisi automatiquement. Sélectionnez + %, saisissez le pourcentage et confirmez avec =.',
      discount: 'Remise en pourcentage : Réduit le résultat précédent du pourcentage saisi. Exemple : 200 et saisissez 10 → 180, soit une remise de 20. Formule : résultat précédent × (1 − pourcentage / 100). Chaque remise successive utilise le montant restant. Sélectionnez − %, saisissez le pourcentage et confirmez avec =.',
      taxIn: 'Brut / ajouter la taxe : Calcule le montant brut à partir du montant net précédent et du taux saisi. Exemple : 100 nets et saisissez 19 → 119 bruts ; la taxe ajoutée est 19. Formule : net × (1 + taux / 100). Aucun taux prédéfini. Sélectionnez Brut, saisissez le taux et confirmez avec =. Net extrait de nouveau la taxe incluse.',
      taxOut: 'Extraire la taxe incluse : Calcule le montant net à partir d’un montant brut contenant déjà la taxe. Exemple : 119 bruts et saisissez 19 → 100 nets. Formule : brut ÷ (1 + taux / 100). Ce n’est pas une remise de 19 % ! Sélectionnez Net, saisissez le taux inclus et confirmez avec =.',
      subtotal: 'Sous-total : Enregistre le résultat courant comme une étape nommée sans le modifier. Exemple : « Coûts totaux » après les matériaux et le transport. Aucun nombre nécessaire. Ce sous-total est recalculé si les étapes précédentes changent. Sélectionnez Sous-total, ajoutez éventuellement un nom et confirmez avec =.',
      note: 'Note : Ajoute une ligne descriptive à l’historique sans modifier le résultat. Saisissez le texte dans « Nom de l’étape / note », par exemple « Devis du fournisseur ». Aucun nombre nécessaire. Les notes peuvent être modifiées, déplacées, désactivées ou supprimées. Confirmez avec =.'
    }
  }
};
