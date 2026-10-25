# QR Atelier

A frontend-only code designer with two pages:

- **QR code** — static QR codes (the destination is baked into the code), branded with a background image, custom dots, corner markers, logo and frame.
- **Barcode** — 17 barcode types, sized for print and styled in detail.

Nothing is uploaded — images and data stay in your browser.

## Run

On Windows, double-click **`start.bat`**. It installs dependencies on the first run (and again whenever they change), starts the app and opens it in your browser. Close the window to stop it.

Or from a terminal:

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

Requires Node.js 20.19 or newer (tested with Node 22 and 24).

## Features

**Content types** — Website, plain text, WhatsApp (country code, number, message), Wi-Fi (SSID, password, WPA/WEP/none, hidden), contact vCard, email, SMS, Instagram, YouTube (channel or video), Facebook. Each is encoded in the standard payload format (`WIFI:`, `BEGIN:VCARD`, `mailto:`, `SMSTO:`, `wa.me`…). Text is encoded as UTF-8, so Arabic and emoji work.

**Branded image mode** — upload an image that sits behind the code; dots are drawn over it. A *detail level* slider shrinks the dots so the image shows through. Light modules are drawn as light dots, and the finder, timing, alignment and format patterns are always kept solid and high-contrast. Image controls: drag on the preview or use sliders for position, zoom, cover/contain, rotation, opacity, brightness, contrast, blur, grayscale, overlay tint, per-module contrast and a solid quiet zone.

**Blend patterns with image** — the timing and format squares can be drawn as dots like the rest of the code (with their own dot size) instead of a solid strip. The light backing behind the three corner markers has a *Corner blend* slider (solid → frosted → mostly see-through) and can follow the marker's shape. The small fourth (alignment) marker can stay a marker with the same blended backing, or be drawn as dots. **Auto** finds the most see-through corner blend that still scans, with a safety margin.

**Full styling** — error correction L/M/Q/H (switches to H when you add an image or logo); dot shapes square/rounded/circle/diamond; separate shapes and colors for the finder frame (square/rounded/circle) and eye (square/rounded/circle/diamond); foreground/background colors, transparent background, linear/radial gradients with angle; “dots take image color” with contrast boost; quiet zone, border width/color/radius; frames (banner below/above, pill, speech bubble, outline) with text, colors, size, width, radius and font; center logo with size, padding, background, rounded corners and module clearing.

**Scannability** — after every change the design is rendered at a fixed size and "photographed" at five camera sizes, from a small on-screen preview to a large print, each with camera blur, a little glare, sensor noise and space around the code. Every photo goes through two independent decoders, jsQR and ZXing (the engine behind many phone scanner apps), in a Web Worker. The badge shows **Scannable** only when both read the exact content at all five sizes, **Unreliable** when only some sizes work (the bars show which), and **Not scannable** when nothing reads. A contrast warning appears for low-contrast or inverted colors. **Optimize for scanning** adjusts settings step by step until the code is Scannable, then undoes any change that turned out not to be needed. The badge is a strong guide, not a guarantee — test the final design with a phone before printing.

**Export** — PNG at 256–4096 px, SVG (vector modules; background image embedded as base64 PNG), copy PNG to clipboard.

**Saved locally** — theme, last design, content type and its inputs, saved templates (save, apply, rename, delete), recent colors. Five built-in styles: Classic, Gold Luxe, Ocean Blue, Rounded Soft, Image Halftone. Large images are skipped from storage with a notice instead of breaking on quota errors.

**Themes** — dark (near-black and gold) and light (white and blue). Follows the system on first visit, then remembers your choice.

## Barcode page

**Types** — Retail: EAN-13, EAN-8, UPC-A, UPC-E, ISBN (with optional 2- or 5-digit add-on). General: Code 128. Logistics: GS1-128 (application identifiers in brackets), ITF-14. Industrial: Interleaved 2 of 5, Code 39, Code 93, Codabar, MSI Plessey, Pharmacode. 2D: Data Matrix, PDF417, Aztec. Encoding by bwip-js; input is validated with clear messages, and check digits are added or verified.

**Print sizing** — bar width (X-dimension) in mm with retail size presets (80–200%), bar height in mm, quiet zones, padding, and print resolution (300/600/1200 dpi). The preview shows the real printed size.

**Styling** — bar color or linear/radial gradient, rounded bar ends, bar-width reduction for ink spread; 2D module shape and size. Readable text: show/hide, custom text, above/below, left/center/right/justify, font, size, bold, color, gap and letter spacing; retail digits are placed in their standard GS1 positions, with optional quiet-zone marks. Label lines above and below (product name, size, price). Background color or transparent, border, corner radius, bearer bars (top & bottom or box). Rotation 0/90/180/270.

**Checks** — every change is "photographed" at four camera distances and decoded with ZXing; the badge shows Scannable / Unreliable / Not scannable. UPC-E, MSI, Pharmacode and Aztec can't be decoded reliably in the browser and show "Can't verify". Warnings for low contrast, light-on-dark and red/orange/yellow bars (invisible to red-laser scanners). **Optimize for scanning** fixes styling that hurts scanning and undoes anything not needed.

**Export** — PNG at the print resolution with every bar snapped to whole pixels, SVG sized in millimetres, copy PNG. Five built-in styles plus your own saved templates.

## Structure

```
src/
  App.tsx                  page tabs, theme, shared recent colors
  components/qr/QrPage.tsx QR page state, persistence, layout
  components/barcode/      Barcode page
  types/                   QrDesign and content types
  lib/
    payload.ts             content → QR payload strings
    storage.ts             localStorage with quota handling
    presets.ts defaults.ts color.ts image.ts
    qr/
      matrix.ts            qrcode-generator → module grid + function-pattern roles
      scene.ts             layout + display list (background → overlay → modules → finders → logo → frame)
      canvas.ts svg.ts     two renderers for the same scene
      background.ts        image raster (fit, transform, filters, overlay)
      scan.ts optimize.ts contrast.ts
    barcode/
      encode.ts            bwip-js raw encoding, GS1 retail digit layout, check digits
      scene.ts             barcode layout in modules → drawable scene
      render.ts scan.ts optimize.ts defaults.ts symbologies.ts
  workers/scan.worker.ts   QR decoding (jsQR + ZXing) off the main thread
  workers/barcode.worker.ts barcode decoding (ZXing) off the main thread
  hooks/                   preview, theme, design context, toasts…
  components/              ui primitives, content forms, design sections, preview/export
```
