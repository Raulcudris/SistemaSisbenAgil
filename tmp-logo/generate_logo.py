from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = Path(r"C:\React\DispensaMasterV2\tmp-logo")
OUT.mkdir(exist_ok=True)

BLACK = "#0F172A"
RED = "#E11D2E"
RED_LIGHT = "#FF6B6B"
RED_SOFT = "#FCA5A5"
WHITE = "#FFFFFF"
BORDER = "#E5E7EB"

EXTRA = OUT / "Montserrat-ExtraBold.ttf"
SEMI = OUT / "Montserrat-SemiBold.ttf"

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


def _metrics(font_file):
    font = TTFont(str(font_file))
    return font, font.getBestCmap(), font.getGlyphSet(), font["hmtx"], font["head"].unitsPerEm


def text_path(text, font_file, size, x, baseline, tracking=0.0):
    font, cmap, glyphs, hmtx, upm = _metrics(font_file)
    scale = size / upm
    pen = SVGPathPen(glyphs)
    cursor = x
    for char in text:
        glyph_name = cmap.get(ord(char))
        if glyph_name is None:
            raise ValueError(f"Glifo no encontrado para {char!r}")
        tpen = TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline))
        glyphs[glyph_name].draw(tpen)
        cursor += hmtx[glyph_name][0] * scale + tracking
    return pen.getCommands(), cursor - x


def text_width(text, font_file, size, tracking=0.0):
    font, cmap, glyphs, hmtx, upm = _metrics(font_file)
    scale = size / upm
    total = 0.0
    for char in text:
        glyph_name = cmap.get(ord(char))
        if glyph_name is None:
            raise ValueError(f"Glifo no encontrado para {char!r}")
        total += hmtx[glyph_name][0] * scale + tracking
    return total


def icon(include_qr=True, mask_id="dt-ticket-cut"):
    qr = ""
    if include_qr:
        qr = f"""
        <g fill="{BLACK}">
          <rect x="80" y="82" width="8" height="8" rx="1.5"/>
          <rect x="94" y="82" width="8" height="8" rx="1.5"/>
          <rect x="108" y="82" width="8" height="8" rx="1.5"/>
          <rect x="80" y="96" width="8" height="8" rx="1.5"/>
          <rect x="108" y="96" width="8" height="8" rx="1.5"/>
          <rect x="80" y="110" width="8" height="8" rx="1.5"/>
          <rect x="94" y="110" width="8" height="8" rx="1.5"/>
          <rect x="108" y="110" width="8" height="8" rx="1.5" fill="{RED}"/>
        </g>
        """
    clip_id = f"{mask_id}-right"
    return f'''<g>
  <defs>
    <clipPath id="{clip_id}"><path d="{CLIP}"/></clipPath>
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
    <path d="{D_PATH}" fill="{RED}" fill-rule="evenodd"/>
    <path d="{D_PATH}" fill="{BLACK}" fill-rule="evenodd" clip-path="url(#{clip_id})"/>
    {qr}
  </g>
</g>'''


def logo(theme="light"):
    dark = theme == "dark"
    word_color = WHITE if dark else BLACK
    sub1_color = WHITE if dark else BLACK
    sub2_color = RED_LIGHT if dark else RED
    tile = (
        f'<rect x="0" y="0" width="200" height="200" rx="36" fill="{WHITE}"/>'
        if dark
        else ""
    )

    word, _ = text_path("Digiturnos", EXTRA, 150, 350, 220, tracking=-2.0)
    sub1, sub1_w = text_path("Sisbén ", SEMI, 46, 350, 318, tracking=4.0)
    sub2, _ = text_path("Ágil", SEMI, 46, 350 + sub1_w, 318, tracking=4.0)

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="400" viewBox="0 0 1280 400">
  <g transform="translate(70,90) scale(1.1)">
    {tile}
    {icon(mask_id="dt-logo-cut")}
  </g>
  <path d="{word}" fill="{word_color}"/>
  <rect x="352" y="252" width="84" height="5" rx="2.5" fill="{RED}"/>
  <path d="{sub1}" fill="{sub1_color}"/>
  <path d="{sub2}" fill="{sub2_color}"/>
</svg>'''


def icon_svg(include_qr=True):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 200 200">
  {icon(include_qr=include_qr, mask_id="dt-icon-cut")}
</svg>'''


def app_icon_svg():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="{WHITE}"/>
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="{BORDER}" stroke-width="8"/>
  <g transform="translate(56,56) scale(2)">
    {icon(mask_id="dt-app-cut")}
  </g>
</svg>'''


def favicon_svg():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="{WHITE}"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="{BORDER}" stroke-width="1.5"/>
  <g transform="translate(6,6) scale(0.26)">
    {icon(include_qr=False, mask_id="dt-fav-cut")}
  </g>
</svg>'''


def preview_sheet():
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1100" viewBox="0 0 1500 1100">
  <rect width="1500" height="1100" fill="#F4F5F7"/>
  <text x="70" y="76" font-family="Segoe UI, Arial" font-size="22" font-weight="700" fill="{BLACK}">Identidad · Digiturnos Sisbén Ágil</text>
  <text x="70" y="104" font-family="Segoe UI, Arial" font-size="14" fill="#64748B">Versión principal, fondo oscuro, icono y app icon en rojo y negro.</text>

  <g transform="translate(60,140)">
    <rect width="1380" height="360" rx="28" fill="{WHITE}"/>
    <g transform="translate(40,15) scale(0.92)">{logo("light")}</g>
    <text x="40" y="335" font-family="Segoe UI, Arial" font-size="14" font-weight="700" fill="#64748B">LOGO PRINCIPAL · FONDO CLARO</text>
  </g>

  <g transform="translate(60,530)">
    <rect width="900" height="340" rx="28" fill="{BLACK}"/>
    <g transform="translate(35,25) scale(0.62)">{logo("dark")}</g>
    <text x="40" y="315" font-family="Segoe UI, Arial" font-size="14" font-weight="700" fill="{RED_SOFT}">LOGO · FONDO OSCURO</text>
  </g>

  <g transform="translate(990,530)">
    <rect width="450" height="340" rx="28" fill="{WHITE}"/>
    <g transform="translate(110,30) scale(0.45)">{icon_svg()}</g>
    <text x="225" y="325" text-anchor="middle" font-family="Segoe UI, Arial" font-size="14" font-weight="700" fill="#64748B">ICONO</text>
  </g>

  <g transform="translate(60,900)">
    <rect width="450" height="180" rx="28" fill="{WHITE}"/>
    <g transform="translate(158,15) scale(0.26)">{app_icon_svg()}</g>
    <text x="225" y="165" text-anchor="middle" font-family="Segoe UI, Arial" font-size="14" font-weight="700" fill="#64748B">APP ICON</text>
  </g>
</svg>'''


(OUT / "digiturnos-logo.svg").write_text(logo("light"), encoding="utf-8")
(OUT / "digiturnos-logo-dark.svg").write_text(logo("dark"), encoding="utf-8")
(OUT / "digiturnos-icon.svg").write_text(icon_svg(), encoding="utf-8")
(OUT / "digiturnos-icon-simple.svg").write_text(icon_svg(include_qr=False), encoding="utf-8")
(OUT / "digiturnos-app-icon.svg").write_text(app_icon_svg(), encoding="utf-8")
(OUT / "digiturnos-favicon.svg").write_text(favicon_svg(), encoding="utf-8")
(OUT / "digiturnos-preview.svg").write_text(preview_sheet(), encoding="utf-8")
print("SVGs generados")
