import type { Document, Operation } from './calculation';
import type { Language } from './i18n';
export const exampleIds = ['family','holiday','craft'] as const;
export type ExampleId = typeof exampleIds[number];
const seeds: Record<ExampleId, readonly (readonly [Operation,string])[]> = {
 family: [['set','3200'],['add','1800'],['add','300'],['subtract','1450'],['subtract','240'],['subtract','800'],['subtract','400'],['subtract','180'],['subtract','90'],['subtract','220'],['subtract','500']],
 holiday: [['set','4000'],['subtract','950'],['subtract','1400'],['subtract','600'],['subtract','250'],['subtract','80'],['subtract','120'],['subtract','300']],
 craft: [['set','36'],['multiply','65'],['subtotal','0'],['add','850'],['add','80'],['discount','5'],['taxIn','19']],
};
interface Example {title:string;description:string;names:readonly string[]}
export const exampleDefinitions: Record<Language,Record<ExampleId,Example>> = {
 de: {
  family:{title:'Familienbudget · ein Monat',description:'Einnahmen und laufende Ausgaben einer fiktiven Familie: Was bleibt nach Miete, Alltag und Rücklagen übrig?',names:['Nettoeinkommen Person 1','Nettoeinkommen Person 2','Weitere Einnahmen · Beispiel','Miete und Nebenkosten','Strom und Heizung','Lebensmittel und Haushalt','Mobilität','Versicherungen','Telefon und Internet','Freizeit und Kleidung','Rücklage / Sparen']},
  holiday:{title:'Urlaubsplanung',description:'Vom Reisebudget bis zur Reserve: Fahrt, Unterkunft, Verpflegung und Aktivitäten übersichtlich abziehen.',names:['Verfügbares Reisebudget','An- und Abreise','Unterkunft','Verpflegung','Ausflüge und Aktivitäten','Reiseversicherung · Beispiel','Nahverkehr vor Ort','Reserve für Unvorhergesehenes']},
  craft:{title:'Handwerkerrechnung · Beispiel',description:'36 Arbeitsstunden zum Beispiel-Stundensatz, Material, Anfahrt, Rabatt und Steuer bis zum Bruttobetrag.',names:['Arbeitsstunden','Stundensatz · 65 € je Stunde','Arbeitskosten gesamt','Materialkosten netto','Anfahrt netto','Rabatt · Beispiel','Steuer · beispielhaft 19 %']},
 },
 en: {
  family:{title:'Family budget · one month',description:'Income and regular expenses for a fictional family: what remains after housing, everyday spending and savings?',names:['Net income person 1','Net income person 2','Other income · example','Rent and service charges','Electricity and heating','Groceries and household','Transport','Insurance','Phone and internet','Leisure and clothing','Savings / reserve']},
  holiday:{title:'Holiday planning',description:'From a travel budget to a contingency reserve: deduct travel, accommodation, food and activities.',names:['Available holiday budget','Travel to and from destination','Accommodation','Food','Trips and activities','Travel insurance · example','Local transport','Contingency reserve']},
  craft:{title:'Tradesperson invoice · example',description:'36 hours at an illustrative hourly rate, materials, travel, discount and tax through to the gross total.',names:['Working hours','Hourly rate · €65 per hour','Total labour cost','Net materials cost','Net travel cost','Discount · example','Tax · illustrative 19 %']},
 },
 es: {
  family:{title:'Presupuesto familiar · un mes',description:'Ingresos y gastos habituales de una familia ficticia: ¿qué queda tras la vivienda, el día a día y el ahorro?',names:['Ingresos netos persona 1','Ingresos netos persona 2','Otros ingresos · ejemplo','Alquiler y gastos comunes','Electricidad y calefacción','Alimentación y hogar','Transporte','Seguros','Teléfono e internet','Ocio y ropa','Ahorro / reserva']},
  holiday:{title:'Planificación de vacaciones',description:'Del presupuesto a la reserva: resta transporte, alojamiento, comida y actividades.',names:['Presupuesto disponible','Viaje de ida y vuelta','Alojamiento','Comida','Excursiones y actividades','Seguro de viaje · ejemplo','Transporte local','Reserva para imprevistos']},
  craft:{title:'Factura de un profesional · ejemplo',description:'36 horas a una tarifa ilustrativa, materiales, desplazamiento, descuento e impuesto hasta el total bruto.',names:['Horas de trabajo','Tarifa · 65 € por hora','Coste total de mano de obra','Materiales netos','Desplazamiento neto','Descuento · ejemplo','Impuesto · 19 % ilustrativo']},
 },
 fr: {
  family:{title:'Budget familial · un mois',description:'Revenus et dépenses courantes d’une famille fictive : que reste-t-il après le logement, le quotidien et l’épargne ?',names:['Revenu net personne 1','Revenu net personne 2','Autres revenus · exemple','Loyer et charges','Électricité et chauffage','Alimentation et ménage','Transport','Assurances','Téléphone et internet','Loisirs et vêtements','Épargne / réserve']},
  holiday:{title:'Préparer les vacances',description:'Du budget à la réserve : déduire le transport, le logement, les repas et les activités.',names:['Budget disponible','Voyage aller-retour','Hébergement','Repas','Excursions et activités','Assurance voyage · exemple','Transports locaux','Réserve pour imprévus']},
  craft:{title:'Facture d’artisan · exemple',description:'36 heures à un tarif illustratif, matériaux, déplacement, remise et taxe jusqu’au montant brut.',names:['Heures de travail','Tarif · 65 € par heure','Coût total de main-d’œuvre','Matériaux hors taxe','Déplacement hors taxe','Remise · exemple','Taxe · 19 % à titre d’exemple']},
 },
};
export const exampleUi: Record<Language,{title:string;notice:string;load:string;replace:string}> = {
 de:{title:'Beispielrechnungen',notice:'Alle Beträge sind frei erfundene Beispiele in Euro, keine statistischen Durchschnittswerte. Die Handwerkerrechnung ist eine Rechenvorlage, kein vollständiges Rechnungsdokument. Jeder Schritt ist anschließend frei bearbeitbar.',load:'Beispiel laden',replace:'Die aktuelle Rechnung und offene Eingaben durch dieses Beispiel ersetzen? Die bisherige Rechnung lässt sich danach mit „Rückgängig“ wiederherstellen.'},
 en:{title:'Example calculations',notice:'All amounts are fictional examples in euros, not statistical averages. The tradesperson example is a calculation template, not a complete invoice document. Every step can be edited after loading.',load:'Load example',replace:'Replace the current calculation and draft entries with this example? You can restore the previous calculation with Undo afterwards.'},
 es:{title:'Cálculos de ejemplo',notice:'Todos los importes son ejemplos ficticios en euros, no promedios estadísticos. El ejemplo profesional es una plantilla de cálculo, no una factura completa. Todos los pasos se pueden editar.',load:'Cargar ejemplo',replace:'¿Reemplazar el cálculo actual y los datos sin confirmar por este ejemplo? Puedes recuperar el cálculo anterior con Deshacer.'},
 fr:{title:'Exemples de calcul',notice:'Tous les montants sont des exemples fictifs en euros, pas des moyennes statistiques. L’exemple d’artisan est un modèle de calcul, pas une facture complète. Chaque étape est modifiable.',load:'Charger l’exemple',replace:'Remplacer le calcul actuel et les saisies non confirmées par cet exemple ? Vous pourrez restaurer le calcul précédent avec Annuler l’action.'},
};
export function buildExample(lang:Language,id:ExampleId):Document {
 const definition=exampleDefinitions[lang][id];
 return {version:1,title:definition.title,decimals:2,roundEach:true,steps:seeds[id].map(([operation,value],index)=>({id:`example-${id}-${index}`,operation,value,name:definition.names[index],enabled:true}))};
}
