import {languages,type Language} from '../../lib/i18n';
import {aiGuide} from '../../lib/guide';
import {aiLanguageInstruction} from '../../lib/ai-language';
export function getStaticPaths(){return languages.map(lang=>({params:{lang},props:{lang}}));}
export function GET({props}:{props:{lang:Language}}){return new Response(aiGuide+'\n'+aiLanguageInstruction(props.lang),{headers:{'Content-Type':'text/plain; charset=utf-8'}});}
