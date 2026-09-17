# Documents (शोत्र/स्तोत्र) content source

One `<slug>.json` file per document (a stotram, a purana chapter, the Gita,
etc). `services/documents_db.py` seeds all of them into `data/documents.db`
(gitignored, rebuilt automatically) on the API's first request that needs it
— content-hash versioned, so editing or adding a file here and redeploying is
enough; nothing needs to be run by hand.

## Category

`category` picks which tab a document lands on in the app's `/documents`
library. Three values:

- `mantra` — a single short verse (Gayatri Mantra, Vakratunda Mahakaya).
- `stotram` — a multi-verse hymn or ashtakam (Shiva Tandava Stotram,
  Pashupatyashtakam).
- `scripture` — a larger canonical text seeded chapter by chapter (Bhagavad
  Gita, an Upanishad, the Ashtavakra Gita).

If omitted, it defaults to `stotram`.

## Shape

```jsonc
{
  "slug": "vishnu-sahasranama",       // unique, URL-safe — becomes /documents/<slug>
  "order_index": 10,                   // list-page sort order, ascending
  "category": "stotram",               // "mantra" | "stotram" | "scripture" — powers the /documents tabs
  "title_sa": "श्री विष्णुसहस्रनामस्तोत्रम्",   // Devanagari Sanskrit title
  "title_ne": "श्री विष्णु सहस्रनाम स्तोत्र",
  "title_en": "Shri Vishnu Sahasranama Stotram",
  "subtitle_ne": "१००८ नाम",           // optional
  "subtitle_en": "1008 names of Vishnu", // optional
  "description_ne": "...",             // optional, shown on the list card + detail header
  "description_en": "...",
  "source_ne": "महाभारत, अनुशासन पर्व", // optional attribution
  "source_en": "Mahabharata, Anushasana Parva",
  "cover_image": "documents/vishnu-sahasranama/cover.jpg", // R2 key, or a full https:// URL
  "has_chapters": false,               // true for multi-chapter works (e.g. the Gita)

  // R2 key prefix an "audio_file" is joined onto when it isn't already a full
  // URL. Keep it out of every verse row so moving a folder in R2 is a
  // one-line change here instead of touching every shloka.
  "audio_prefix": "documents/vishnu-sahasranama",

  // Optional: one continuous recording of the whole document (joined onto
  // audio_prefix the same way a verse's audio_file is, or a full URL). Powers
  // a "play full recording" control separate from the per-verse players —
  // this is a single uncut file, not the same audio re-split; upload both if
  // you want both experiences. Omit entirely if you only have per-verse clips.
  "full_audio_file": "vishnu-sahasranama-full.mp3",

  "chapters": [
    {
      "number": null,                  // null when has_chapters is false
      "title_ne": null,
      "title_en": null,
      "shlokas": [
        {
          "verse_number": 1,
          "verse_label": "1",          // the human-facing ref (matches your audio filenames)
          "sanskrit": "ॐ विश्वं विष्णुर्वषट्कारो भूतभव्यभवत्प्रभुः ।",
          "transliteration": "oṃ viśvaṃ viṣṇur-vaṣaṭkāro bhūta-bhavya-bhavat-prabhuḥ",
          "meaning_ne": "...",
          "meaning_en": "...",
          "audio_file": "1.mp3",       // joined onto audio_prefix; omit to disable audio for this verse
          "audio_duration_seconds": 14.2  // optional, used only as an initial scrubber hint
        }
      ]
    }
  ]
}
```

For a chaptered work, add one object per chapter to `chapters`, each with its
own `number` (1, 2, 3…) and `shlokas`. Match `verse_label`/`audio_file` to
however Cowchant named your files — the convention this app expects is
`{chapter}_{verse}.mp3` when chaptered (`1_1.mp3`, `1_2.mp3`, …) and
`{verse}.mp3` when not. If a file already follows that convention you can
omit `audio_file` entirely — the importer derives it from `audio_prefix` +
chapter/verse_number.

## Adding a new document

1. Copy `_example.json` in this folder to `<your-slug>.json`.
2. Fill in the Sanskrit, transliteration and meanings.
3. Upload the matching audio files to the R2 bucket under `audio_prefix`.
4. Commit + redeploy — the API reseeds `documents.db` automatically because
   the file content changed.

No migration, no manual DB step, no restart script — just the JSON file and
the audio in R2.
