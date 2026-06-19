# Meta Vault

> **Your photos, your data, your control.**

A privacy-first, fully client-side web application for viewing, editing, and managing EXIF, IPTC, and GPS metadata embedded in your images. Process sensitive photo information directly in your browser with zero server communication. Take back control of your digital footprint.

![Meta Vault](public/images/logo.png)

---

## ✨ Features

- **Complete Privacy** — 100% client-side processing. No uploads. No servers. No tracking.
- **View All Metadata** — Inspect EXIF, IPTC, XMP, and file-level metadata embedded in your photos
- **Edit Metadata** — Modify camera make/model, artist, copyright, timestamps, and GPS coordinates
- **Interactive Map** — Visualize and adjust GPS location with Leaflet + OpenStreetMap
- **Smart Export** — Download images with updated, modified, or completely scrubbed metadata
- **Multi-Format Support** — JPEG, PNG, and WebP images
- **Offline Ready** — Progressive Web App (PWA) — works without internet after first load
- **8 Languages** — English, Spanish, German, Chinese, Japanese, French, Portuguese (Brazil), Hindi
- **Responsive Design** — Works seamlessly on desktop, tablet, and mobile

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.9.0 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/meta-vault-app.git
cd meta-vault-app

# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
# http://localhost:3000
```

### Build for Production

```bash
# Create a static export (no server required)
npm run build

# Output is in ./out/ directory
# Deploy to any static host (Vercel, Netlify, GitHub Pages, AWS S3, etc.)
```

---

## 📋 Technologies

### Frontend Framework
- **Next.js 16.2.6** — React 19 with TypeScript 5
- **Static Export** — No server-side rendering or API routes required

### Image Processing
- **exifreader** — Extract and parse EXIF, GPS, IPTC, XMP metadata
- **piexifjs** — JPEG metadata writing and modification
- **png-chunks-extract/encode** — PNG metadata manipulation
- **Leaflet** + **React-Leaflet** — Interactive maps with OpenStreetMap tiles

### UI & Experience
- **Tailwind CSS 4** — Utility-first styling
- **Lucide React** — Clean icon library
- **React-Dropzone** — Drag-and-drop file upload
- **React-Toastify** — Toast notifications
- **tsparticles** — Animated particle background

### State & i18n
- **Zustand** — Lightweight state management for image and metadata
- **Custom i18n Context** — Language detection and persistence with localStorage

### PWA & Deployment
- **next-pwa** — Service worker for offline support
- **Output: export** — Static site generation for maximum compatibility

---

## 📂 Project Structure

```
meta-vault-app/
│
├── app/
│   ├── components/
│   │   ├── FileDropZone.tsx          # Landing page with upload zone
│   │   ├── ImageMetaData.tsx          # Image preview + replacement
│   │   ├── MetadataEditor.tsx         # Main editor with map and form
│   │   ├── LanguageSelector.tsx       # Language switcher
│   │   ├── ParticlesBg.tsx            # Animated background
│   │   ├── ContentFeatures.tsx        # Feature highlights
│   │   └── Footer.tsx
│   │
│   ├── store/
│   │   └── useImageStore.ts           # Zustand store
│   │
│   ├── i18n/
│   │   ├── LanguageContext.tsx        # i18n provider & hook
│   │   └── locales/                   # Translation JSON files (8 languages)
│   │       ├── en.json, es.json, de.json, zh.json
│   │       └── ja.json, fr.json, pt-br.json, hi.json
│   │
│   ├── types/
│   │   └── exif.ts                    # TypeScript definitions for metadata
│   │
│   ├── utils/
│   │   ├── fileImages.ts              # Download and export helpers
│   │   ├── formatData.ts              # GPS coordinate conversion (decimal ↔ DMS)
│   │   ├── validateMagicBytes.ts      # File type validation
│   │   ├── safeDate.ts                # Date parsing and formatting
│   │   └── randomName.ts              # Filename generation
│   │
│   ├── layout.tsx                     # Root layout with PWA and i18n setup
│   ├── page.tsx                       # Home page
│   └── globals.css                    # Global styles
│
├── public/
│   ├── images/                        # Logo, feature graphics
│   ├── icons/                         # PWA app icons (48px–512px)
│   ├── lang/                          # Language flag SVGs
│   └── manifest.json                  # PWA manifest
│
├── next.config.ts                     # Next.js config (static export, PWA)
├── tailwind.config.ts                 # Tailwind configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json                       # Dependencies and scripts
```

---

## 🏗️ Architecture & Data Flow

### Image Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  1. FILE UPLOAD                                             │
│     • User selects image via drag-drop or file picker       │
│     • Maximum 20 MB validation applied                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  2. FILE INTEGRITY CHECK                                    │
│     • Magic bytes verification (JPEG: FF D8 FF, etc.)       │
│     • MIME type validation (image/jpeg, image/png, etc.)    │
│     • Ensures file is authentic image (not spoofed)         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  3. METADATA EXTRACTION                                     │
│     • exifreader.load() parses binary image data            │
│     • Extracts: EXIF, GPS, IPTC, XMP, file-level tags      │
│     • Organizes by type (exif, gps, iptc, xmp)             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  4. STATE MANAGEMENT (Zustand Store)                        │
│     • imageFile: File object                                │
│     • previewUrl: Blob URL for display                      │
│     • metadata: Parsed EXIF/IPTC/XMP objects               │
│     • formData: User-editable fields                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  5. INTERACTIVE EDITING                                     │
│     • Form fields: Make, Model, Artist, Copyright, DateTime │
│     • GPS Coordinates: Click-to-set or drag map marker      │
│     • Advanced View: Raw EXIF/IPTC/XMP inspection           │
│     • Real-time validation and preview                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  6. EXPORT & DOWNLOAD                                       │
│     • Choose format: JPEG, PNG, or WebP                     │
│     • Scrub mode: Remove all metadata                       │
│     • Custom mode: Keep or modify specific fields           │
│     • File downloaded to user's device                      │
└─────────────────────────────────────────────────────────────┘
```

### Metadata Modification by Format

#### JPEG Processing
```javascript
1. ReadAsDataURL() → base64 image data
2. piexifjs.load(data) → Parse existing EXIF
3. Update fields:
   - Make, Model (camera info)
   - Artist, Copyright (authorship)
   - DateTime (timestamp)
   - GPS (location in DMS format)
4. piexifjs.dump() → Repack EXIF
5. piexifjs.insert() → Inject into JPEG
6. Download as new file
```

#### PNG Processing
```javascript
1. readAsArrayBuffer() → Binary data
2. png-chunks-extract() → Split into chunks
3. Filter chunks:
   - Remove: tEXt, zTXt, iTXt (text metadata)
   - Remove: eXIf (EXIF chunk)
4. Rebuild eXIf chunk with new metadata (if provided)
5. png-chunks-encode() → Repack PNG
6. Download as new file
```

#### Scrub Mode (Full Cleanup)
```javascript
JPEG: piexif.remove(data) → Returns image without any EXIF
PNG:  Filter all metadata chunks → Pure image data only
```

### GPS Coordinate System

Meta Vault converts between two coordinate formats:

| Format | Example | Use Case |
|--------|---------|----------|
| **Decimal** | 40.7128, -74.0060 | User interface, map |
| **DMS** | 40°42′46″N, 74°0′21″W | EXIF/IPTC standard |

Automatic conversion ensures accuracy in both directions.

---

## 🌍 Internationalization

Supports **8 languages** with automatic browser language detection:

- 🇺🇸 English
- 🇪🇸 Spanish (Español)
- 🇩🇪 German (Deutsch)
- 🇨🇳 Chinese Simplified (简体中文)
- 🇯🇵 Japanese (日本語)
- 🇫🇷 French (Français)
- 🇧🇷 Portuguese Brazil (Português Brasileiro)
- 🇮🇳 Hindi (हिन्दी)

**Implementation:**
- Custom React Context for language state
- JSON-based translation dictionaries
- Persistent storage in localStorage
- Automatic fallback to English for missing keys
- Post-hydration sync prevents hydration mismatch

---

## 🔒 Privacy & Security Architecture

### Philosophy: Privacy by Default

Meta Vault is built on a **zero-knowledge architecture**. We don't collect data because we cannot—all processing occurs entirely within your browser.

### Core Privacy Guarantees

✅ **100% Client-Side Processing**
- All image analysis and metadata manipulation happens locally in your browser
- Zero network communication for image data
- No remote servers receive, store, or process your files
- Your images never leave your device

✅ **Static Export Architecture**
- No backend server required
- Deployable on any CDN or static host (Vercel, Netlify, GitHub Pages, AWS S3, etc.)
- No dynamic API routes or server-side processing
- Truly serverless—nothing to compromise

✅ **Offline Capability**
- Fully functional offline via Progressive Web App (PWA)
- Service worker caches all application assets on first visit
- Works completely without internet connection after initial load
- No remote dependencies for core functionality

### Security Implementation

**Content Security Policy (CSP)**
```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'  ⚠️ Required by Leaflet & tsparticles
style-src 'self' 'unsafe-inline'
img-src 'self' blob: data: https://*.tile.openstreetmap.org
connect-src 'self' https://*.tile.openstreetmap.org
worker-src blob:
```

**Additional Security Headers** (available in `next.config.ts`)
- `X-Frame-Options: DENY` — Prevents clickjacking attacks
- `X-Content-Type-Options: nosniff` — Prevents MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — Controls referrer leakage
- `Permissions-Policy` — Restricts access to sensitive browser APIs (camera, microphone, geolocation)
- `HSTS` — Enforces HTTPS in production

### File Integrity & Validation

Every uploaded file is validated before processing:

- **Magic Bytes Verification** — Cryptographic validation that files are genuine images (not spoofed)
- **MIME Type Checking** — Accepts only JPEG, PNG, and WebP formats
- **Size Enforcement** — 20 MB maximum per file (configurable)
- **No Decompilation** — Files never partially decoded unless explicitly processed

### Data Ownership & Control

You have complete control over every byte of your data:

| Operation | You Control |
|-----------|------------|
| **View** | See exactly what metadata exists in your image |
| **Edit** | Selectively modify any field (camera, artist, copyright, date, location) |
| **Remove** | Delete specific fields or scrub all metadata completely |
| **Export** | Download the modified image with your changes |
| **No Backup** | Original files are never stored, modified, or retained |

### What We Don't Do

❌ No cookies tracking you
❌ No analytics or telemetry
❌ No external API calls for metadata processing
❌ No authentication or account system
❌ No data persistence across sessions
❌ No third-party integrations (except map tiles from OpenStreetMap)
❌ No cloud storage sync without explicit user action
❌ No background processes or hidden operations

### External Dependencies

Only two external services are used—both minimal and optional:

1. **OpenStreetMap Tiles** — Map visualization only (no data transmitted about your images)
2. **Google Fonts** — Typography only (standard CDN request, no special data)

Both can be replaced with self-hosted alternatives if desired.

---

## 🛠️ Development

### Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build static site
npm run build

# Run linter (ESLint)
npm run lint

# Type checking with TypeScript
npx tsc --noEmit

# Preview production build locally
npm run preview
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.2.6 | React framework with SSG |
| React | 19.2.4 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Zustand | 5.x | State management |
| exifreader | 4.39.1 | EXIF/IPTC/XMP extraction |
| piexifjs | 1.0.6 | JPEG metadata writing |
| react-leaflet | 5.0.0 | Interactive maps |
| next-pwa | 5.6.0 | PWA support |

### Code Architecture

- **Component-based** — Reusable React components with clear separation of concerns
- **Type-safe** — Full TypeScript with strict mode
- **Hooks-based** — Modern React patterns (useState, useEffect, useContext)
- **Zustand store** — Simple, scalable state management for image and metadata
- **Utility functions** — Pure functions for metadata formatting, coordinate conversion, validation
- **Custom hooks** — `useTranslation()` for i18n, store hooks for state access

---

## 📱 Browser Support

- **Chrome/Edge** 90+
- **Firefox** 88+
- **Safari** 14+
- **Mobile browsers** (iOS Safari, Chrome Mobile, Samsung Internet)

Works best on modern browsers with ES2020+ support.

---

## 🚢 Deployment

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Option 2: Netlify
```bash
npm run build
# Drag & drop the ./out folder to Netlify
```

### Option 3: GitHub Pages
```bash
npm run build
# Push ./out folder to gh-pages branch
```

### Option 4: Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
FROM node:20-alpine
COPY --from=0 /app/out ./public
EXPOSE 3000
CMD ["npx", "serve", "-s", "public"]
```

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for bugs and feature requests.

### Development Guidelines
- Write type-safe TypeScript code
- Follow ESLint and Prettier rules
- Add comments for non-obvious logic
- Test manually across browsers
- Update translations for new strings

---

## 📞 Support & Feedback

- **Issues** — Report bugs or request features on GitHub
- **Discussions** — Share ideas and ask questions
- **Email** — [contact information]

---

## 🎯 Roadmap

- [ ] Support for more image formats (TIFF, GIF, WebP extended)
- [ ] Batch processing multiple images
- [ ] Advanced EXIF field editor (all tags, not just common ones)
- [ ] Dark mode theme
- [ ] Keyboard shortcuts
- [ ] Image comparison (before/after metadata)
- [ ] Export presets (e.g., "Remove all", "Keep only essentials")
- [ ] Integration with cloud storage (Google Drive, Dropbox)

---

## 🙏 Acknowledgments

- **exifreader** — For reliable EXIF/IPTC/XMP extraction
- **Leaflet** — For the best open-source mapping library
- **OpenStreetMap** — For free, open map tiles
- **Next.js** — For an amazing React framework
- **Tailwind CSS** — For utility-first styling
- All contributors and users who help improve this project

---

## 🔐 Privacy Commitment

Privacy is not a feature—it's a fundamental principle embedded in every line of code.

### Our Pledge

We designed Meta Vault with a simple truth in mind: **your photos contain your secrets**. Location coordinates reveal where you live, travel, and work. Timestamps show your daily patterns. Camera metadata identifies your equipment. EXIF comments contain personal notes.

These details should never leave your device.

### Verifiable Privacy

Unlike proprietary software that asks you to "trust us," Meta Vault's code is auditable. You can inspect our GitHub repository and verify:

- ✅ Zero network requests for image data (except map tiles)
- ✅ No tracking pixels, analytics, or beacons
- ✅ No cookies or persistent user IDs
- ✅ No backend servers processing your images
- ✅ No third-party integrations harvesting data
- ✅ No account creation or authentication requirements
- ✅ No data collection, storage, or retention

**Your data stays on your device. Always.**

### How to Verify

```bash
# Clone the repository
git clone https://github.com/yourusername/meta-vault-app.git
cd meta-vault-app

# Search for network calls
grep -r "fetch\|axios\|http" src/ app/

# Search for analytics
grep -r "gtag\|analytics\|Sentry\|datadog" src/ app/

# Inspect API routes
ls app/api/  # (Should be empty)
```

No surprises. No hidden requests. Just code that does exactly what you see.

---

## 📖 Use Cases

Meta Vault is trusted by:

- **Photographers** — Remove sensitive GPS data before sharing online
- **Journalists** — Strip metadata that could reveal sources or operational details
- **Activists** — Protect location data in sensitive regions
- **Creatives** — Remove technical details (lens, camera, settings) before publishing
- **Privacy-Conscious Users** — Audit what information their devices embed in photos
- **Data Protection Officers** — Help organizations comply with data minimization regulations

---

## 📚 Further Reading

- [Electronic Frontier Foundation: Metadata](https://www.eff.org/deeplinks/2012/11/how-exif-data-can-compromise-your-privacy)
- [NIST: Photo Metadata Standards](https://www.nist.gov/)
- [EXIF Specification](https://en.wikipedia.org/wiki/Exif)
- [Open Geospatial Consortium](https://www.ogc.org/)

---

**Made with ❤️ for photographers, journalists, activists, and anyone who believes privacy is a right, not a privilege.**