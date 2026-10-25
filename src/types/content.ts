export type ContentType =
  | 'url'
  | 'text'
  | 'whatsapp'
  | 'wifi'
  | 'vcard'
  | 'email'
  | 'sms'
  | 'instagram'
  | 'youtube'
  | 'facebook';

export type WifiSecurity = 'WPA' | 'WEP' | 'nopass';
export type YoutubeMode = 'channel' | 'video';

export interface UrlContent {
  url: string;
}
export interface TextContent {
  text: string;
}
export interface WhatsappContent {
  countryCode: string;
  number: string;
  message: string;
}
export interface WifiContent {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}
export interface VcardContent {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  website: string;
  street: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
}
export interface EmailContent {
  to: string;
  subject: string;
  body: string;
}
export interface SmsContent {
  number: string;
  message: string;
}
export interface InstagramContent {
  username: string;
}
export interface YoutubeContent {
  mode: YoutubeMode;
  value: string;
}
export interface FacebookContent {
  page: string;
}

export interface ContentValues {
  url: UrlContent;
  text: TextContent;
  whatsapp: WhatsappContent;
  wifi: WifiContent;
  vcard: VcardContent;
  email: EmailContent;
  sms: SmsContent;
  instagram: InstagramContent;
  youtube: YoutubeContent;
  facebook: FacebookContent;
}

export interface ContentState {
  type: ContentType;
  values: ContentValues;
}

export interface PayloadResult {
  /** The exact string encoded into the QR code ('' when incomplete). */
  payload: string;
  /** Human readable reason when the payload is empty or invalid. */
  error: string | null;
}
