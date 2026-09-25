/** DOM side of the game: Sierra-style message boxes, overlay panels and the HUD. */

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface Msg { text: string; who?: string; then?: () => void }

const queue: Msg[] = [];
let current: Msg | null = null;
let openedAt = 0;
let onOpen: (() => void) | null = null;

export function setOnMessageOpen(fn: () => void) { onOpen = fn; }

export function say(text: string, who?: string, then?: () => void) {
  queue.push({ text, who, then });
  if (!current) next();
}

function next() {
  const m = queue.shift();
  const box = $('msg');
  if (!m) { current = null; box.hidden = true; return; }
  current = m;
  openedAt = performance.now();
  $('msg-who').textContent = m.who ?? '';
  $('msg-who').hidden = !m.who;
  $('msg-text').innerHTML = esc(m.text).replace(/\n/g, '<br>');
  box.hidden = false;
  onOpen?.();
}

export function dismiss(force = false) {
  if (!current) return false;
  if (!force && performance.now() - openedAt < 180) return true;
  const m = current;
  current = null;
  $('msg').hidden = true;
  m.then?.();
  if (!current) next();
  return true;
}

export const msgOpen = () => current !== null;

export function clearMessages() {
  queue.length = 0;
  current = null;
  $('msg').hidden = true;
}

export function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

// ---- panels ---------------------------------------------------------------------

let panelClose: (() => void) | null = null;

export function showPanel(html: string, bind?: (root: HTMLElement) => void, onClose?: () => void, wide = false) {
  const p = $('panel');
  p.innerHTML = `<div class="panel-inner${wide ? ' wide' : ''}">${html}</div>`;
  p.hidden = false;
  panelClose = onClose ?? null;
  bind?.(p);
  const f = p.querySelector<HTMLElement>('[autofocus]');
  f?.focus();
}

export function hidePanel() {
  const p = $('panel');
  if (p.hidden) return;
  p.hidden = true;
  p.innerHTML = '';
  const cb = panelClose;
  panelClose = null;
  cb?.();
}

export const panelOpen = () => !$('panel').hidden;

export function toast(text: string) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  window.clearTimeout((t as any)._h);
  (t as any)._h = window.setTimeout(() => (t.hidden = true), 2600);
}

export function meter(id: string, v: number, max: number) {
  const el = $(id);
  const pct = max > 0 ? Math.max(0, Math.min(100, (v / max) * 100)) : 0;
  (el.querySelector('i') as HTMLElement).style.width = pct + '%';
  (el.querySelector('b') as HTMLElement).textContent = max > 0 ? `${Math.ceil(v)}/${max}` : '—';
}
