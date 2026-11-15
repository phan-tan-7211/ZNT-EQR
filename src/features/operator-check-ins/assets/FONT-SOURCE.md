# Report PDF font

`ZNTEQR-Report-KR-VI.ttf` is derived from the regular (weight 400) instance of
Google Fonts' Noto Sans KR variable TTF. The source is
`https://github.com/google/fonts/blob/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf`
(SHA-256 `194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252`).

The static instance was subset with fontTools to Latin/Vietnamese, Hangul/Jamo,
common punctuation and currency symbols. This excludes CJK ideographs; it is
intended to cover Vietnamese and Korean Hangul text, not arbitrary Han characters.
Subset SHA-256: `03ac58d60ebde4e1fe26f2020948834ebedcd022f7917b4db6aba1b096cf94a5`.

The font is distributed under the SIL Open Font License 1.1 in `OFL.txt`.
It is loaded through `src/utils/reportPdfFont.ts` and fetched only when exporting
a PDF: Operator Check-in reports and the tooling PDFs (tooling register,
customer-owned tooling report, tool history and QR label sheets).
