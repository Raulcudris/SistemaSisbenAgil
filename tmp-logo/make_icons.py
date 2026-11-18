from pathlib import Path

OUT = Path(r"C:\React\DispensaMasterV2\tmp-logo")
OUT.mkdir(exist_ok=True)

NAVY = "#003B5C"
BLUE = "#2F80ED"
ORANGE = "#F5A623"

D_PATH = (
    "M 62 28 H 100 "
    "C 140 28 168 56 168 100 "
    "C 168 144 140 172 100 172 "
    "H 62 C 47 172 36 161 36 146 "
    "V 54 C 36 39 47 28 62 28 Z "
    "M 66 58 H 98 "
    "C 120 58 138 76 138 100 "
    "C 138 124 120 142 98 142 "
    "H 66 C 60 142 56 138 56 132 "
    "V 68 C 56 62 60 58 66 58 Z"
)

CLIP = "M 100 0 L 200 0 L 200 200 L 100 200 L 112 100 Z"


def icon(variant: str) -> str:
    qr = ""
    perf = ""
    if variant in {"b", "c"}:
        qr = """
        <g fill="#003B5C">
          <rect x="80" y="82" width="8" height="8" rx="1.5"/>
          <rect x="94" y="82" width="8" height="8" rx="1.5"/>
          <rect x="108" y="82" width="8" height="8" rx="1.5"/>
          <rect x="80" y="96" width="8" height="8" rx="1.5"/>
          <rect x="108" y="96" width="8" height="8" rx="1.5"/>
          <rect x="80" y="110" width="8" height="8" rx="1.5"/>
          <rect x="94" y="110" width="8" height="8" rx="1.5"/>
          <rect x="108" y="110" width="8" height="8" rx="1.5" fill="#F5A623"/>
        </g>
        """
    if variant in {"c"}:
        perf = """
        <g fill="#FFFFFF">
          <rect x="64" y="154" width="9" height="4" rx="2"/>
          <rect x="78" y="154" width="9" height="4" rx="2"/>
          <rect x="92" y="154" width="9" height="4" rx="2"/>
        </g>
        """
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <clipPath id="right"><path d="{CLIP}"/></clipPath>
  </defs>
  <path d="{D_PATH}" fill="{BLUE}" fill-rule="evenodd"/>
  <path d="{D_PATH}" fill="{ORANGE}" fill-rule="evenodd" clip-path="url(#right)"/>
  {qr}
  {perf}
</svg>'''


def sheet() -> str:
    labels = [("a", "A · D limpia"), ("b", "B · D + QR"), ("c", "C · D + QR + troquel")]
    cards = []
    for i, (variant, label) in enumerate(labels):
        x = 30 + i * 340
        cards.append(f'<g transform="translate({x},40)"><rect width="300" height="300" rx="32" fill="#F4F5F7"/>')
        cards.append(f'<g transform="translate(50,50) scale(1.0)">{icon(variant)}</g>')
        cards.append(f'<text x="150" y="285" text-anchor="middle" font-family="Segoe UI, Arial" font-size="17" font-weight="700" fill="#0F172A">{label}</text></g>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="380" viewBox="0 0 1080 380">
  <rect width="1080" height="380" fill="#FFFFFF"/>
  {''.join(cards)}
</svg>'''


for variant in ("a", "b", "c"):
    (OUT / f"icon-{variant}.svg").write_text(icon(variant), encoding="utf-8")
(OUT / "icon-sheet.svg").write_text(sheet(), encoding="utf-8")
print("ok")
