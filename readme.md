# TikTok Statistik

En webbaserad applikation för att analysera och visualisera TikTok-statistik lokalt i din webbläsare. Inget data skickas till externa servrar - all bearbetning sker direkt i din webbläsare.

![TikTok Statistik](./public/app-preview.png)

## Funktioner

### Kontohantering
- **Hantera flera TikTok-konton** - Skapa, redigera och ta bort olika TikTok-konton
- **Gruppera statistik per konto** - Separera och filtrera data från olika TikTok-konton
- **Enkel kontoöversikt** - Se status för uppladdad data per konto

### Datahantering
- **Uppladdning av CSV-filer** - Ladda upp exporterade CSV-filer från TikTok (översiktsdata och videodata)
- **Automatisk filtypsdetektering** - Automatisk identifiering av vilken typ av TikTok-data som laddas upp
- **Kolumnmappningar** - Anpassa och uppdatera hur TikTok-kolumner mappas när nya format lanseras
- **Lokal lagring** - All data sparas lokalt i webbläsaren via IndexedDB och localStorage

### Visualisering och analys
- **Översiktsvy** - Se daglig statistik för visningar, räckvidd, gilla-markeringar, kommentarer, delningar m.m.
- **Videoanalys** - Analysera prestanda för individuella videor
- **Engagemangsberäkning** - Automatisk beräkning av engagemangsnivåer
- **Sorteringsmöjligheter** - Sortera och filtrera data efter olika parametrar
- **Sökfunktion** - Sök efter specifik information i dina data

### Export och delning
- **CSV-export** - Exportera filtrerad och bearbetad data till CSV-format
- **Excel-export** - Exportera data till Excel-format för vidare analys
- **Valbar datafält** - Välj exakt vilka fält som ska inkluderas i tabeller och vid export

## Teknisk översikt

Applikationen är byggd med följande teknologier:

- **React** - För komponentbaserat användargränssnitt
- **Vite** - Som byggverktyg och utvecklingsserver
- **Tailwind CSS** - För stilsättning och design
- **IndexedDB** - För långvarig lokal datalagring
- **LocalStorage** - För konfiguration och mindre datamängder
- **PapaParse** - För robust CSV-parsning
- **SheetJS** - För Excel-export och -hantering

## Lokal utveckling

### Förutsättningar
- Node.js (version 16+)
- npm eller yarn

### Installation

1. Klona repot:
   ```
   git clone https://github.com/cgillinger/tiktok_stats.git
   cd tiktok_stats
   ```

2. Installera beroenden:
   ```
   npm install
   ```

3. Starta utvecklingsservern:
   ```
   npm run dev
   ```

4. Bygg för produktion:
   ```
   npm run build
   ```

## Använda applikationen

### Kom igång

1. **Lägg till ett konto** - Börja med att skapa ett konto för den TikTok-profil du vill analysera
2. **Ladda upp data** - Ladda upp översiktsdata (daily data export) och/eller videodata från TikTok Creator Studio
3. **Utforska statistiken** - Använd tabellerna för att se, sortera och analysera dina data
4. **Exportera vid behov** - Exportera data till CSV eller Excel för vidare analys

### Dataformat som stöds

- **Översiktsdata** - Daglig översikt med räckvidd, visningar, följare, etc.
- **Videodata** - Per-video-statistik med titlar, publiceringsdatum, visningar, etc.

### Kolumnmappningar

Om TikTok ändrar sina CSV-format kan du uppdatera kolumnmappningarna under inställningar. Detta gör att appen fortsätter fungera även när TikTok uppdaterar sina exportformat.

## Integritetsinformation

- All data lagras uteslutande lokalt i din webbläsare
- Ingen data skickas till några servrar eller tredje parter
- Appen har ingen autentisering mot TikTok API:er och behöver inga lösenord

## Bidra till projektet

Bidrag till projektet är välkomna! Du kan hjälpa till genom att:

1. Rapportera buggar eller problem via issues
2. Föreslå nya funktioner
3. Skicka pull requests med förbättringar eller buggfixar

## Licensiering

Denna applikation är licensierad under MIT-licensen.