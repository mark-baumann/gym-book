# Gym Book

Gym Book ist eine React/Vite-Anwendung für die Trainingsplanung mit Übungen, Plänen und Kalenderübersicht.

## Neu: Progressive Web App (PWA)

Die Anwendung ist als PWA vorbereitet und kann auf unterstützten Geräten installiert werden.

### Enthaltene PWA-Funktionen

- Web App Manifest (`public/manifest.webmanifest`)
- Service Worker für Caching und Offline-Basisfunktionalität (`public/sw.js`)
- Automatische Service-Worker-Registrierung beim App-Start (`src/main.tsx`)
- PWA-Metadaten in `index.html`

## Voraussetzungen

- Node.js 18+
- npm

## Entwicklung

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test
```

## Lizenz

Dieses Projekt steht unter der **GNU General Public License v3.0**. Siehe [LICENSE](./LICENSE).
