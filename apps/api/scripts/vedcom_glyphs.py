"""Private-use characters in the Ved Portal's accented text, and what they stand for.

The site writes some Vedic signs with glyphs of its own font, which are private-use codepoints
(U+E000–F8FF): they draw as a "?" box everywhere else. Each mapping below was read off a second
text of the same mantras, by aligning the two and seeing what it had at that spot:

* our own earlier text of the mantra (from another digitisation, before the portal text replaced it):
  Atharvaveda sanskrit U+F11E -> ऽ (407 of 629 spots), U+F184 -> ॑ (195 of 209), U+F185 -> nothing
  (195 of 222); Yajurveda sanskrit U+F15C -> ᳪ (309 of 327); Samaveda sanskrit and svara line
  U+F193, U+F195 -> nothing (every spot has none in the earlier text).
* the padapatha's own conventions (it has no accent marks, and uses ऽ to join the parts of a
  compound; Rigveda U+F11F sits exactly there); Atharvaveda padapatha U+F11E sits inside plain
  words (वीर्याणि, स्वर्यम्), where the samhita carries an accent, so it is dropped; Yajurveda
  padapatha U+F15C is ᳪ, or ꣳ where the same word in the verse's samhita text has ꣳ; Samaveda
  padapatha U+F197 -> ऽ (before "iti"), U+F193 -> nothing.

Also: Rigveda sanskrit U+F131 -> ः (4.2.6: our earlier text has it); Samaveda padapatha U+E001 -> ं
(पांसुले, अंऽशुमतीम्). Signs with no second text to read them off (Rigveda padapatha U+F130; Samaveda
padapatha U+F192, U+F1AA; Yajurveda U+F1A3 at 38.24 and Atharvaveda U+F1A2/U+F130, fixed by hand) are left as the site wrote them.
"""

from __future__ import annotations

GLYPHS: dict[tuple[str, str], dict[str, str]] = {
    ("atharvaveda", "sanskrit"): {"\uf11e": "\u093d", "\uf184": "\u0951", "\uf185": ""},
    ("atharvaveda", "padapatha"): {"\uf11e": ""},
    ("yajurveda", "sanskrit"): {"\uf15c": "\u1cea"},
    ("yajurveda", "padapatha"): {"\uf15c": "\u1cea"},
    ("rigveda", "sanskrit"): {"\uf131": "\u0903"},
    ("rigveda", "padapatha"): {"\uf11f": "\u093d"},
    ("samaveda", "sanskrit"): {"\uf193": ""},
    ("samaveda", "sanskrit_swara"): {"\uf193": "", "\uf195": ""},
    ("samaveda", "padapatha"): {"\uf197": "\u093d", "\uf193": "", "\ue001": "\u0902"},
}


def clean(veda: str, field: str, text: str | None) -> str | None:
    if not text:
        return text
    for glyph, sign in GLYPHS.get((veda, field), {}).items():
        text = text.replace(glyph, sign)
    return text


def clean_sanskrit(veda: str, text: str | None) -> str | None:
    return clean(veda, "sanskrit", text)
