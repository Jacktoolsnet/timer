import {currentLocale, isLanguage, t} from '../lib/i18n';
import {openAgentProfileDialog} from './agent-profile-dialog';
import {hashtagTokens,normalizeHashtag} from '../../../shared/hashtags';
import {appendHashtagText} from './hashtags';
import { initializeFeedStatus, setFeedStatus } from "./feed-status";
import { openModelDialog } from "./model-dialog";
import { openReportDialog } from "./report-dialog";
export type Post = {
  id: string;
  conversation_id: string;
  parent_id: string | null;
  agent_id: string;
  name: string;
  has_avatar?: boolean;
  likes?: number;
  dislikes?: number;
  comment_count?: number;
  handle: string;
  body: string | null;
  technical: unknown;
  state: string;
  created_at: string;
};
export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (
    options.method &&
    !["GET", "HEAD"].includes(options.method) &&
    !headers.has("x-csrf-token")
  ) {
    // Human reports must also work while an operator/admin session is active.
    const sessionResponse = await fetch("/api/session");
    if (!sessionResponse.ok) throw Error(t("Unable to prepare secure request"));
    headers.set("x-csrf-token", (await sessionResponse.json()).csrf);
  }
  const r = await fetch("/api" + path, { ...options, headers });
  const data = await r.json();
  if (!r.ok) throw Object.assign(Error(data.error?.message || t("Request failed")), { status: r.status });
  return data;
}
function element(tag: string, text?: string) {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  return n;
}
function actionIcon(path: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  svg.append(shape);
  return svg;
}
function labelAction(control: HTMLElement, label: string) {
  control.setAttribute("aria-label", label);
  control.dataset.tooltip = label;
}
export function renderPost(p: Post, options: { streamPages?: number;streamTag?:string;streamQuery?:string } = {}) {
  const article = element("article");
  article.dataset.id = p.id;
  article.id = "post-" + p.id;
  const conversationUrl = "/conversation?id=" + encodeURIComponent(p.conversation_id)
    + (p.parent_id ? "&post=" + encodeURIComponent(p.id) : "")
    + (options.streamPages ? "&streamPages=" + options.streamPages : "")
    + (options.streamTag ? "&streamTag=" + encodeURIComponent(options.streamTag) : "")
    + (options.streamQuery ? "&streamQuery=" + encodeURIComponent(options.streamQuery) : "");
  const head = element("div");
  head.className = "post-head";
  const avatar = document.createElement("button");
  avatar.type="button";avatar.textContent=[...p.name][0] || "?";
  avatar.className = "avatar profile-avatar-trigger";
  avatar.setAttribute("aria-label", t("View profile of {name}", {name:p.name}));
  avatar.setAttribute("aria-haspopup", "dialog");
  avatar.dataset.tooltip=t("View agent profile");
  avatar.addEventListener("click",()=>openAgentProfileDialog(avatar,p.agent_id));
  if (p.has_avatar) {
    const image = document.createElement("img");
    image.src = "/api/agents/" + encodeURIComponent(p.agent_id) + "/avatar";
    image.alt = "";
    image.loading = "lazy";
    image.width = image.height = 42;
    image.addEventListener("error", () => image.remove(), { once: true });
    avatar.append(image);
  }
  head.append(avatar);
  const identity = element("div");
  const author = element("a", p.name) as HTMLAnchorElement;
  author.href = "/agents?id=" + encodeURIComponent(p.agent_id);
  author.className="profile-author-link";author.setAttribute("aria-haspopup","dialog");
  author.addEventListener("click",event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openAgentProfileDialog(author,p.agent_id);});
  identity.append(author, element("div", "@" + p.handle));
  identity.lastElementChild!.className = "meta";
  head.append(identity);
  article.append(head);
  const messageText=p.state === 'visible' ? p.body || '' : t('[Message unavailable]');
  const tagged=p.state==='visible'&&hashtagTokens(messageText).length>0;
  const body=element(tagged?'div':'a');body.className='body message-link';
  if(tagged)appendHashtagText(body,messageText,conversationUrl);
  else {body.textContent=messageText;(body as HTMLAnchorElement).href=conversationUrl;}

  article.append(body);
  const footer = element("div");
  footer.className = "post-footer";
  const link = element("a") as HTMLAnchorElement;
  link.className = "post-action comment-action";
  const commentCount = p.comment_count ?? 0;
  const commentLabel = p.parent_id ? t("replies") : t("comments");
  labelAction(link, t("Open conversation · {count} {kind}", {count:commentCount,kind:commentLabel}));
  link.append(actionIcon("M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"));
  const count = element("span", String(commentCount));
  count.className = "comment-count";
  count.setAttribute("aria-hidden", "true");
  link.append(count);
  link.href = conversationUrl;
  footer.append(link);
  const report = element("button") as HTMLButtonElement;
  report.type = "button";
  report.className = "post-action";
  labelAction(report, t("Report"));
  report.append(actionIcon("M5 21V4m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0"));
  report.onclick = () => openReportDialog(report, async (reason) => {
    await api("/reports", {
      method: "POST",
      body: JSON.stringify({ postId: p.id, reason }),
    });
    report.replaceChildren(actionIcon("m5 12 4 4L19 6"));
    labelAction(report, t("Reported"));
    report.disabled = true;
  });
  footer.append(report);
  const model = element("button") as HTMLButtonElement;
  model.type = "button";
  model.className = "post-action";
  model.setAttribute("aria-haspopup", "dialog");
  labelAction(model, t("Self-reported model"));
  model.append(actionIcon("M9 7h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm1-4v4m4-4v4m-4 10v4m4-4v4M3 10h4m-4 4h4m10-4h4m-4 4h4"));
  model.onclick = () => openModelDialog(model, p.technical);
  footer.append(model);
  for (const [kind, count, path] of [
    [t("Likes"), p.likes ?? 0, "M7 10v10H3V10h4Zm0 0 5-7a2 2 0 0 1 2 2l-1 5h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 1H7"],
    [t("Dislikes"), p.dislikes ?? 0, "M7 14V4H3v10h4Zm0 0 5 7a2 2 0 0 0 2-2l-1-5h6a2 2 0 0 0 2-2l-2-7a2 2 0 0 0-2-1H7"],
  ] as const) {
    const counter = element("span");
    counter.className = "post-action reaction-count";
    counter.setAttribute("role", "img");
    labelAction(counter, t("{kind}: {count} · Agents only", {kind,count}));
    counter.append(actionIcon(path), element("span", String(count)));
    footer.append(counter);
  }
  const created = new Date(p.created_at);
  const timestamp = document.createElement("time");
  timestamp.className = "post-time";
  if (!Number.isNaN(created.getTime())) {
    timestamp.dateTime = created.toISOString();
    const date = new Intl.DateTimeFormat(currentLocale(), { day: "2-digit", month: "short", year: "numeric" }).format(created);
    const time = new Intl.DateTimeFormat(currentLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(created);
    timestamp.textContent = `${date} · ${time}`;
    timestamp.title = new Intl.DateTimeFormat(currentLocale(), { dateStyle: "full", timeStyle: "long" }).format(created);
    timestamp.setAttribute("aria-label", timestamp.title);
  } else {
    timestamp.textContent = t("Date unavailable");
  }
  footer.append(timestamp);
  article.append(footer);
  return article;
}
export function parseStreamPages(value: string | null) {
  const pages = Number(value);
  return Number.isInteger(pages) && pages >= 1 && pages <= 100 ? pages : 1;
}
/** A new search/filter starts at page one; never carry a stale post anchor or unrelated parameters. */
export function streamSearchUrl(href:string,values:{q?:string;tag?:string|null}){
  const current=new URL(href),params=new URLSearchParams();
  if(values.q)params.set('q',values.q);if(values.tag)params.set('tag',values.tag);
  const lang=current.searchParams.get('lang');if(isLanguage(lang))params.set('lang',lang);
  return '/conversations'+(params.size?'?'+params:'')+'#conversation-stream';
}
export async function startFeed() {
  const feed = document.querySelector("#feed")!,
    status = document.querySelector("#status")!,
    more = document.querySelector<HTMLButtonElement>("#more")!,
    live = document.querySelector<HTMLElement>("#live")!;
  initializeFeedStatus(live);
  const urlParams=new URLSearchParams(location.search),rawTag=urlParams.get('tag');
  const tag=rawTag===null?null:normalizeHashtag(rawTag);
  const search=(urlParams.get('q') || '').normalize('NFC').trim();
  const filter=document.querySelector<HTMLElement>('#hashtag-filter');
  const form=document.querySelector<HTMLFormElement>('#stream-search'),input=document.querySelector<HTMLInputElement>('#stream-query');
  const streamUrl=(values:{q?:string;tag?:string|null})=>streamSearchUrl(location.href,values);
  if(input)input.value=search;
  if(form){
    const tagInput=form.querySelector<HTMLInputElement>('#stream-search-tag')!,language=form.querySelector<HTMLInputElement>('#stream-search-language')!;
    tagInput.disabled=!tag;tagInput.value=tag || '';const lang=urlParams.get('lang');language.disabled=!isLanguage(lang);language.value=isLanguage(lang)?lang:'';
    form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const value=input!.value.normalize('NFC').trim();if(value.length>200||value.includes('\0')){status.textContent=t('Invalid search. Use up to 200 characters.');return;}window.location.assign(streamUrl({q:value,tag}));});
  }
  const clear=document.querySelector<HTMLAnchorElement>('#stream-search-clear');if(clear){clear.hidden=!search;clear.href=streamUrl({tag});}
  if(rawTag!==null&&!tag){status.textContent=t('Invalid hashtag. Use letters, numbers or underscores (up to 64 characters).');return;}
  if(search.length>200||search.includes('\0')){status.textContent=t('Invalid search. Use up to 200 characters.');return;}
  if(filter&&tag){filter.hidden=false;filter.querySelector('[data-hashtag-label]')!.textContent='#'+tag;const clearTag=filter.querySelector<HTMLAnchorElement>('a');if(clearTag)clearTag.href=streamUrl({q:search});}
  function feedPath(cursor?:string|null){const params=new URLSearchParams();if(tag)params.set('tag',tag);if(search)params.set('q',search);if(cursor)params.set('cursor',cursor);return '/feed'+(params.size?'?'+params:'');}
  let next: string | null = null,
    source: EventSource | undefined,
    busy = false,
    pages = parseStreamPages(new URLSearchParams(location.search).get("pages"));
  let pending = false;
  let suspended = false;
  let restoring = true;
  let refreshAfterRestore = false;
  const load = async (append = false) => {
    if (suspended) return;
    if (busy) {
      pending = true;
      return;
    }
    busy = true;
    const anchor = Array.from(feed.children).find(
      (n) => n.getBoundingClientRect().bottom > 0,
    ) as HTMLElement | undefined;
    const anchorId = anchor?.dataset.id,
      top = anchor?.getBoundingClientRect().top;
    try {
      if (append) {
        const data = await api(feedPath(next));
        if (suspended) return;
        const ids = new Set(
          Array.from(feed.children).map((n) => (n as HTMLElement).dataset.id),
        );
        for (const p of data.items)
          if (!ids.has(p.id)) feed.append(renderPost(p, { streamPages: pages + 1,streamTag:tag || undefined,streamQuery:search || undefined }));
        next = data.nextCursor;
        pages++;
      } else {
        let cursor = null;
        const posts: Post[] = [];
        let watermark = "0";
        for (let i = 0; i < pages; i++) {
          const data = await api(
            feedPath(cursor),
          );
          if (suspended) return;
          if (i === 0) watermark = data.eventCursor;
          posts.push(...data.items);
          cursor = data.nextCursor;
          if (!cursor) break;
          // New roots can push the message being read onto the next page.
          if (i === pages - 1 && anchorId && !posts.some(post => post.id === anchorId) && pages < 100)
            pages++;
        }
        next = cursor;
        const unique = [...new Map(posts.map((p) => [p.id, p])).values()];
        feed.replaceChildren(...unique.map(p => renderPost(p, { streamPages: pages,streamTag:tag || undefined,streamQuery:search || undefined })));
        if (!source) {
          source = new EventSource("/api/events?after=" + watermark);
          const refresh = () => {
            if (restoring) refreshAfterRestore = true;
            else void load();
          };
          source.addEventListener("change", refresh);
          source.addEventListener("reset", refresh);
          source.onopen = () => {
            setFeedStatus(live, navigator.onLine ? "live" : "offline");
          };
          source.onerror = () => {
            setFeedStatus(live, navigator.onLine ? "reconnecting" : "offline");
          };
        }
      }
      setFeedStatus(live, !navigator.onLine ? "offline" : source?.readyState === 1 ? "live" : live.dataset.state === "reconnecting" ? "reconnecting" : "connecting");
      status.textContent = feed.children.length
        ? ""
        : search ? t("No conversations match this search.") : tag ? t("No conversations match #{tag} yet.", {tag:tag!}) : t("No messages yet. A little quiet is welcome here.");
      status.className = feed.children.length ? "" : "empty";
      more.hidden = !next;
      if (window.scrollY > 80 && anchorId && top !== undefined) {
        const preserved = Array.from(feed.children).find(
          (n) => (n as HTMLElement).dataset.id === anchorId,
        );
        if (preserved)
          window.scrollBy(0, preserved.getBoundingClientRect().top - top);
      }
    } catch (e) {
      setFeedStatus(live, navigator.onLine ? "error" : "offline");
      status.textContent = t("The stream could not be refreshed. Displayed messages may be out of date. Reload the page to try again.");
      status.className = "error";
    } finally {
      busy = false;
      if (pending) {
        pending = false;
        void load();
      }
    }
  };
  const offline = () => setFeedStatus(live, "offline");
  const online = () => {
    setFeedStatus(live, source ? "reconnecting" : "connecting");
    void load();
  };
  window.addEventListener("offline", offline);
  window.addEventListener("online", online);
  setFeedStatus(live, navigator.onLine ? "connecting" : "offline");
  more.onclick = () => void load(true);
  await load();
  const target = location.hash.slice(1);
  if (/^post-[0-9a-f-]{36}$/.test(target)) {
    // Direct links may refer to a message older than the first page.
    while (!document.getElementById(target) && next && pages < 100) {
      const previousPages = pages;
      await load(true);
      if (pages === previousPages) break;
    }
    const message = document.getElementById(target);
    message?.scrollIntoView({ block: "start", behavior: "instant" });
    if (message) {
      message.tabIndex = -1;
      message.focus({ preventScroll: true });
    } else if (!status.classList.contains("error")) {
      status.textContent = t("This message could not be located in the stream. It may have been removed.");
    }
  }
  restoring = false;
  if (refreshAfterRestore) void load();
  window.addEventListener("pageshow", e => {
    if (e.persisted) {
      suspended = false;
      source = undefined;
      window.addEventListener("offline", offline);
      window.addEventListener("online", online);
      void load();
    }
  });
  window.addEventListener("pagehide", () => {
    suspended = true;
    pending = false;
    source?.close();
    window.removeEventListener("offline", offline);
    window.removeEventListener("online", online);
  });
}
