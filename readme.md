# TikTok Statistik

En webbaserad applikation för att analysera och visualisera TikTok-statistik lokalt i din webbläsare. Inget data skickas till externa servrar — all bearbetning sker direkt i din webbläsare.

## Funktioner

### Uppladdning och kontohantering
- **Batch-upload** — Dra och släpp flera CSV-filer samtidigt
- **Automatiskt kontoskapande** — Ange kontonamn per fil (t.ex. "P3", "Ekot") och konton skapas automatiskt
- **Sammanslagning av data** — Om ett konto redan finns läggs ny data till med dublettkontroll på datum
- **Flera konton** — Hantera och jämför statistik från valfritt antal TikTok-profiler

### Dataformat som stöds

Appen hanterar TikToks **dagliga översiktsdata** (CSV-export från TikTok Creator Studio):

| Kolumn | Beskrivning |
|---|---|
| Datum | Statistikdatum |
| Videovisningar | Totalt antal videovisningar |
| Målgrupp som nåtts | Unik räckvidd |
| Profilvisningar | Antal profilbesök |
| Gilla-markeringar | Antal likes |
| Delningar | Antal delningar |
| Kommentarer | Antal kommentarer |
| Nettotillväxt | Ny följartillväxt netto |
| Nya följare | Antal nya följare |
| Tappade följare | Antal tappade följare |
| …med flera | Produktlänkar, webbplatsklick, leads m.m. |

Kolumnnamn på både **svenska och engelska** stöds.

### Vyer

- **Per konto** — Aggregerad tabell med en rad per konto. Summerar videovisningar, interaktioner, följartillväxt m.m. Räckvidd och engagemangsnivå beräknas som genomsnitt.
- **Per dag** — Daglig data för alla konton med kontofilter, sökning, sortering och paginering.

### Beräknade fält
- **Interaktioner** = likes + kommentarer + delningar
- **Engagemangsnivå (%)** = interaktioner / räckvidd × 100

### Export
- Export till **CSV** och **Excel** från båda vyerna

## Teknisk översikt

- **React** — Komponentbaserat gränssnitt
- **Vite** — Byggverktyg och utvecklingsserver
- **Tailwind CSS + Radix UI** — Stilsättning och tillgängliga UI-komponenter
- **IndexedDB** — Lokal datalagring för stora datamängder
- **localStorage** — Konfiguration och cache för mindre data
- **PapaParse** — CSV-parsning
- **SheetJS** — Excel-export

## Lokal utveckling

### Förutsättningar
- Node.js 16+
- npm

### Installation

```bash
git clone https://github.com/cgillinger/tiktok_stats.git
cd tiktok_stats
npm install
npm run dev
```

Bygg för produktion:

```bash
npm run build
```

## Använda applikationen

### Kom igång

1. **Exportera data från TikTok** — Gå till TikTok Creator Studio → Analytics → exportera daglig översiktsdata som CSV
2. **Öppna appen** och dra CSV-filerna till uppladdningszonen (eller klicka för att välja)
3. **Ange kontonamn** för varje fil (t.ex. "P3", "Ekot", "SVT Nyheter")
4. **Klicka "Bearbeta alla"** — konton skapas och data laddas in
5. **Utforska statistiken** i vyerna "Per konto" och "Per dag"
6. **Exportera** till CSV eller Excel vid behov

### Lägga till mer data

Klicka på **"Lägg till data"** i huvudvyn för att ladda upp ytterligare filer. Om ett kontonamn redan finns slås datan samman (dubbletter på datum tas bort automatiskt).

### Återställa data

Klicka på återställningsknappen (↻) uppe till höger för att rensa all data och börja om.

## Integritetsinformation

- All data lagras uteslutande **lokalt i din webbläsare**
- Ingen data skickas till några servrar eller tredje parter
- Appen behöver inga TikTok-lösenord eller API-nycklar

## Licensiering

MIT
