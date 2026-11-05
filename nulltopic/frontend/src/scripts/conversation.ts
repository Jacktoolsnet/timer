import {api, renderPost, parseStreamPages, type Post} from './client';

export function conversationBackUrl(threadId: string, selected: Post, pages: number) {
  if (!selected.parent_id) return '/?pages=' + pages + '#post-' + selected.id;
  const params = new URLSearchParams({ id: threadId, streamPages: String(pages) });
  if (selected.parent_id !== threadId) params.set('post', selected.parent_id);
  return '/conversation?' + params + '#post-' + selected.id;
}

export function renderConversation(rows: Post[], root: HTMLElement, comments: HTMLElement, streamPages = 1, selectedId?: string) {
  const original = rows.find(post => selectedId ? post.id === selectedId : post.parent_id === null);
  if (!original) throw Object.assign(Error('Message unavailable'), { status: 404 });
  const card = renderPost(original, { streamPages });
  card.classList.add('original-post');
  // The message is already open; its text need not link back to this same page.
  const message = card.querySelector<HTMLAnchorElement>('.message-link')!;
  const text = document.createElement('div');
  text.className = 'body';
  text.textContent = message.textContent;
  message.replaceWith(text);
  const children = new Map<string, string[]>();
  for (const post of rows) {
    if (post.parent_id) children.set(post.parent_id, [...(children.get(post.parent_id) || []), post.id]);
  }
  const descendants = new Set<string>();
  const queue = [...(children.get(original.id) || [])];
  while (queue.length) {
    const child = queue.pop()!;
    if (descendants.has(child)) continue;
    descendants.add(child);
    queue.push(...(children.get(child) || []));
  }
  // Root overview includes the complete conversation; a comment opens only its
  // immediate replies, matching that comment's public comment_count.
  const replies = rows.filter(post => original.parent_id === null
    ? descendants.has(post.id)
    : post.parent_id === original.id);
  root.replaceChildren(card);
  comments.replaceChildren(...replies.map(post => {
    const reply = renderPost(post, { streamPages });
    if (post.parent_id && post.parent_id !== original.id) {
      const context = document.createElement('a');
      context.className = 'reply-context';
      context.href = '#post-' + post.parent_id;
      context.textContent = 'Reply to a comment ↑';
      reply.prepend(context);
    }
    return reply;
  }));
  return { id: original.id, count: replies.length };
}

export async function startConversation() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const selectedId = params.get('post') || undefined;
  let initialScrollDone = false;
  const pages = parseStreamPages(params.get('streamPages'));
  const status = document.querySelector<HTMLElement>('#status')!;
  const root = document.querySelector<HTMLElement>('#original-message')!;
  const comments = document.querySelector<HTMLElement>('#conversation')!;
  const section = document.querySelector<HTMLElement>('.conversation-comments')!;
  const back = document.querySelector<HTMLAnchorElement>('#back-to-stream')!;
  let source: EventSource | undefined, busy = false, pending = false, disposed = false;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || (selectedId && !/^[0-9a-f-]{36}$/i.test(selectedId))) {
    status.textContent = 'This conversation link is invalid. Return to the stream to find a message.';
    return;
  }
  const load = async () => {
    if (disposed) return;
    if (busy) { pending = true; return; }
    busy = true;
    try {
      const rows: Post[] = await api('/conversations/' + encodeURIComponent(id));
      if (disposed) return;
      // Keep the visible message stable when only counts/comments change.
      const anchor = [...comments.children].find(n => n.getBoundingClientRect().bottom > 0) as HTMLElement | undefined;
      const anchorId = anchor?.id, top = anchor?.getBoundingClientRect().top;
      const result = renderConversation(rows, root, comments, pages, selectedId);
      const selected = rows.find(post => post.id === result.id)!;
      back.href = conversationBackUrl(id, selected, pages);
      const backLabel = selected.parent_id ? 'Back to parent message' : 'Back to stream';
      back.setAttribute('aria-label', backLabel);
      back.dataset.tooltip = backLabel;
      document.querySelector('#comment-count')!.textContent = `(${result.count})`;
      (document.querySelector('#comments-empty') as HTMLElement).hidden = result.count !== 0;
      section.hidden = false;
      status.textContent = '';
      status.className = '';
      if (!initialScrollDone) {
        initialScrollDone = true;
        const target = location.hash.slice(1);
        if (/^post-[0-9a-f-]{36}$/i.test(target)) {
          const message = document.getElementById(target);
          message?.scrollIntoView({ block: 'start', behavior: 'instant' });
          if (message) { message.tabIndex = -1; message.focus({ preventScroll: true }); }
        }
      } else if (window.scrollY > 80 && anchorId && top !== undefined) {
        const preserved = document.getElementById(anchorId);
        if (preserved) window.scrollBy(0, preserved.getBoundingClientRect().top - top);
      }
    } catch (error) {
      if (disposed) return;
      if ((error as { status?: number })?.status === 404) {
        root.replaceChildren();
        comments.replaceChildren();
        section.hidden = true;
        status.className = 'error';
        status.textContent = 'This conversation is no longer available. Return to the stream to find another message.';
        return;
      }
      status.className = 'error';
      status.textContent = root.children.length
        ? 'Unable to refresh this conversation. Displayed messages may be out of date.'
        : 'Unable to load this conversation. It may have been removed. Please try again or return to the stream.';
    } finally {
      busy = false;
      if (pending) { pending = false; void load(); }
    }
  };
  const connect = async () => {
    try {
      const initial = await api('/feed');
      await load();
      if (disposed) return;
      source = new EventSource('/api/events?after=' + initial.eventCursor);
      source.addEventListener('change', () => void load());
      source.addEventListener('reset', () => void load());
    } catch { await load(); }
  };
  window.addEventListener('pagehide', () => { disposed = true; source?.close(); });
  window.addEventListener('pageshow', e => { if (e.persisted) { disposed = false; void connect(); } });
  await connect();
}
