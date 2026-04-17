// Screen manager. Each screen is a function that renders DOM into #screen-root and returns a cleanup function.

export type Screen = (root: HTMLElement) => void | (() => void);

let currentCleanup: (() => void) | null = null;

export function mount(screen: Screen): void {
  if (currentCleanup) { try { currentCleanup(); } catch {} }
  currentCleanup = null;
  const root = document.getElementById('screen-root');
  if (!root) return;
  root.innerHTML = '';
  const cleanup = screen(root);
  if (typeof cleanup === 'function') currentCleanup = cleanup;
}

export function htmlEl<T extends HTMLElement = HTMLElement>(html: string): T {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstElementChild as T;
}

export function el<T extends HTMLElement = HTMLElement>(tag: string, props: Partial<T & { class: string; text: string; html: string }> = {}, children: (HTMLElement | string)[] = []): T {
  const e = document.createElement(tag) as T;
  const anyProps = props as any;
  if (anyProps.class) (e as any).className = anyProps.class;
  if (anyProps.text) e.textContent = anyProps.text;
  if (anyProps.html) (e as any).innerHTML = anyProps.html;
  for (const k of Object.keys(props)) {
    if (['class','text','html'].includes(k)) continue;
    (e as any)[k] = (props as any)[k];
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}
