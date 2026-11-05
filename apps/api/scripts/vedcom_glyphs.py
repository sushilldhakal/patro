"""Private-use characters in the Ved Portal's accented text, and what they stand for.

The site writes some Vedic signs with glyphs of its own font, which are private-use codepoints
(U+E000–F8FF): they draw as a "?" box everywhere else. Each mapping below was read off our own
earlier text of the same mantra (from another digitisation, before the portal text replaced it),
by aligning the two and seeing what ours had at that spot:

* Atharvaveda U+F11E -> ऽ avagraha (407 of 629 spots; most of the rest sit beside another such sign)
* Atharvaveda U+F184 -> ॑ udatta (195 of 209)
* Atharvaveda U+F185 -> nothing: ours has no sign there (195 of 222), so it is a placeholder
* Yajurveda  U+F15C -> ᳪ vamagomukha anusvara (309 of 327)

Signs seen only in the padapatha, the Rigveda and Samaveda texts, and the pair U+F1A2 U+F130 in
Atharvaveda 1.6.4, have no earlier text to read them off, so they are left as the site wrote them.
"""

from __future__ import annotations

SANSKRIT_GLYPHS: dict[str, dict[str, str]] = {
    "atharvaveda": {"": "ऽ", "": "॑", "": ""},
    "yajurveda": {"": "ᳪ"},
}


def clean_sanskrit(veda: str, text: str | None) -> str | None:
    if not text:
        return text
    for glyph, sign in SANSKRIT_GLYPHS.get(veda, {}).items():
        text = text.replace(glyph, sign)
    return text
