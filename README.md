# Nepali Panchanga Patro API

REST API for **Nepali festival dates**, **daily panchanga**, and **Bikram Sambat (BS) Patro** calendars. Calculations use Swiss Ephemeris (Lahiri ayanamsa) with Kathmandu as the default observer location.

**Production:** https://patro.onrender.com  
**Interactive docs:** https://patro.onrender.com/docs

---

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

Local base URL: `http://localhost:8080`

---

## Common query parameters

Most endpoints accept optional location overrides. Omitted values default to Kathmandu.

| Parameter   | Type   | Default           | Description                          |
|------------|--------|-------------------|--------------------------------------|
| `lat`      | float  | `27.7172`         | Observer latitude (−90 to 90)        |
| `lon`      | float  | `85.3240`         | Observer longitude (−180 to 180)     |
| `timezone` | string | `Asia/Kathmandu`  | IANA timezone for sunrise/sunset     |

**Example**

```
GET /holidays/2083?lat=28.2&lon=83.9&timezone=Asia/Kathmandu
```

---

## API endpoints

### Health

#### `GET /health`

Liveness check and startup cache status.

**Response `200`**

```json
{
  "status": "ok",
  "precomputed_bs_years": [2082, 2083, 2084]
}
```

`precomputed_bs_years` lists BS years warmed on the last server startup (may be `[]` if cache already existed or precompute is disabled).

---

### Holidays (cache-backed)

Holiday lists use **Bikram Sambat years** (e.g. `2083`). `GET` reads from precomputed cache only — no runtime ephemeris. Use `POST /generate/{year}` or startup precompute to populate cache first.

#### `POST /generate/{year}`

Precompute and persist the holiday cache for a BS year. Runs Swiss Ephemeris (typically a few seconds).

| Path param | Type | Range        | Description   |
|-----------|------|--------------|---------------|
| `year`    | int  | 2000 – 2200  | Bikram Sambat year |

**Response `200`**

```json
{
  "status": "generated",
  "bs_year": 2083,
  "gregorian_range": {
    "start": "2026-04-14",
    "end": "2027-04-13"
  },
  "count": 20,
  "cache_key": "27.7172_85.3240_Asia/Kathmandu",
  "generated_at": "2026-06-07T13:39:15.152733+00:00"
}
```

**Example**

```bash
curl -X POST https://patro.onrender.com/generate/2083
```

---

#### `GET /holidays/{year}`

Return festivals for a BS year from cache (instant).

| Path param | Type | Range        | Description   |
|-----------|------|--------------|---------------|
| `year`    | int  | 2000 – 2200  | Bikram Sambat year |

| Query param | Type | Description                                      |
|------------|------|--------------------------------------------------|
| `month`    | int  | Optional BS month filter (1–12)                  |
| `lat`      | float| Observer latitude                                |
| `lon`      | float| Observer longitude                               |
| `timezone` | string | IANA timezone                                  |

**Response `200`**

```json
{
  "bs_year": 2083,
  "gregorian_range": {
    "start": "2026-04-14",
    "end": "2027-04-13"
  },
  "location": {
    "lat": 27.7172,
    "lon": 85.324,
    "timezone": "Asia/Kathmandu",
    "name": "Kathmandu"
  },
  "count": 20,
  "holidays": [
    {
      "id": "bs-new-year",
      "name_en": "Nepali New Year",
      "name_ne": "नयाँ वर्ष",
      "start_date": "2026-04-14",
      "end_date": "2026-04-14",
      "duration_days": 1,
      "type": "solar",
      "category": "national",
      "importance": "national",
      "notes": "Mesh Sankranti, Baishakh 1"
    }
  ],
  "rule_version": "v3",
  "engine_version": "1.0.0",
  "rules_hash": "abc123def456",
  "location_key": "27.7172_85.3240_Asia/Kathmandu",
  "generated_at": "2026-06-07T13:39:15.152733+00:00",
  "hash": "a1b2c3d4e5f6"
}
```

When `month` is set, the response also includes `"bs_month": 5` and a filtered `holidays` list.

**Errors**

| Status | When |
|--------|------|
| `400`  | Invalid BS year or location |
| `404`  | Cache not found — call `POST /generate/{year}` first |

**Examples**

```bash
# Full BS year
curl https://patro.onrender.com/holidays/2083

# BS month only (e.g. Kartik = 7)
curl "https://patro.onrender.com/holidays/2083?month=7"
```

---

#### `GET /day/{target_date}`

Festivals active on a specific Gregorian date, plus udaya tithi summary.

| Path param     | Type | Format       | Example      |
|---------------|------|--------------|--------------|
| `target_date` | date | `YYYY-MM-DD` | `2026-10-20` |

**Response `200`**

```json
{
  "date": "2026-10-20",
  "location": { "lat": 27.7172, "lon": 85.324, "timezone": "Asia/Kathmandu", "name": "Kathmandu" },
  "panchanga": {
    "tithi": 5,
    "paksha": "shukla",
    "name": "Panchami"
  },
  "count": 1,
  "holidays": [ "..." ],
  "rule_version": "v3",
  "engine_version": "1.0.0",
  "generated_at": "..."
}
```

**Example**

```bash
curl https://patro.onrender.com/day/2026-10-20
```

---

### Panchanga

#### `GET /panchanga/{target_date}`

Full daily panchanga at sunrise (udaya) in Nepali Patro style: BS/NS/Gregorian display headers, tithi/nakshatra/yoga/karana with end times and उपरान्त (next element), adhik paksha labels, dinamaan (घडी/पला), Uttarayana/Dakshinayana, chandra/surya rashi, ritu, Lahiri ayanamsa, sun/moon times, planetary positions, and optional festivals.

| Path param     | Type | Format       |
|---------------|------|--------------|
| `target_date` | date | `YYYY-MM-DD` |

| Query param | Type  | Default | Description                    |
|------------|-------|---------|--------------------------------|
| `festivals`| bool  | `true`  | Include active festivals       |
| `lat`      | float | —       | Observer latitude              |
| `lon`      | float | —       | Observer longitude             |
| `timezone` | string| —       | IANA timezone                  |

**Response `200`** (abbreviated)

```json
{
  "date": "2026-06-07",
  "display": {
    "bs_ne": "वि.सं. २०८३ जेठ २४ आइतवार",
    "gregorian_en": "2026 Jun 7, Sunday",
    "ns_ne": "ने.सं. ११४६ अनालागा सप्तमी - 22"
  },
  "bs_date": { "year": 2083, "month": 2, "day": 24, "month_name_ne": "जेठ" },
  "ns_date": {
    "year": 1146,
    "label_ne": "अनालागा सप्तमी - 22",
    "paksha_ne": "अनालागा",
    "tithi_absolute": 22
  },
  "sunrise": { "local_time_short": "05:08" },
  "sunset": { "local_time_short": "18:58" },
  "moonrise": { "local_time_short": "00:00" },
  "moonset": { "local_time_short": "11:02" },
  "dinamaan": { "ghadi": 34, "pala": 35, "label_ne": "34 घडी 35 पला", "label_en": "13hr 50min" },
  "aayan": { "name": "Uttarayana", "name_ne": "उत्तरायण" },
  "lahiri_ayanamsa": { "name": "Lahiri", "degrees": 24.226308 },
  "paksha": { "label_ne": "अधिक जेठ कृष्ण पक्ष", "is_adhik": true },
  "tithi": {
    "name_ne": "सप्तमी",
    "end_ghati_clock": "56:21:35",
    "end_hours_clock": "22:32:38",
    "next": { "name_ne": "अष्टमी" }
  },
  "nakshatra": {
    "name_ne": "धनिष्ठा",
    "end_ghati_clock": "3:03:41",
    "next": { "name_ne": "शतभिषा" }
  },
  "yoga": {
    "name_ne": "वैधृति",
    "end_ghati_clock": "5:09:22",
    "next": { "name_ne": "विष्कुम्भ" }
  },
  "karana": {
    "name_ne": "विष्टि",
    "end_ghati_clock": "10:16:06",
    "next": { "name_ne": "बव", "end_ghati_clock": "56:21:35" }
  },
  "chandra_rashi": { "name_ne": "कुम्भ" },
  "ritu": { "name_ne": "ग्रीष्म", "season": "Summer" },
  "planets": { "sun": {}, "moon": {}, "mars": {} },
  "festivals": []
}
```

**Example**

```bash
curl "https://patro.onrender.com/panchanga/2026-06-07?festivals=true"
```

---

### Patro (BS calendar)

#### `GET /patro/{bs_year}/{bs_month}`

One Bikram Sambat month as a day-by-day grid with panchanga and festivals per cell.

| Path param | Type | Range       |
|-----------|------|-------------|
| `bs_year` | int  | 2000 – 2200 |
| `bs_month`| int  | 1 – 12      |

| Query param  | Type  | Default | Description                         |
|-------------|-------|---------|-------------------------------------|
| `panchanga` | bool  | `true`  | Include daily panchanga per day     |
| `lat`       | float | —       | Observer latitude                   |
| `lon`       | float | —       | Observer longitude                  |
| `timezone`  | string| —       | IANA timezone                       |

**Response `200`** (structure)

```json
{
  "bs_year": 2083,
  "bs_month": 1,
  "bs_month_name": "Baisakh",
  "bs_month_name_ne": "वैशाख",
  "month_start": "2026-04-14",
  "month_length": 31,
  "location": { "..." },
  "days": [
    {
      "bs_day": 1,
      "date": "2026-04-14",
      "festivals": [ "..." ],
      "panchanga": { "vaara": {}, "tithi": {}, "nakshatra": {}, "yoga": {}, "karana": {}, "lunar_month": {}, "markers": {}, "sunrise": "...", "sunset": "..." }
    }
  ],
  "rule_version": "v3",
  "generated_at": "..."
}
```

Set `panchanga=false` for a lighter response (dates and festivals only).

**Example**

```bash
curl https://patro.onrender.com/patro/2083/1
```

---

#### `GET /patro/{bs_year}`

Full BS year Patro: all 12 months plus a consolidated festival index.

| Path param | Type | Range       |
|-----------|------|-------------|
| `bs_year` | int  | 2000 – 2200 |

| Query param  | Type  | Default | Description                    |
|-------------|-------|---------|--------------------------------|
| `panchanga` | bool  | `true`  | Include panchanga in each month|
| `lat`       | float | —       | Observer latitude              |
| `lon`       | float | —       | Observer longitude             |
| `timezone`  | string| —       | IANA timezone                  |

**Response `200`** (structure)

```json
{
  "bs_year": 2083,
  "gregorian_range": { "start": "2026-04-14", "end": "2027-04-13" },
  "location": { "..." },
  "months": [ "..." ],
  "festivals": [ "..." ],
  "festival_count": 20,
  "rule_version": "v3",
  "generated_at": "..."
}
```

**Example**

```bash
curl "https://patro.onrender.com/patro/2083?panchanga=false"
```

---

## Endpoint summary

| Method | Path                         | Description                              |
|--------|------------------------------|------------------------------------------|
| `GET`  | `/health`                    | Health check                             |
| `POST` | `/generate/{year}`           | Precompute BS-year holiday cache         |
| `GET`  | `/holidays/{year}`           | BS-year festivals (cache-only)           |
| `GET`  | `/day/{target_date}`         | Festivals + tithi for one Gregorian day  |
| `GET`  | `/panchanga/{target_date}`   | Full daily panchanga                     |
| `GET`  | `/patro/{bs_year}/{bs_month}`| BS month Patro grid                      |
| `GET`  | `/patro/{bs_year}`           | Full BS year Patro                       |

---

## Cache and deployment

Holiday `GET` endpoints are **cache-only** for fast responses. On ephemeral hosts (e.g. Render), cache is rebuilt on startup or via `POST /generate/{year}`.

| Environment variable      | Default | Description                                      |
|---------------------------|---------|--------------------------------------------------|
| `PRECOMPUTE_ON_STARTUP`   | `true`  | Warm missing BS-year caches when the app starts  |
| `PRECOMPUTE_BS_SPAN`      | `1`     | Years before/after current BS year to warm       |
| `PRECOMPUTE_BS_YEARS`     | —       | Explicit list, e.g. `2082,2083,2084,2085`       |

**CLI precompute** (Gregorian years, for cron jobs):

```bash
python scripts/precompute.py --start 2026 --years 10
```

---

## Project layout

```
app.py                 # FastAPI routes
core/                  # Ephemeris, location, time utilities
panchanga/             # Tithi, BS calendar, daily panchanga
rules/                 # Festival rule engine + festival_rules_v3.json
service/               # Holiday cache, Patro generation, startup warm
scripts/precompute.py  # Offline cache generation
cache/                 # Generated JSON (gitignored, created at runtime)
```

---

## License

Add your license here.
