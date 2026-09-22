# TikTok Statistik

En webbaserad applikation för att analysera och visualisera TikTok-statistik lokalt i din webbläsare. Inget data skickas till externa servrar — all bearbetning sker direkt i din webbläsare.

> Det här är ett personligt hobbyprojekt som jag byggt för eget bruk och lagt upp ifall det är till nytta för någon annan. Jag jobbar på det på fritiden, så issues och PR:ar är välkomna men svar kan dröja. Använd på egen risk.

## Funktioner

### Uppladdning och kontohantering
- **Batch-upload** — Dra och släpp flera CSV-filer samtidigt
- **Automatiskt kontonamn** — Kontonamnet föreslås utifrån @-namnet i filens URL-kolumn och normaliseras till läsbar form (`p3dingata` → "P3 Din Gata", `creepypoddenip3` → "Creepypodden i P3"). Förslaget går alltid att skriva över.
- **Ingen risk för dubbletter** — Uppladdningar matchas mot @-namnet, inte mot det skrivna kontonamnet. Att döpa om ett konto skapar alltså ingen andra post.
- **Sammanslagning av data** — Om ett konto redan finns läggs ny data till med dublettkontroll på datum
- **Flera konton** — Hantera och jämför statistik från valfritt antal TikTok-profiler

### Dataformat som stöds

Appen läser CSV-filer från en egen scraper (**tiktok-scrape**), inte TikToks egna exportfiler.
Det är **en fil per konto och månad**, med en rad per publicerad video. Filen har två sektioner:

**MÅNADSSUMMERING** — en sammanfattningsrad för hela månaden, även om inga videor publicerades.

**PER VIDEO** — en rad per publicerad video, med kolumnerna:

| Kolumn | Beskrivning |
|---|---|
| Filnamn | Ursprungligt filnamn för videon |
| VideoID | TikToks video-ID |
| Titel | Videons titel/beskrivning |
| URL | Länk till videon på TikTok |
| Månad | Vilken månad videon tillhör (ÅÅÅÅ-MM) |
| Datum | Publiceringstidpunkt |
| Visningar | Antal videovisningar |
| Gilla | Antal likes |
| Kommentarer | Antal kommentarer |
| Delningar | Antal delningar |
| Interaktioner | Summan av gilla, kommentarer och delningar |

> **Obs:** TikToks gamla exportformat (Översikt och Video) stöds **inte längre**.
> Räckvidd, profilvisningar och följarstatistik finns inte i det nya formatet.
> Om du försöker ladda upp en gammal exportfil varnar appen tydligt i stället för
> att importera fel eller ofullständig data.

### Vyer

Appen skiljer på tre tillstånd för varje konto och månad, tydligt märkta i gränssnittet:

1. **Data finns** — CSV uppladdad och videor publicerade den månaden.
2. **Tom månad** — CSV uppladdad, men inga videor publicerades (siffrorna visas som 0, med badgen "Inga videor publicerade").
3. **CSV saknas** — ingen fil uppladdad för konto och månad (siffrorna visas som "-", med badgen "Ingen CSV uppladdad").

De tre vyerna:

- **Per konto** — Aggregerad tabell med en rad per konto: summerade visningar, interaktioner m.m., antal videor och antal uppladdade månader. Engagemangsnivå beräknas som genomsnitt. Konton utan publicerade videor visas ändå, med en tydlig badge.
- **Per månad** — En rad per konto och månad, över hela månadsuniversumet av uppladdad data. Här syns tom månad och saknad CSV tydligast, med separat ikon och färg för respektive tillstånd samt en förklarande legend.
- **Per video** — En rad per publicerad video, med klickbar länk till videon, sökning på titel/konto, kontofilter, sortering och paginering.

### Beräknade fält

| Fält | Definition |
|---|---|
| **Interaktioner** | gilla + kommentarer + delningar |
| **Engagemangsnivå (%)** | interaktioner / visningar × 100 |

> **Observera:** engagemangsnivån räknades tidigare på räckvidd ("Målgrupp som nåtts"),
> ett fält som inte ingår i det nya dataformatet. Nämnaren är därför visningar, och
> värdena är inte jämförbara med siffror från äldre uttag.

Definitionen visas också i appen: under fältväljaren och som fotnot under varje tabell.

### Export
- Export till **CSV** och **Excel** från alla tre vyerna

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

1. **Kör tiktok-scrape** för att generera en CSV-fil per konto och månad
2. **Öppna appen** och dra CSV-filerna till uppladdningszonen (eller klicka för att välja)
3. **Ange kontonamn** för varje fil (förifylls från @-handlet i URL-kolumnen, går att ändra)
4. **Klicka "Bearbeta alla"** — konton skapas och data laddas in
5. **Utforska statistiken** i vyerna "Per konto", "Per månad" och "Per video"
6. **Exportera** till CSV eller Excel vid behov

### Lägga till mer data

Klicka på **"Lägg till data"** i huvudvyn för att ladda upp fler filer. Om kontonamnet redan finns läggs den nya månaden till.

### Återställa data

Klicka på återställningsknappen (↻) uppe till höger för att rensa all data och börja om.

## Integritetsinformation

- All data lagras uteslutande **lokalt i din webbläsare**
- Ingen data skickas till några servrar eller tredje parter
- Appen behöver inga TikTok-lösenord eller API-nycklar

## Licensiering

MIT
