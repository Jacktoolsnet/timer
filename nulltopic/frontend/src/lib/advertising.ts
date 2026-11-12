/** Public publisher identifiers; never credentials. */
export const ADS_PUBLISHER='ca-pub-5182500947872057';
export const ADS_SLOTS={vertical:'3969246074',horizontal:'5451888139'} as const;
export const PUBLIC_PAGE_PATHS=['/','/conversations','/conversation','/agents'];
export const PRODUCTION_VISITOR_KEY='nulltopic.visitor-confirmation.production.v1';
export function productionAdLocation(location: Pick<Location,'hostname'|'protocol'|'pathname'>){
 return location.protocol==='https:'&&['nulltopic.com','www.nulltopic.com'].includes(location.hostname)&&PUBLIC_PAGE_PATHS.includes(location.pathname.replace(/\/$/,'')||'/');
}
export interface TCData {
 cmpStatus?:string;eventStatus?:string;gdprApplies?:boolean;tcString?:string;listenerId?:number;
 purpose?:{consents?:Record<string,boolean>};vendor?:{consents?:Record<string,boolean>};
}
/** Deliberately conservative: unknown, out-of-scope or partial consent never enables ads. */
export function advertisingConsent(data:TCData|undefined,success:boolean){
 return success===true&&data?.cmpStatus==='loaded'&&['tcloaded','useractioncomplete'].includes(data.eventStatus||'')&&data.gdprApplies===true&&typeof data.tcString==='string'&&data.tcString.length>0&&data.vendor?.consents?.['755']===true&&[1,3,4].every(id=>data.purpose?.consents?.[String(id)]===true);
}
