import {languages} from '../lib/i18n';
export function GET(){return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+languages.map(l=>'<url><loc>https://clock.jacktools.net/'+l+'/</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml'}});}
