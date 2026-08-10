# Pickleball Community

Eine kleine Web-App für eine Pickleball-Spielgemeinschaft.

## 1. Supabase anlegen

1. Auf https://supabase.com ein kostenloses Projekt erstellen.
2. Im Supabase Dashboard unter **SQL Editor** den Inhalt von `supabase/schema.sql` ausführen.
3. Unter **Project Settings → API** diese Werte kopieren:
   - Project URL
   - anon public key
   - service_role key

## 2. Lokal starten

Node.js installieren, dann:

```bash
npm install
cp .env.example .env.local
```

`.env.local` ausfüllen:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_PASSWORD=...
```

Dann:

```bash
npm run dev
```

Die App läuft normalerweise unter http://localhost:3000

## 3. Ersten Spieler und Termin anlegen

Öffne `/admin` und melde dich mit `ADMIN_PASSWORD` an.

## 4. Auf Vercel veröffentlichen

Projekt zu GitHub pushen und in Vercel importieren.

In Vercel unter **Settings → Environment Variables** setzen:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_PASSWORD

Danach deployen.

## Sicherheit

Die öffentliche App darf aktive Spieler, aktive Termine und Antworten lesen. Admin-Schreibzugriffe laufen serverseitig mit dem Supabase Service Role Key. Dieser Schlüssel darf niemals mit `NEXT_PUBLIC_` beginnen und niemals in den Browser-Code gelangen.

Für eine echte öffentliche Produktion würde ich als nächsten Schritt Supabase Auth statt eines gemeinsamen Admin-Passworts einsetzen und zusätzlich Rate-Limiting ergänzen.
