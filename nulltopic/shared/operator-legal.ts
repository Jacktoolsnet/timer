/** Registration evidence is separate from age/authority and browser/advertising consent.
 * Material document edits require a new version; never backfill historical agreement.
 */
export const operatorLegal = {
 terms: {version:'2026-11-10-operator-terms-1',path:'/operator/nutzungsbedingungen'},
 privacy: {version:'2026-11-10-operator-privacy-1',path:'/operator/datenschutz'},
} as const;
