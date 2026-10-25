import type {
  ContentState,
  ContentValues,
  EmailContent,
  FacebookContent,
  InstagramContent,
  PayloadResult,
  SmsContent,
  UrlContent,
  VcardContent,
  WhatsappContent,
  WifiContent,
  YoutubeContent,
} from '../types/content';

export const DEFAULT_CONTENT_VALUES: ContentValues = {
  url: { url: 'https://example.com' },
  text: { text: '' },
  whatsapp: { countryCode: '964', number: '', message: '' },
  wifi: { ssid: '', password: '', security: 'WPA', hidden: false },
  vcard: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    company: '',
    title: '',
    website: '',
    street: '',
    city: '',
    region: '',
    postcode: '',
    country: '',
  },
  email: { to: '', subject: '', body: '' },
  sms: { number: '', message: '' },
  instagram: { username: '' },
  youtube: { mode: 'channel', value: '' },
  facebook: { page: '' },
};

export const DEFAULT_CONTENT: ContentState = { type: 'url', values: DEFAULT_CONTENT_VALUES };

const ok = (payload: string): PayloadResult => ({ payload, error: null });
const fail = (error: string): PayloadResult => ({ payload: '', error });

const digits = (s: string): string => s.replace(/[^\d]/g, '');
const hasScheme = (s: string): boolean => /^[a-z][a-z\d+\-.]*:/i.test(s);

export function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  return hasScheme(s) ? s : `https://${s}`;
}

/** Strips a leading @ and any surrounding URL to get a bare handle. */
function handleFrom(raw: string, hostPattern: RegExp): string {
  let s = raw.trim();
  const m = s.match(hostPattern);
  if (m) s = m[1] ?? '';
  return s.replace(/^@/, '').replace(/[/?#].*$/, '');
}

function encodeUrlContent(c: UrlContent): PayloadResult {
  const url = normalizeUrl(c.url);
  if (!url) return fail('Enter a website address.');
  return ok(url);
}

function encodeWhatsapp(c: WhatsappContent): PayloadResult {
  const number = digits(c.countryCode) + digits(c.number).replace(/^0+/, '');
  if (digits(c.number).length < 4) return fail('Enter the WhatsApp phone number.');
  const text = c.message.trim();
  return ok(`https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
}

/** WiFi payload special characters must be backslash-escaped. */
const escapeWifi = (s: string): string => s.replace(/([\\;,:"])/g, '\\$1');

function encodeWifi(c: WifiContent): PayloadResult {
  if (!c.ssid.trim()) return fail('Enter the network name (SSID).');
  if (c.security !== 'nopass' && !c.password) return fail('Enter the network password, or choose "No password".');
  const parts = [`T:${c.security}`, `S:${escapeWifi(c.ssid)}`];
  if (c.security !== 'nopass') parts.push(`P:${escapeWifi(c.password)}`);
  if (c.hidden) parts.push('H:true');
  return ok(`WIFI:${parts.join(';')};;`);
}

/** vCard text values escape backslash, comma, semicolon and newlines. */
const escapeVcard = (s: string): string =>
  s.trim().replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

function encodeVcard(c: VcardContent): PayloadResult {
  const first = escapeVcard(c.firstName);
  const last = escapeVcard(c.lastName);
  if (!first && !last && !c.company.trim()) return fail('Enter a name or company.');
  const fullName = [c.firstName.trim(), c.lastName.trim()].filter(Boolean).join(' ') || c.company.trim();
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${last};${first};;;`, `FN:${escapeVcard(fullName)}`];
  if (c.company.trim()) lines.push(`ORG:${escapeVcard(c.company)}`);
  if (c.title.trim()) lines.push(`TITLE:${escapeVcard(c.title)}`);
  if (c.phone.trim()) lines.push(`TEL;TYPE=CELL:${c.phone.trim().replace(/[^\d+]/g, '')}`);
  if (c.email.trim()) lines.push(`EMAIL:${c.email.trim()}`);
  if (c.website.trim()) lines.push(`URL:${normalizeUrl(c.website)}`);
  const adr = [c.street, c.city, c.region, c.postcode, c.country].map(escapeVcard);
  if (adr.some(Boolean)) lines.push(`ADR;TYPE=WORK:;;${adr.join(';')}`);
  lines.push('END:VCARD');
  return ok(lines.join('\r\n'));
}

function encodeEmail(c: EmailContent): PayloadResult {
  const to = c.to.trim();
  if (!to) return fail('Enter the recipient email address.');
  const params: string[] = [];
  if (c.subject.trim()) params.push(`subject=${encodeURIComponent(c.subject.trim())}`);
  if (c.body.trim()) params.push(`body=${encodeURIComponent(c.body.trim())}`);
  return ok(`mailto:${to}${params.length ? `?${params.join('&')}` : ''}`);
}

function encodeSms(c: SmsContent): PayloadResult {
  const number = c.number.trim().replace(/[^\d+]/g, '');
  if (number.length < 3) return fail('Enter the phone number.');
  return ok(`SMSTO:${number}:${c.message.trim()}`);
}

function encodeInstagram(c: InstagramContent): PayloadResult {
  const handle = handleFrom(c.username, /instagram\.com\/([^/?#]+)/i);
  if (!handle) return fail('Enter an Instagram username.');
  return ok(`https://instagram.com/${handle}`);
}

function encodeYoutube(c: YoutubeContent): PayloadResult {
  const v = c.value.trim();
  if (!v) return fail(c.mode === 'channel' ? 'Enter a channel handle or link.' : 'Enter a video link or ID.');
  if (/^https?:\/\//i.test(v) || /^(www\.)?(youtube\.com|youtu\.be)\//i.test(v)) return ok(normalizeUrl(v));
  if (c.mode === 'channel') return ok(`https://youtube.com/@${v.replace(/^@/, '')}`);
  return ok(`https://youtu.be/${v}`);
}

function encodeFacebook(c: FacebookContent): PayloadResult {
  const page = handleFrom(c.page, /facebook\.com\/(.+)$/i);
  if (!page) return fail('Enter a Facebook page name or link.');
  return ok(`https://facebook.com/${page}`);
}

export function encodeContent(state: ContentState): PayloadResult {
  const v = state.values;
  switch (state.type) {
    case 'url':
      return encodeUrlContent(v.url);
    case 'text':
      return v.text.text.trim() ? ok(v.text.text) : fail('Type the text to encode.');
    case 'whatsapp':
      return encodeWhatsapp(v.whatsapp);
    case 'wifi':
      return encodeWifi(v.wifi);
    case 'vcard':
      return encodeVcard(v.vcard);
    case 'email':
      return encodeEmail(v.email);
    case 'sms':
      return encodeSms(v.sms);
    case 'instagram':
      return encodeInstagram(v.instagram);
    case 'youtube':
      return encodeYoutube(v.youtube);
    case 'facebook':
      return encodeFacebook(v.facebook);
  }
}
