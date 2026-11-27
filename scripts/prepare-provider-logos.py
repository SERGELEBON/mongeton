"""Normalise les logos des moyens de paiement en icônes carrées 192 px (PNG)."""
import sys
from PIL import Image, ImageChops

SRC, OUT = sys.argv[1], sys.argv[2]
SIZE = 192


def trim(im, bg, tol=30):
    diff = ImageChops.difference(im.convert('RGB'), Image.new('RGB', im.size, bg))
    bbox = diff.convert('L').point(lambda p: 255 if p > tol else 0).getbbox()
    return im.crop(bbox) if bbox else im


def square(im, fill, pad_ratio=0.0):
    w, h = im.size
    side = int(max(w, h) * (1 + pad_ratio))
    canvas = Image.new('RGB', (side, side), fill)
    canvas.paste(im.convert('RGB'), ((side - w) // 2, (side - h) // 2), im.convert('RGBA'))
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def load(name):
    return Image.open(f'{SRC}/{name}').convert('RGBA')

# Visa : carte bleue sur fond blanc -> on garde la carte, fond blanc
visa = trim(load('4.png'), (255, 255, 255))
square(visa, (255, 255, 255), 0.12).save(f'{OUT}/visa.png')
# MTN MoMo : carré jaune avec bordure blanche
momo = trim(load('5.png'), (255, 255, 255))
square(momo, (255, 204, 0)).save(f'{OUT}/mtn-momo.png')
# Telecel Cash : rouge, format portrait -> carré rouge
tel = load('6.png')
square(tel, tel.convert('RGB').getpixel((5, 5)), 0.0).save(f'{OUT}/telecel-cash.png')
# Wave : disque bleu sur blanc
wave = trim(load('7.jpg'), (255, 255, 255))
square(wave, (255, 255, 255), 0.02).save(f'{OUT}/wave.png')
# Orange Money : uniquement le carré orange officiel (partie droite, sans le filigrane)
om = load('8.jpg')
# Boîte englobante des pixels orange vif de la moitié droite.
right = om.crop((om.width // 2, 0, om.width, om.height)).convert('RGB')
mask = right.point(lambda v: 0).convert('L')
px, mp = right.load(), mask.load()
for y in range(right.height):
    for x in range(right.width):
        r, g, b = px[x, y]
        if r > 200 and 70 < g < 140 and b < 60:
            mp[x, y] = 255
# Ne garder que les colonnes/lignes majoritairement orange (le carré plein, pas les flèches).
cols = [x for x in range(right.width) if sum(mp[x, y] > 0 for y in range(right.height)) > right.height * 0.4]
rows = [y for y in range(right.height) if sum(mp[x, y] > 0 for x in range(right.width)) > right.width * 0.3]
box = (min(cols), min(rows), max(cols) + 1, max(rows) + 1)
square(right.crop(box), (0, 0, 0), 0.18).save(f'{OUT}/orange-money.png')
# Moov Money : losange orange sur fond transparent
moov = load('9.png')
bbox = moov.getbbox()
square(moov.crop(bbox), (255, 255, 255), 0.06).save(f'{OUT}/moov-money.png')
print('ok')
