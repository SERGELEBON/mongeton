"""Génère les visuels Mongeton (anneau doré + wordmark) à partir des couleurs du logo."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageChops

OUT, FONT = sys.argv[1], sys.argv[2]
CREAM = (246, 244, 240)
GREEN = (22, 76, 40)
GOLD_LIGHT, GOLD_MID, GOLD_DARK = (232, 210, 142), (204, 176, 104), (168, 132, 58)
SS = 4  # suréchantillonnage pour l'anticrénelage


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gold_gradient(size):
    """Dégradé diagonal : clair en haut à droite, plus sombre en bas à gauche (comme le logo)."""
    g = Image.new('RGB', (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = ((size - x) + y) / (2 * size)  # 0 en haut-droite, 1 en bas-gauche
            px[x, y] = lerp(GOLD_LIGHT, GOLD_MID, t / 0.5) if t < 0.5 else lerp(GOLD_MID, GOLD_DARK, (t - 0.5) / 0.5)
    return g


def ring(diameter, stroke_ratio=0.085, color=None):
    """Anneau RGBA de `diameter` px."""
    big = diameter * SS
    mask = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((0, 0, big - 1, big - 1), fill=255)
    inset = int(big * stroke_ratio)
    d.ellipse((inset, inset, big - 1 - inset, big - 1 - inset), fill=0)
    fill = Image.new('RGB', (big, big), color) if color else gold_gradient(big)
    out = fill.convert('RGBA')
    out.putalpha(mask)
    return out.resize((diameter, diameter), Image.LANCZOS)


def canvas(size, bg=None):
    return Image.new('RGBA', (size, size), bg + (255,) if bg else (0, 0, 0, 0))


def paste_center(base, img, dy=0):
    x = (base.width - img.width) // 2
    y = (base.height - img.height) // 2 + dy
    base.alpha_composite(img, (x, y))


# Icône iOS / générique : fond crème, anneau centré
icon = canvas(1024, CREAM); paste_center(icon, ring(600)); icon.convert('RGB').save(f'{OUT}/icon.png')
# Android adaptatif : premier plan transparent dans la zone sûre (66 %), fond crème plein
fg = canvas(1024); paste_center(fg, ring(500)); fg.save(f'{OUT}/android-icon-foreground.png')
canvas(1024, CREAM).save(f'{OUT}/android-icon-background.png')
mono = canvas(1024); paste_center(mono, ring(500, color=(255, 255, 255))); mono.save(f'{OUT}/android-icon-monochrome.png')
# Splash : anneau seul sur transparent (le fond vient de app.json)
sp = canvas(512); paste_center(sp, ring(480)); sp.save(f'{OUT}/splash-icon.png')
# Favicon
fav = canvas(96); paste_center(fav, ring(88, stroke_ratio=0.12)); fav.resize((48, 48), Image.LANCZOS).save(f'{OUT}/favicon.png')

# Lockup complet (pour le web / partage) : anneau + MONGETON + slogan
for lang, tagline in (('fr', 'GESTION FINANCIÈRE INDIVIDUELLE'), ('en', 'INDIVIDUAL FINANCIAL MANAGEMENT')):
    W, H = 1200, 630
    img = Image.new('RGBA', (W, H), CREAM + (255,))
    r = ring(170); img.alpha_composite(r, ((W - r.width) // 2, 120))
    d = ImageDraw.Draw(img)
    f1 = ImageFont.truetype(FONT, 84); f2 = ImageFont.truetype(FONT, 26)
    for text, font, y, spacing in (('MONGETON', f1, 330, 6), (tagline, f2, 440, 3)):
        widths = [d.textlength(ch, font=font) for ch in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = (W - total) / 2
        for ch, w in zip(text, widths):
            d.text((x, y), ch, font=font, fill=GREEN); x += w + spacing
    img.convert('RGB').save(f'{OUT}/og-{lang}.png')
print('ok')
