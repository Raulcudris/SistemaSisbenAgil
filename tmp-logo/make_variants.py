from pathlib import Path

OUT = Path(r"C:\React\DispensaMasterV2\tmp-logo")
NAVY = "#003B5C"
BLUE = "#2F80ED"
ORANGE = "#F5A623"

D_PATH = (
    "M 62 28 H 100 C 140 28 168 56 168 100 C 168 144 140 172 100 172 "
    "H 62 C 47 172 36 161 36 146 V 54 C 36 39 47 28 62 28 Z "
    "M 66 58 H 98 C 120 58 138 76 138 100 C 138 124 120 142 98 142 "
    "H 66 C 60 142 56 138 56 132 V 68 C 56 62 60 58 66 58 Z"
)


def icon(clip: str, mask_id: str):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 200 200">
  <defs>
    <clipPath id="right"><path d="{clip}"/></clipPath>
    <mask id="{mask_id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
      <rect width="200" height="200" fill="#fff"/>
      <g fill="#000">
        <rect x="64" y="154" width="8" height="4" rx="2"/>
        <rect x="77" y="154" width="8" height="4" rx="2"/>
        <rect x="90" y="154" width="8" height="4" rx="2"/>
      </g>
    </mask>
  </defs>
  <g mask="url(#{mask_id})">
    <path d="{D_PATH}" fill="{BLUE}" fill-rule="evenodd"/>
    <path d="{D_PATH}" fill="{ORANGE}" fill-rule="evenodd" clip-path="url(#right)"/>
    <g fill="{NAVY}">
      <rect x="80" y="82" width="8" height="8" rx="1.5"/>
      <rect x="94" y="82" width="8" height="8" rx="1.5"/>
      <rect x="108" y="82" width="8" height="8" rx="1.5"/>
      <rect x="80" y="96" width="8" height="8" rx="1.5"/>
      <rect x="108" y="96" width="8" height="8" rx="1.5"/>
      <rect x="80" y="110" width="8" height="8" rx="1.5"/>
      <rect x="94" y="110" width="8" height="8" rx="1.5"/>
      <rect x="108" y="110" width="8" height="8" rx="1.5" fill="{ORANGE}"/>
    </g>
  </g>
</svg>'''


variants = {
    "v": "M 100 0 L 200 0 L 200 200 L 100 200 L 112 100 Z",
    "diag82": "M 82 0 L 200 0 L 200 200 L 100 200 Z",
    "diag88": "M 88 0 L 200 0 L 200 200 L 104 200 Z",
    "diag76": "M 76 0 L 200 0 L 200 200 L 96 200 Z",
}
for name, clip in variants.items():
    (OUT / f"icon-{name}.svg").write_text(icon(clip, f"mask-{name}"), encoding="utf-8")
print("ok")
