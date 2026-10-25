/**
 * Embed mode: another app (the NBS portal) opens this app in a frame at
 *   #/embed?data=<text to encode>&origin=<that app's origin>&name=<label>&theme=dark|light
 * The user designs the code, then "Use this QR" sends the result back with postMessage.
 *
 * Messages (all carry `source`):
 *   this app → host  { source: 'qr-atelier', type: 'ready' }
 *   host → this app  { source: 'nbs-portal', type: 'init', design: unknown | null }
 *   this app → host  { source: 'qr-atelier', type: 'done', result: EmbedResult }
 *   this app → host  { source: 'qr-atelier', type: 'cancel' }
 */
import type { QrDesign } from '../types/design';

export const EMBED_SOURCE = 'qr-atelier';
export const HOST_SOURCE = 'nbs-portal';

export interface EmbedParams {
  data: string;
  origin: string;
  name: string;
  theme: 'light' | 'dark' | null;
}

export type EmbedScan = 'ok' | 'partial';

export interface EmbedResult {
  /** The exact text inside the code. */
  payload: string;
  svg: string;
  /** data:image/png;base64,… at 1024 px wide. */
  png: string;
  design: QrDesign;
  scan: EmbedScan;
}

/** Only plain http(s) origins: a message can only ever go to that exact site. */
function validOrigin(raw: string): string | null {
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === raw.replace(/\/+$/, '') ? u.origin : null;
  } catch {
    return null;
  }
}

export function readEmbedParams(hash = window.location.hash): EmbedParams | null {
  const m = /^#\/?embed(?:\?(.*))?$/.exec(hash);
  if (!m) return null;
  const q = new URLSearchParams(m[1] ?? '');
  const origin = validOrigin(q.get('origin') ?? '');
  const data = q.get('data') ?? '';
  if (!origin || !data) return null;
  const theme = q.get('theme');
  return { data, origin, name: (q.get('name') ?? '').slice(0, 120), theme: theme === 'dark' || theme === 'light' ? theme : null };
}

/** True when the hash asks for embed mode, even if its parameters are broken. */
export const wantsEmbed = (hash = window.location.hash): boolean => /^#\/?embed\b/.test(hash);

/** The window that opened us: the parent frame, or the opener of a popup. */
export function hostWindow(): Window | null {
  if (window.parent !== window) return window.parent;
  return window.opener instanceof Window ? window.opener : (window.opener as Window | null);
}

export function postToHost(params: EmbedParams, message: { type: 'ready' } | { type: 'cancel' } | { type: 'done'; result: EmbedResult }): void {
  hostWindow()?.postMessage({ source: EMBED_SOURCE, ...message }, params.origin);
}

export interface InitMessage {
  source: typeof HOST_SOURCE;
  type: 'init';
  design: unknown;
}

export function isInitMessage(e: MessageEvent, params: EmbedParams): e is MessageEvent<InitMessage> {
  if (e.origin !== params.origin || e.source !== hostWindow()) return false;
  const d = e.data as Partial<InitMessage> | null;
  return typeof d === 'object' && d !== null && d.source === HOST_SOURCE && d.type === 'init';
}
