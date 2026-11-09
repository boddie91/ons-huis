# Ons Huis

Een gedeeld huishouddashboard als poppenhuis. Kamers en voorwerpen verwelken of stralen afhankelijk van wat er bijgehouden is, met seizoenen, live weer, een kalender met verjaardagen en feestdagen, punten, beloningen en swipen voor gezamenlijke wensen.

Het draait als web-app op laptop en iPhone, los van Claude. Er is geen inlog: elk apparaat vult één keer de **huiscode** in en kiest daarna **wie je bent**.

---

## Installeren in vier stappen

Totaal ongeveer een kwartier. Alles is gratis.

### 1. Database aanmaken (Supabase)

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account (inloggen met GitHub kan).
2. Klik op **New project**. Naam: `ons-huis`. Kies een databasewachtwoord (bewaar het ergens; de app heeft het niet nodig). Regio: **West EU (Ireland)** of **Central EU (Frankfurt)**.
3. Wacht tot het project klaar is (een minuut of twee).
4. Open links **SQL Editor**, klik op **New query** en plak de hele inhoud van [`supabase.sql`](supabase.sql).
5. Vervang op de laatste regel `KIES-HIER-JULLIE-CODE` door jullie eigen huiscode. Neem minstens 6 tekens, bijvoorbeeld twee woorden: `zonnebloem-vlonder`.
6. Klik op **Run**. Je ziet "Success. No rows returned".

### 2. De app aan de database koppelen

1. Ga in Supabase naar **Project Settings → API** (of **API Keys**).
2. Kopieer de **Project URL** (bijv. `https://abcdefgh.supabase.co`).
3. Kopieer de **anon public**-sleutel of de **publishable**-sleutel (begint met `eyJ…` of `sb_publishable_…`). Gebruik nooit de `service_role`- of `secret`-sleutel.
4. Open in deze repository het bestand [`config.js`](config.js), klik op het potloodje en vul beide in tussen de aanhalingstekens. Klik op **Commit changes**.

De sleutel mag openbaar zijn: zonder huiscode kan niemand iets lezen of wijzigen.

### 3. Online zetten (GitHub Pages)

1. Ga in deze repository naar **Settings → Pages**.
2. Bij **Source**: kies **Deploy from a branch**, branch **main**, map **/ (root)**, en klik op **Save**.
3. Na een minuutje staat de app op `https://boddie91.github.io/ons-huis/`.

### 4. Op de iPhone zetten

1. Open het adres in **Safari**.
2. Tik op het deelknopje en kies **Zet op beginscherm**.
3. Open de app vanaf het beginscherm, vul de huiscode in en kies wie je bent.

De eerste keer vraagt de app jullie namen en woonplaats, en of je met de startset van taken wilt beginnen. Dat hoeft maar één van jullie te doen.

Op de laptop werkt het in elke browser. In Chrome of Edge kun je het via het installatie-icoontje in de adresbalk ook als app installeren.

---

## Goed om te weten

- **Proefmodus.** Zolang `config.js` leeg is, werkt alles, maar alleen op dat ene apparaat.
- **Synchroniseren.** Wijzigingen verschijnen binnen een halve minuut op het andere apparaat, en meteen zodra je de app opent.
- **Weer.** Komt van [Open-Meteo](https://open-meteo.com) (gratis, zonder account) voor de ingestelde woonplaats. Sneeuw, vorst in de verwachting en storm maken de bijbehorende taken vanzelf wakker. Je kunt het weer ook voor één dag zelf instellen.
- **Foto's** worden verkleind en in de database bewaard. Het gratis Supabase-plan heeft 500 MB, genoeg voor honderden foto's.
- **Huiscode wijzigen.** Pas de code aan in de laatste regel van `supabase.sql` en voer alleen die regel opnieuw uit in de SQL Editor. Elk apparaat vraagt dan om de nieuwe code.
- **Slapend project.** Supabase zet een gratis project op pauze na een week zonder gebruik. Bij dagelijks gebruik gebeurt dat niet. Gebeurt het toch, klik dan in Supabase op **Restore**.
- **Anoniem swipen** is op vertrouwen gebaseerd: de app laat elkaars keuzes niet zien, maar wie bewust van persoon wisselt, kan ze wel achterhalen.

## Bestanden

| Bestand | Wat het doet |
|---|---|
| `index.html` | Opmaak en het poppenhuis |
| `app.js` | Alle logica: taken, seizoenen, weer, kalender, punten, beloningen, foto's |
| `store.js` | Praat met de database (of met het apparaat in proefmodus) |
| `config.js` | Jullie Supabase-adres en -sleutel |
| `seed.js` | De startset met terugkerende taken |
| `supabase.sql` | Database-inrichting met huiscode-controle |
| `sw.js`, `manifest.webmanifest`, `icons/` | Maken er een installeerbare app van die ook offline opent |

## Later uit te breiden

- **Pushmeldingen** (bijv. "morgen vorst: zout strooien"): vraagt een klein serverfunctietje in Supabase met een dagelijkse planning.
- **Vraagbaak en foto's laten bekijken** met een eigen Claude-API-sleutel.
- **Ecovacs, robotmaaier en Woning-app** via Home Assistant.
