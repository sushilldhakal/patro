# Atharvaveda numbering notes

The Ved Portal crawl (`vedcom_source/atharvaveda.jsonl`) is the verse list.
`scripts/align_atharvaveda_to_vedcom.py` rewrote `documents_source/atharvaveda.json`
so every mantra is the crawl's, in the crawl's order, with the crawl's label.

The book is now **5,928** verses, the same count as the crawl. **5,609** were
already the same mantra and were left in place, including the Nepali on
`1.1.1`–`1.23.2`. **169** same-label lines whose text did not agree were replaced
with the crawl's mantra. **150** crawl mantras were added (10 ordinary labels,
plus 67 and 73 paryaya mantras in 8.10 and 9.6). **301** of our old lines are
gone, and suktas 13.5–13.9 are gone with them: the crawl's kanda 13 ends at 13.4.

Paryaya suktas keep the crawl's four-part label (`8.10.1.1`). A clip stays only
where that place in the sukta is still the recorded mantra. Where the numbering
shifted, the sukta's audio cap stops at the last mantra that is still the one
that was recorded. `3.24.3` and `15.5.6`–`9` and `15.5.11`–`16` have no clip:
the recording there was a different or shorter line, and a later mantra in the
same sukta still has its own.

The sections below are the comparison that decided this (5 November 2026).
They describe the old book. The recommendations in them are superseded by the
paragraphs above.

**5,581** of the verses that already matched have a Hindi bhavartha. The other
28 of those have no Hindi block on the page, so `meaning_hi` stays null:
4.40.2–7, 5.9.1–6, 5.10.2–6, 5.25.12–13, 5.29.8, 6.17.2–4, 6.38.2–4, 6.58.3,
15.5.4. Replaced and added mantras take the crawl's Hindi where the page has one.

What the old book had, before it was aligned:

| Group | Count | What it is |
| --- | ---: | --- |
| Same label, text under 80% | 169 | 86 under 30%, and 83 between 30% and 80% |
| Our verse, no page on the site | 301 | See the sukta list below |
| Page on the site, no verse of ours under that label | 150 | 140 paryaya labels (8.10 and 9.6) plus 10 ordinary labels |

Headline counts match the report: ours 6,079, site 5,928, labels in common 5,778.
The 169 are everything under 80%, which is what the merger skips. They are not
all under 30%. The ones under 30% are usually a different verse at that number.
The ones between 30% and 80% are usually the same verse with a heading glued on,
a neighbour joined on, or a refrain repeated.

Recommendation for all of the groups below: leave the labels as they are.
Audio file names are built from the label. Any split, join, or renumber is a
separate decision.

## 1. Same label, text under 80% (169)

### 8.7 (24 verses, 8.7.4–27) — one mantra joined, then everything shifts by one

8.7.1–3 agree with the site and were merged. 8.7.4 holds the site's 8.7.4 and
the opening of the site's 8.7.5 (`यद्वः सहः`). From 8.7.5 on, our verse N is the
site's verse N+1 (agreement 98–100%). Our 8.7.27 is the site's 8.7.28
(`उत् त्वा हार्षं पञ्चशलात्`). The site has 28 mantras; we have 27.

Recommendation: nothing is missing. 8.7.4 is two site mantras in one verse, and
the rest are one number ahead. Splitting 8.7.4 would add a verse and shift
8.7.5–27. Leave it.

### 11.7 (25 verses, 11.7.2–26) — same pattern

11.7.1 agrees and was merged. 11.7.2 holds the site's 11.7.2 and the opening of
11.7.3 (`सन्नुच्छिष्टे`). From 11.7.3 on, our N is the site's N+1. Our 11.7.26
is the site's 11.7.27 (`देवाः पितरो मनुष्या`). The site has 27 mantras; we have 26.

Recommendation: same as 8.7. Leave it.

### 11.3.32–56 (25 verses) — one site mantra split into a refrain cycle

11.3.1–31 agree with the site and were merged. The site's 11.3 has 56 mantras;
ours has 164. From 11.3.32 the site keeps each limb of the odana passage as one
long mantra. We break that mantra into short lines and repeat the refrains.

11.3.32 is a chandas heading (`(२) ३२-४९ मन्त्रोक्ताः…`), not a mantra.
A typical cycle after that, ours beside the site's 11.3.36:

| Ours | First words | What it is |
| --- | --- | --- |
| 11.3.60 | `३५॥ ततश्चैनमन्यया जिह्वया` | opening of the site's 11.3.36 |
| 11.3.61 | `जिह्वा ते मरिष्यतीत्येनमाह` | the threat clause of that same mantra |
| 11.3.62 | `तं वा अहं नार्वाञ्चं` | refrain, repeated in many of our lines |
| 11.3.63 | `अग्नेर्जिह्वया` | the deity-limb clause |
| 11.3.64 | `तयैनं प्राशिषं` | refrain |
| 11.3.65 | `एष वा ओदनः सर्वाङ्गः` | refrain |
| 11.3.66 | `सर्वाङ्ग एव` | refrain |

The site's 11.3.36 is that whole sequence in one verse. Our number and the
site's number therefore stop matching. The lines that have no page (11.3.57–164)
are the rest of this cycle; see section 2.

Recommendation: do not merge on the label, and do not collapse the cycle. The
two editions divide the prose differently.

### 16.8.5–33 (29 verses) — the site's long round, our four short lines

16.8.1–4 agree and were merged. They are the four clauses the later rounds
repeat:

1. `जितमस्माकमुद्भिन्नम्` (16.8.1)
2. `तस्मादमुं निर्भजामः` (16.8.2)
3. a varying `स … पाशान्मा मोचि` (16.8.3 is `स ग्राह्याः`)
4. `तस्येदं वर्चस्तेजः` (16.8.4)

The site's 16.8.5–30 each repeat clause 1 as a long mantra and attach the
varying tail. Our 16.8.5 is `४। १` plus clause 1 only, so it agrees about 63%
with the site's 16.8.5. Our 16.8.6 is clause 2, 16.8.7 is `स निरृत्याः`,
16.8.8 is clause 4, and 16.8.9 starts the next round (`५। २`). The site has 33
mantras; we have 105. Verses 34–105 have no page (section 2).

Recommendation: leave the four-line rounds. Attaching the site's details to
16.8.5–33 by label would put one long mantra's details on a single short line.

### 15.2.14–28 (15 verses) — shorter lines, and a repeated formula

15.2.1–13 agree and were merged. From 15.2.14 the site joins two or three of
our short lines into one mantra, so the numbers slip. Checked pairs:

| Ours | First words | Site verse with the same text |
| --- | --- | --- |
| 15.2.15 | `मातरिश्वा च पवमानश्च` | 15.2.7 (the formula, said again) |
| 15.2.17 | `तं वैरूपं च वैराजं` | 15.2.16 |
| 15.2.18 | `वैरूपाय च वै स वैराजाय` | 15.2.17 |
| 15.2.20 | `इरा पुंश्चली` | 15.2.19 |
| 15.2.24 | `स उदतिष्ठत् स उदीचीं दिशम्` | 15.2.21 |
| 15.2.28 | `विद्युत् पुंश्चली` | 15.2.25 |

15.2.14 (`अमावास्या च पौर्णमासी`) is the first half of the site's longer 15.2.14,
which continues with the मातरिश्वा formula. Our 15.2.29–31 have no page; they
are the next short lines (`श्रुतं च विश्रुतं`, the मातरिश्वा formula, the
कीर्ति formula).

Recommendation: leave the short lines. The site's copy is the longer joined one.

### 15.5.6–16, except 15.5.10 (10 verses) — refrain kept as its own verse

15.5.10 still agrees with its own label and was merged. The refrain
`नास्य पशून् न समानान् हिनस्ति य एवं वेद` is its own verse in ours (15.5.6, 9,
12, 15, and again 18 and 21, which have no page). On the site that refrain is
15.5.3 and 15.5.16, and the direction-verses are single mantras. So our 15.5.7
is the site's 15.5.6 (`तस्मै प्रतीच्या दिशः`), and by 15.5.16 (`तस्मा ऊर्ध्वाया
दिशः`) we are on the site's 15.5.12. Our 15.5.17–21 continue the same pairs
past the site's last mantra (the site ends at 15.5.16).

Recommendation: leave the refrain as its own verses.

### 15.6.22–26 (5 verses) — one clause split off

15.6.1–21 agree and were merged. 15.6.22 is only `स दिशोऽनु व्यचलत्`. The site's
15.6.22 is that clause plus `तं विराडनु व्यचलत्`. Our 15.6.23 is the site's
15.6.22, and each following verse is the site's previous number, through our
15.6.27 (no page) = the site's 15.6.26.

Recommendation: leave the split. Our 15.6.27 is the site's last mantra, already
in the book one number earlier as a neighbour of 15.6.26.

### 13.4.3–7 (5 verses) — refrain repeated on every line

The site's 13.4.2 and 13.4.9 are the refrain by itself:
`रश्मिभिर्नभ आभृतं महेन्द्र एत्यावृतः`. Our 13.4.3–7 are the site's 13.4.3–7
with that refrain added on the end (agreement 61–69%). 13.4.1, 2, and 8–13
agree and were merged.

Recommendation: leave our longer lines. The refrain already has its own verses.

### 2.17.1–6 — two mantras in the first verse, then a shift of one

| Ours | First words | Site |
| --- | --- | --- |
| 2.17.1 | `ओजोऽस्योजो मे दाः स्वाहा ।१॥ सहोऽसि सहो मे दाः` | 2.17.1 and 2.17.2 joined |
| 2.17.2 | `बलमसि बलं मे दाः` | 2.17.3, with an extra `मे` |
| 2.17.3 | `आयुरस्यायुर्मे दाः` | 2.17.4 |
| 2.17.4 | `श्रोत्रमसि श्रोत्रं मे दाः` | 2.17.5 |
| 2.17.5 | `चक्षुरसि चक्षुर्मे दाः` | 2.17.6 |
| 2.17.6 | `परिपाणमसि परिपाणं मे दाः` | 2.17.7 |

The site-only label 2.17.7 is our 2.17.6. Nothing is absent.

Recommendation: leave it. Splitting 2.17.1 would add a verse and shift the rest.

### 6.56.1–2 — same join

Our 6.56.1 is the site's 6.56.1 (`मा नो देवा अहिरवधीत्`) and 6.56.2
(`नमोऽस्त्वसिताय`) in one verse, with `।।१।।` between them. Agreement of the
joined text with the two site mantras together is 98%. Our 6.56.2 is the site's
6.56.3 (`सं ते हन्मि दता दतः`), agreement 99%.

Recommendation: leave it. The site-only 6.56.3 is already our 6.56.2.

### 2.36.7 — the next mantra is joined on

2.36.1–6 agree and were merged. Our 2.36.7 is the site's 2.36.7
(`इदं हिरण्यं गुल्गुल्`) and, after `॥७`, the site's 2.36.8
(`आ ते नयतु सविता`). Small spelling differences (`अथो` / `अथो`, `धेह्योषधे` /
`धेहि ओषधे`) keep the single-label score at 73%.

Recommendation: leave it. 2.36.8 is not a missing verse; it sits at the end of 2.36.7.

### 11.5.25 — the next mantra is joined on

11.5.1–24 agree and were merged. Our 11.5.25 is the site's 11.5.25
(`चक्षुः श्रोत्रं यशः`) and, after `।२५॥`, the site's 11.5.26
(`तानि कल्पद् ब्रह्मचारी`).

Recommendation: leave it. The site-only 11.5.26 is the second half of our 11.5.25.

### 19.9.8–13 — one join, then a shift of one

19.9.1–7 agree and were merged. Our 19.9.8 is the site's 19.9.8
(`शं नो भूमिर्वेप्यमाना`) and, after `॥८`, the site's 19.9.9
(`नक्षत्रमुल्काभिहतं`). Then:

| Ours | Site verse with the same text |
| --- | --- |
| 19.9.9 `शं नो ग्रहाश्चान्द्रमसाः` | 19.9.10 |
| 19.9.10 `शं रुद्राः शं वसवः` | 19.9.11 |
| 19.9.11 `ब्रह्म प्रजापतिर्धाता` | 19.9.12 |
| 19.9.12 `यानि कानि चिच्छान्तानि` | 19.9.13 |
| 19.9.13 `पृथिवी शान्तिरन्तरिक्षं` | 19.9.14 |

Recommendation: leave it. The site-only 19.9.14 is our 19.9.13.

### 19.36.1–2 — the two verses are swapped

Our 19.36.1 (`शतवारो अनीनशत्`) is the site's 19.36.2. Our 19.36.2
(`शॄङ्गाभ्यां रक्षो नुदते`, the site spells `शृङ्गाभ्यां`) is the site's 19.36.1.
19.36.3–6 agree and were merged.

Recommendation: leave the order. Swapping the two labels would swap their audio files.

### 7.11.1 — a copy of the previous sukta

Our 7.11.1 is the same text as our 7.10.1 and as the site's 7.10.1
(`यस्ते स्तनः शशयुर्यो मयोभूः`). The site's 7.11.1 is a different mantra,
`यस्ते पृथु स्तनयित्नुः`, and that text is not in our file. Both suktas are a
single mantra, so this is the whole of 7.11.

Recommendation: leave 7.11.1. Replacing it with the site's 7.11.1 would change
the only verse of the sukta. That needs a decision.

### 20.98.1–2 — a copy of 20.97, while the site's 20.98 is another hymn

| Ours | Same text as | Site's verse under this label |
| --- | --- | --- |
| 20.98.1 `वयमेनमिदा ह्यपीपेमेह` | our 20.97.1, site 20.97.1 | `त्वामिद्धि हवामहे` |
| 20.98.2 `वृकश्चिदस्य वारणः` | our 20.97.2, site 20.97.2 | `स त्वं नश्चित्र वज्रहस्त` |
| 20.98.3 `कदू न्वस्याकृतम्` | our 20.97.3, site 20.97.3 | no page (the site's 20.98 ends at .2) |

The site's 20.98.1 and 20.98.2 do not occur elsewhere in our file (best match
elsewhere is under 45%).

Recommendation: leave 20.98 as the repeated 20.97. The site's two mantras are
absent, not joined onto a neighbour.

### 3.24.3 — the site joins the next mantra

3.24.1–2 and 3.24.4–7 agree and were merged. Our 3.24.3 is
`इमा याः पञ्च प्रदिशः`, the first half of the site's 3.24.3. The site's 3.24.3
continues with `उदुत्सं शतधारं`, which is our 3.24.4 and was merged as the
site's 3.24.4.

Recommendation: leave 3.24.3. Copying the site text onto it would repeat 3.24.4.

### 10.5.25, 10.5.36, 10.5.42 and 12.5.7, 12, 28, 39, 47, 62 — a heading glued on

These verses open with the sukta's section heading (rishi, devata, chandas),
and the mantra follows in the same verse.

| Ours | Heading, then the mantra | Site mantra |
| --- | --- | --- |
| 10.5.25 | `(५) ५-३५ … शक्वर्यतिशक्वरी।` then `विष्णोः क्रमोऽसि` | 10.5.25, agreement 79% |
| 10.5.36 | `११॥ (६) ३६-४१ …` then `जितमस्माकम्` | 10.5.36. `अभ्यऽष्ठां` in ours, `अभ्यष्ठां` on the site |
| 10.5.42 | `(७) ४२-५० …` then `यं वयं मृगयामहे` | 10.5.42, and the site mantra is contained in ours |
| 12.5.7 | `(2) (७-११) …` then `ओजश्च तेजश्च` | 12.5.7, contained |
| 12.5.12 | `(3) (१२-२७) …` then `सैषा भीमा ब्रह्मगव्या` | 12.5.12. Ours has `गव्य१घ`, the site `गव्यघ` |
| 12.5.28, 39, 47, 62 | a `(4)`–`(7)` chandas heading, then the mantra | the site's same-numbered mantra is contained in ours |

Recommendation: these are the same mantras, longer by the heading. They can be
accepted later with `--accept` if the heading should stay in the verse text, or
the heading can be lifted out first. Neither is done here.

## 2. Our verses with no page (301)

| Sukta | Verses | What they are |
| --- | --- | --- |
| 4.12.8–14 | 7 | A second copy of 4.12.1–7. 4.12.8 starts with the sukta heading `रोहिणी- वनस्पतिः। १-७ ऋभुः…` and then repeats 4.12.1 (`रोहण्यसि`). 4.12.9–14 repeat 4.12.2–7 word for word. |
| 8.10.1–22 | 22 | Paryaya sukta, grouped differently. Section 3. |
| 9.6.1–18 | 18 | Paryaya sukta, grouped differently. Section 3. |
| 11.3.57–164 | 108 | The rest of the refrain cycle in section 1. 11.3.158 is another chandas heading (`४९॥ (३) ५०-५६ मन्त्रोक्ताः…`). 11.3.159–164 are the site's 11.3.51–56 as separate short lines (`ब्रध्नलोको भवति` through `न च सर्वज्यानिं जीयते`). |
| 13.5–13.9 | 8+7+17+6+5 | The site's kanda 13 stops at 13.4 (14 mantras). See below. |
| 15.2.29–31 | 3 | Next short lines of the 15.2 cycle: `श्रुतं च विश्रुतं`, the मातरिश्वा formula, the कीर्ति formula. |
| 15.5.17–21 | 5 | The ऊर्ध्वा and ईशान pairs plus the `नास्य पशून्` refrain, past the site's last mantra. |
| 15.6.27 | 1 | `प्रजापतेश्च वै स परमेष्ठिनः`, the site's 15.6.26. |
| 16.8.34–105 | 72 | More four-line rounds of section 1. 16.8.33 is `११। ८` plus `जितमस्माकम्`, 16.8.34 is `तस्मादमुं`, 16.8.35 is `स ऋषीणां पाशान्मा मोचि`, 16.8.36 is `तस्येदं वर्चः`. The varying name in the third line keeps changing. |
| 20.93.9–29 | 21 | A second copy of sukta 20.92. See below. |
| 20.98.3 | 1 | A copy of 20.97.3. The site's 20.98 has two mantras. |

### 13.5–13.9

The site has four suktas in kanda 13. Our 13.5.1 is the site's 13.4.14 exactly:
`कीर्तिश्च यशश्चाम्भश्च नभश्च`. The other 13.5 lines add the refrain
`य एतं देवमेकवृतं वेद` and only partly overlap 13.4.11–13
(`स सर्वस्मै वि पश्यति` beside the site's `स प्रजाभ्यो वि पश्यति`, and so on).
13.5.2 is the refrain alone.

13.6–13.9 do not match any mantra of kanda 13 at 80% or above. Their best
overlap with a kanda-13 page is about 30–50% (for example 13.7.1
`स वा अह्नोऽजायत`, 13.8.1 `भूयानिन्द्रो नमुरात्`). They read as further prose of
this hymn, in lines the site does not number.

Recommendation: leave 13.5–13.9 as their own suktas. 13.5.1 is the site's last
mantra of 13.4, already present under the next sukta. Do not fold the later
suktas into 13.4 on this evidence.

### 20.93.9–29

20.93.1–8 agree with the site and were merged. The site's 20.93 ends at 8.
20.93.9 opens with an English credit, `By Dr. Sachchidanand Pathak, U.P.
Sanskrit Sansthan, Lucknow, India.`, and then the mantra `अभि प्र गोपतिं गिरे`.
That mantra is the site's 20.92.1 with one letter different (`सूतुं` in ours,
`सूनुं` on the site). 20.93.10–28 are our 20.92.2–20 word for word, and
20.93.29 is the site's 20.92.21 (agreement 98%; the same text is also our
20.81.2). So 20.93.9–29 is sukta 20.92 copied again, with the credit on the
first verse.

Recommendation: leave the copy. Deleting it, or stripping the credit, changes
the verse list.

## 3. Paryaya suktas 8.10 and 9.6

The site numbers these `kanda.sukta.paryaya.mantra`. Those 140 labels (8.10 has
67 mantras, 9.6 has 73) cannot match our `kanda.sukta.mantra` labels, so none
of either sukta was merged.

Paryaya sizes on the site:

| Sukta | Paryayas (mantra counts) |
| --- | --- |
| 8.10 | 13, 10, 8, 16, 16, 4 |
| 9.6 | 17, 13, 9, 10, 10, 14 |

### 8.10 — ours has 22 verses, the site has 67 mantras

Our 8.10.1 is the site's 8.10.1.1 (`विराड् वा इदमग्र आसीत्`).

Our 8.10.2 is the site's 8.10.1.2 through 8.10.1.5 in one verse, with the old
numbers still in the text:

`सोदक्रामत् सा गार्हपत्ये` (site 1.2) `।।२।। गृहमेधी गृहपतिर्भवति` (site 1.3)
`।।३।। सोदक्रामत् साहवनीये` (site 1.4) `।।४।। यन्त्यस्य देवा देवहूतिं` (site 1.5).

Our 8.10.3 starts at the site's 8.10.1.6 (`सोदक्रामत् सा दक्षिणाग्नौ`).
8.10.7, 8.10.17, and 8.10.21 are chandas headings, for example 8.10.7
`(७) (2) १-१०) १ त्रिपदा साम्नी अनुष्टुप्…`.
8.10.8–16 match the site's paryaya 2, mantras 8.10.2.2 through 8.10.2.10, one
for one (8.10.8 is 2.2, 8.10.16 is 2.10). 8.10.22 starts at the serpents
(`सोदक्रामत् सा सर्पानागच्छत्`), which is late in paryayas 4–5, and the heading
on 8.10.21 names those paryayas. Most of paryayas 3–6 are packed into those few
verses or are not present as their own lines.

Recommendation: do not renumber 8.10 onto the paryaya labels. A later split of
8.10.2 (and the other joined verses) would add mantras and change audio names.
The paryaya-2 run 8.10.8–16 is the cleanest place to attach details later,
without changing labels, if we map them by hand.

### 9.6 — ours has 18 verses, the site has 73 mantras

Our 9.6.1–17 are the site's paryaya 1, mantras 9.6.1.1 through 9.6.1.17
(agreement 95–100%). Our 9.6.1 is `यो विद्याद् ब्रह्म प्रत्यक्षं`, the site's
9.6.1.1. Our 9.6.18 is only the chandas heading for a following section
(`(२) १८-३० (१-१३) १ विराट् पुरस्ताद्बृहती…`). The text of paryayas 2–6 is not
in our 9.6.

Recommendation: leave 9.6. Our 9.6.1–17 can take the paryaya-1 details later by
a hand map (our N = site 1.N). Adding paryayas 2–6 would add 56 mantras. That
needs a decision.

## 4. Mantras only on the site

Ten ordinary labels, not the 140 paryaya labels. Where each one sits:

| Site label | First words | Where it sits in ours |
| --- | --- | --- |
| 2.6.5 | `अति निहो अति सृधः` | Not in our file. 2.6.1–4 match the site one for one, so this would be a new verse after 2.6.4. |
| 2.17.7 | `परिपाणमसि` | Already our 2.17.6. Joined-and-shifted, not missing. |
| 2.36.8 | `आ ते नयतु सविता` | Already the second half of our 2.36.7, after `॥७`. |
| 6.3.3 | `पातां नो देवाश्विना शुभस्पती` | Not in our file. 6.3.1–2 match the site one for one, so this would be a new verse after 6.3.2. |
| 6.56.3 | `सं ते हन्मि दता दतः` | Already our 6.56.2. |
| 8.7.28 | `उत् त्वा हार्षं पञ्चशलात्` | Already our 8.7.27. |
| 11.5.26 | `तानि कल्पद् ब्रह्मचारी` | Already the second half of our 11.5.25, after `।२५॥`. |
| 11.7.27 | `देवाः पितरो मनुष्या` | Already our 11.7.26. |
| 13.4.14 | `कीर्तिश्च यशश्चाम्भश्च` | Already our 13.5.1. |
| 19.9.14 | `पृथिवी शान्तिरन्तरिक्षं` | Already our 19.9.13. |

Only 2.6.5 and 6.3.3 look like mantras our book does not contain. The other
eight are already present under a neighbouring label.

Recommendation: do not add 2.6.5 or 6.3.3 until you say so. Adding either one
inserts a verse and shifts the audio names after it.

## 5. Settled by following the crawl

These are done. Each sukta is the crawl's mantra list.

1. Joined verses (2.17.1, 2.36.7, 6.56.1, 8.7.4, 11.5.25, 11.7.2, 19.9.8, 8.10.2, and the other joined paryaya lines) are separate mantras, numbered as the crawl numbers them.
2. 19.36.1 and 19.36.2 are in the crawl's order.
3. 7.11.1 is the crawl's `यस्ते पृथु स्तनयित्नुः`. 20.98.1–2 are the crawl's 20.98, and 20.98.3 is gone.
4. 2.6.5 and 6.3.3 are in the book.
5. The repeated copies are gone (4.12.8–14, 11.3.57–164, 16.8.34–105, 20.93.9–29), including the English credit on the old 20.93.9.
6. 8.10 and 9.6 use the crawl's paryaya labels. 9.6 paryayas 2–6 are in the book.
7. 10.5 and 12.5 no longer carry the section heading inside the mantra. 13.4.3–7 are the crawl's lines, without our extra refrain. 13.4.14 is the crawl's last mantra of that sukta, and 13.5–13.9 are removed.

Details were copied as the site labels them. On some later suktas the site's own
fields look exchanged: 14.1.1 has devata `अनुष्टुप्`, rishi `सोम`, chhanda
`सवित्री, सूर्या`; 18.1.1 has devata `त्रिष्टुप्`, rishi `यम, मन्त्रोक्त`, chhanda
`अथर्वा`. Checked against the live pages, the crawl matches the site. Those
merged verses were left that way.
