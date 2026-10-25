import { Camera, Info, Contact, Link2, Mail, MessageCircle, MessageSquareText, PlaySquare, ThumbsUp, Type, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ContentState, ContentType, ContentValues } from '../../types/content';
import { cx } from '../ui/cx';
import { Segmented } from '../ui/Segmented';
import { TextArea, TextInput } from '../ui/Field';
import { Toggle } from '../ui/Toggle';

const TYPES: ReadonlyArray<{ type: ContentType; label: string; icon: ReactNode }> = [
  { type: 'url', label: 'Website', icon: <Link2 size={17} /> },
  { type: 'text', label: 'Text', icon: <Type size={17} /> },
  { type: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={17} /> },
  { type: 'wifi', label: 'Wi-Fi', icon: <Wifi size={17} /> },
  { type: 'vcard', label: 'Contact', icon: <Contact size={17} /> },
  { type: 'email', label: 'Email', icon: <Mail size={17} /> },
  { type: 'sms', label: 'SMS', icon: <MessageSquareText size={17} /> },
  { type: 'instagram', label: 'Instagram', icon: <Camera size={17} /> },
  { type: 'youtube', label: 'YouTube', icon: <PlaySquare size={17} /> },
  { type: 'facebook', label: 'Facebook', icon: <ThumbsUp size={17} /> },
];

interface ContentPanelProps {
  content: ContentState;
  onChange: (next: ContentState) => void;
  error: string | null;
}

export function ContentPanel({ content, onChange, error }: ContentPanelProps) {
  const setType = (type: ContentType): void => onChange({ ...content, type });
  function patch<K extends ContentType>(type: K, values: Partial<ContentValues[K]>): void {
    onChange({ ...content, values: { ...content.values, [type]: { ...content.values[type], ...values } } });
  }
  const v = content.values;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Content type" className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {TYPES.map((t) => {
          const active = t.type === content.type;
          return (
            <button
              key={t.type}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setType(t.type)}
              className={cx(
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors sm:flex-col sm:gap-1 sm:px-2',
                active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-raised text-ink-2 hover:border-line-strong hover:text-ink',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4" role="tabpanel">
        {content.type === 'url' && (
          <TextInput
            label="Website address"
            placeholder="https://your-site.com"
            inputMode="url"
            autoComplete="url"
            value={v.url.url}
            onChange={(url) => patch('url', { url })}
            hint="https:// is added automatically if you leave it out."
          />
        )}

        {content.type === 'text' && (
          <TextArea label="Text" rows={4} placeholder="Any text — Arabic and emoji are supported." value={v.text.text} onChange={(text) => patch('text', { text })} />
        )}

        {content.type === 'whatsapp' && (
          <>
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <TextInput label="Country code" inputMode="numeric" placeholder="964" value={v.whatsapp.countryCode} onChange={(countryCode) => patch('whatsapp', { countryCode })} />
              <TextInput label="Phone number" inputMode="tel" placeholder="7701234567" value={v.whatsapp.number} onChange={(number) => patch('whatsapp', { number })} />
            </div>
            <TextArea label="Pre-filled message" placeholder="Hello! I'd like to ask about…" value={v.whatsapp.message} onChange={(message) => patch('whatsapp', { message })} />
          </>
        )}

        {content.type === 'wifi' && (
          <>
            <TextInput label="Network name (SSID)" value={v.wifi.ssid} onChange={(ssid) => patch('wifi', { ssid })} autoComplete="off" />
            <Segmented
              label="Security"
              value={v.wifi.security}
              options={[
                { value: 'WPA', label: 'WPA/WPA2/WPA3' },
                { value: 'WEP', label: 'WEP' },
                { value: 'nopass', label: 'No password' },
              ]}
              onChange={(security) => patch('wifi', { security })}
            />
            {v.wifi.security !== 'nopass' && (
              <TextInput label="Password" type="text" autoComplete="off" value={v.wifi.password} onChange={(password) => patch('wifi', { password })} />
            )}
            <Toggle label="Hidden network" hint="Turn on if the network doesn't broadcast its name." checked={v.wifi.hidden} onChange={(hidden) => patch('wifi', { hidden })} />
          </>
        )}

        {content.type === 'vcard' && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput label="First name" autoComplete="given-name" value={v.vcard.firstName} onChange={(firstName) => patch('vcard', { firstName })} />
              <TextInput label="Last name" autoComplete="family-name" value={v.vcard.lastName} onChange={(lastName) => patch('vcard', { lastName })} />
              <TextInput label="Phone" inputMode="tel" autoComplete="tel" value={v.vcard.phone} onChange={(phone) => patch('vcard', { phone })} />
              <TextInput label="Email" type="email" autoComplete="email" value={v.vcard.email} onChange={(email) => patch('vcard', { email })} />
              <TextInput label="Company" autoComplete="organization" value={v.vcard.company} onChange={(company) => patch('vcard', { company })} />
              <TextInput label="Job title" autoComplete="organization-title" value={v.vcard.title} onChange={(title) => patch('vcard', { title })} />
            </div>
            <TextInput label="Website" inputMode="url" value={v.vcard.website} onChange={(website) => patch('vcard', { website })} />
            <TextInput label="Street address" autoComplete="street-address" value={v.vcard.street} onChange={(street) => patch('vcard', { street })} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TextInput label="City" value={v.vcard.city} onChange={(city) => patch('vcard', { city })} />
              <TextInput label="Region" value={v.vcard.region} onChange={(region) => patch('vcard', { region })} />
              <TextInput label="Postcode" value={v.vcard.postcode} onChange={(postcode) => patch('vcard', { postcode })} />
              <TextInput label="Country" value={v.vcard.country} onChange={(country) => patch('vcard', { country })} />
            </div>
          </>
        )}

        {content.type === 'email' && (
          <>
            <TextInput label="To" type="email" placeholder="name@company.com" value={v.email.to} onChange={(to) => patch('email', { to })} />
            <TextInput label="Subject" value={v.email.subject} onChange={(subject) => patch('email', { subject })} />
            <TextArea label="Message" value={v.email.body} onChange={(body) => patch('email', { body })} />
          </>
        )}

        {content.type === 'sms' && (
          <>
            <TextInput label="Phone number" inputMode="tel" placeholder="+9647701234567" value={v.sms.number} onChange={(number) => patch('sms', { number })} />
            <TextArea label="Message" value={v.sms.message} onChange={(message) => patch('sms', { message })} />
          </>
        )}

        {content.type === 'instagram' && (
          <TextInput
            label="Username or profile link"
            placeholder="@yourbrand"
            value={v.instagram.username}
            onChange={(username) => patch('instagram', { username })}
          />
        )}

        {content.type === 'youtube' && (
          <>
            <Segmented
              label="Link to"
              value={v.youtube.mode}
              options={[
                { value: 'channel', label: 'Channel' },
                { value: 'video', label: 'Video' },
              ]}
              onChange={(mode) => patch('youtube', { mode })}
            />
            <TextInput
              label={v.youtube.mode === 'channel' ? 'Channel handle or link' : 'Video link or ID'}
              placeholder={v.youtube.mode === 'channel' ? '@yourchannel' : 'https://youtu.be/…'}
              value={v.youtube.value}
              onChange={(value) => patch('youtube', { value })}
            />
          </>
        )}

        {content.type === 'facebook' && (
          <TextInput label="Page name or link" placeholder="yourpage" value={v.facebook.page} onChange={(page) => patch('facebook', { page })} />
        )}
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-lg bg-sunken px-3 py-2 text-xs text-ink-3">
          <Info size={14} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
