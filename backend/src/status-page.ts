import {randomBytes} from 'node:crypto';
export function statusPage(databaseConnected:boolean){
 const nonce=randomBytes(18).toString('base64');
 const heading=databaseConnected?'All systems operational':'Service needs attention';
 const database=databaseConnected?'Database connection established':'Database temporarily unavailable';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="15">'+
 '<meta name="color-scheme" content="light dark"><title>JackTools Backend · Service status</title>'+
 '<style nonce="'+nonce+'">'+
 ':root{color-scheme:light dark;--bg:#f3f6ef;--surface:#fff;--text:#243b40;--muted:#65726c;--line:#dbe4d6;--accent:#567d3e;--soft:#eaf1e3;--warning:#a64e21;--warning-soft:#fff0e5}'+
 '*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:28px 18px;background:radial-gradient(ellipse at top,var(--soft),var(--bg) 65%);color:var(--text);font:16px/1.6 system-ui,sans-serif}'+
 'main{width:100%;max-width:760px}.brand{display:flex;align-items:center;gap:12px;color:var(--accent);font-weight:700;letter-spacing:.04em;margin-bottom:28px}.brand svg{width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}'+
 '.panel{padding:clamp(24px,5vw,44px);border:1px solid var(--line);border-radius:24px;background:var(--surface);box-shadow:0 20px 70px #243b400c}'+
 '.eyebrow{font-size:.75rem;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);margin:0 0 10px}h1{font-size:clamp(1.6rem,5vw,2.4rem);line-height:1.2;letter-spacing:-.035em;margin:0 0 24px}'+
 '.overall{display:inline-flex;align-items:center;gap:9px;padding:7px 13px;border-radius:99px;background:var(--soft);color:var(--accent);font-size:.85rem;font-weight:650;margin-bottom:28px}'+
 '.dot{display:inline-block;flex:0 0 9px;width:9px;height:9px;border-radius:50%;background:currentColor}.checks{display:grid;gap:12px;margin:0}.check{padding:18px 20px;border:1px solid var(--line);border-radius:14px}.check dt{font-size:.8rem;color:var(--muted);margin-bottom:6px}.check dd{display:flex;align-items:center;gap:10px;color:var(--accent);margin:0;font-weight:600;overflow-wrap:anywhere}'+
 '.unavailable dd,.overall.warning{color:var(--warning)}.overall.warning{background:var(--warning-soft)}.note{font-size:.85rem;color:var(--muted);margin:24px 0 0}footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px;font-size:.85rem;color:var(--muted)}a{color:var(--accent);text-underline-offset:4px}a:focus-visible{outline:2px solid var(--accent);outline-offset:5px}'+
 '@media(prefers-color-scheme:dark){:root{--bg:#141d19;--surface:#1d2923;--text:#e3eade;--muted:#a6b4a8;--line:#35483a;--accent:#b2d191;--soft:#293e2b;--warning:#ffc09a;--warning-soft:#493227}}'+
 '@media(max-width:420px){.panel{border-radius:18px}.check{padding:15px}}'+
 '</style></head><body><main><div class="brand"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>JACKTOOLS.NET</div>'+
 '<section class="panel" aria-labelledby="heading"><p class="eyebrow">Backend · Service status</p><h1 id="heading">A little peace of mind.</h1>'+
 '<div class="overall'+(databaseConnected?'':' warning')+'"><span class="dot" aria-hidden="true"></span>'+heading+'</div>'+
 '<dl class="checks"><div class="check"><dt>Application server</dt><dd><span class="dot" aria-hidden="true"></span>Server is running</dd></div>'+
 '<div class="check'+(databaseConnected?'':' unavailable')+'"><dt>PostgreSQL</dt><dd><span class="dot" aria-hidden="true"></span>'+database+'</dd></div></dl>'+
 '<p class="note">'+(databaseConnected?'The backend is ready to handle requests.':'Database-dependent features may be unavailable. Please try again shortly.')+'</p></section>'+
 '<footer><span>Automatically checked every 15 seconds.</span><a href="https://jacktools.net/" rel="noreferrer">Back to JackTools ↗</a></footer></main></body></html>';
 return {html,policy:"default-src 'none'; style-src 'nonce-"+nonce+"'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
}
