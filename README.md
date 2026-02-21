# Gym Book

Eine moderne, mobile-optimierte Web-App zur Verwaltung von Übungen, Trainingsplänen und Trainingstagen.

Gym Book hilft dir dabei, deine Übungen zentral zu pflegen, Tagespläne als erledigt zu markieren und deinen Fortschritt inkl. Bestgewichten im Blick zu behalten.

## ✨ Features

- **Übungsverwaltung**
  - Übungen anlegen, bearbeiten und löschen
  - Muskelgruppen zuordnen
  - Optionales Übungsbild hochladen (Supabase Storage)
  - Bestes Gewicht je Übung anzeigen
- **Schnelles Gewicht-Logging**
  - Direkt aus der Übungskarte ein Gewicht speichern
  - Fortschritt als Linienchart (Bestleistung pro Trainingstag)
- **Trainingspläne**
  - Pläne erstellen, bearbeiten und löschen
  - Übungen einem Plan zuweisen
  - Reihenfolge der Übungen im Plan ändern
  - Plan für „heute“ als erledigt markieren
- **Kalenderansicht**
  - Trainingstage im Kalender hervorgehoben
  - Monatsübersicht mit Anzahl Gym-Tage
  - Detaillierte Tagesansicht mit aufgezeichneten Sätzen
  - Sessions direkt aus dem Kalender löschen
- **Mobile-first UI & PWA**
  - Sticky Header + Bottom Navigation
  - Als installierbare Progressive Web App (PWA) nutzbar
  - Offline-Basisunterstützung via Service Worker
  - Klare, reduzierte Oberfläche auf Basis von shadcn/ui + Tailwind

## 🧱 Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons
- **State/Data:** TanStack Query
- **Backend:** Supabase (Postgres + Storage)
- **Charts & Datum:** Recharts, date-fns
- **Tests:** Vitest + Testing Library

## 🚀 Schnellstart

### 1) Voraussetzungen

- Node.js 18+
- npm
- Ein Supabase-Projekt

### 2) Repository klonen

```bash
git clone <DEIN_REPO_URL>
cd gym-book
```

### 3) Dependencies installieren

```bash
npm install
```

### 4) Umgebungsvariablen anlegen

Erstelle eine `.env` Datei im Projektroot:

```bash
VITE_SUPABASE_URL=https://<dein-projekt>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<dein-anon-key>
```

> Die App initialisiert den Supabase-Client über diese beiden Variablen.

### 5) Entwicklungsserver starten

```bash
npm run dev
```

Standardmäßig läuft die App dann unter `http://localhost:5173`.

## 🗄️ Datenbank & Supabase Setup

Die SQL-Migrationen liegen unter `supabase/migrations/`.

### Enthaltene Tabellen

- `exercises`
- `training_plans`
- `training_plan_exercises` (Zuordnung + Reihenfolge)
- `workout_sessions`
- `workout_sets`

Zusätzlich wird ein öffentlicher Storage-Bucket `exercise-images` angelegt.

### Wichtiger Hinweis zur Sicherheit

Die aktuellen Policies erlauben **vollen Zugriff** (FOR ALL USING true) für die relevanten Tabellen und Storage-Objekte.
Das ist für Prototyping praktisch, für produktive Nutzung solltest du die RLS-Policies mit Auth-Checks absichern.

## 📱 App-Navigation

Die Anwendung besteht aus drei Hauptbereichen:

1. **Übungen (`/`)**
   - Übungsbibliothek nach Muskelgruppen
   - Quick-Log und Fortschrittschart
2. **Pläne (`/plans`)**
   - Trainingspläne verwalten
   - Tagesstatus („heute erledigt“) setzen
3. **Kalender (`/calendar`)**
   - Trainingshistorie nach Datum
   - Sessions inkl. Satzdaten anzeigen/löschen

## 📂 Projektstruktur (Kurzüberblick)

```text
src/
  components/
    ui/                 # shadcn/ui Komponenten
    Layout.tsx          # App-Layout inkl. Bottom-Navigation
  integrations/
    supabase/
      client.ts         # Supabase Client
      types.ts          # DB-Typen
  lib/
    constants.ts        # z. B. Muskelgruppen
  pages/
    Exercises.tsx       # Übungen + Quick-Log + Progress Chart
    Plans.tsx           # Trainingspläne
    CalendarView.tsx    # Kalender + Tagesdetails
  test/
    setup.ts
```

## 🧪 Verfügbare Scripts

```bash
npm run dev         # Dev-Server
npm run build       # Production Build
npm run build:dev   # Build im Development-Modus
npm run preview     # Build lokal previewen
npm run lint        # ESLint
npm run test        # Vitest (einmalig)
npm run test:watch  # Vitest Watch Mode
```

## ✅ Typischer Workflow in der App

1. Übungen anlegen (inkl. Muskelgruppen und optional Bildern)
2. Trainingsplan erstellen und Übungen in Reihenfolge bringen
3. Plan an Trainingstagen als erledigt markieren
4. Gewichte pro Übung direkt per Quick-Log erfassen
5. Fortschritt über Chart und Kalender verfolgen

## 🌍 Deployment

Da das Projekt ein Vite-Frontend ist, kannst du es z. B. auf folgenden Plattformen deployen:

- Vercel
- Netlify
- Cloudflare Pages
- Eigenes Hosting (statische Dateien aus `dist/`)

Build-Befehl:

```bash
npm run build
```

Ausgabeordner: `dist/`

## 🛠️ Verbesserungsideen / Roadmap

- Nutzer-Authentifizierung mit Supabase Auth
- Nutzerbasierte Datenisolation via RLS
- Mehrere Sätze/Wiederholungen direkt in der Übungsansicht loggen
- Erweiterte Statistiken (Volumen, 1RM-Schätzung, Trends)
- Export/Import (CSV, JSON)

## 🤝 Contributing

Pull Requests und Issues sind willkommen.

Empfohlener Ablauf:

1. Branch erstellen
2. Änderung implementieren
3. Lint + Tests ausführen
4. PR erstellen

## 📄 Lizenz

Dieses Projekt steht unter der **GNU General Public License v3.0**. Details findest du in der Datei [`LICENSE`](./LICENSE).
