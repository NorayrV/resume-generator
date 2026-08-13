"""
Derive the app's icon set from public/logo.png.

The source artwork is a white mark painted on an opaque black rectangle, so it
cannot be dropped straight into a light interface — it would show as a black
oblong. The mark is monochrome though, so its luminance is a perfect alpha
mask: white becomes opaque, black becomes transparent. Everything below is cut
from that one mask.

Regenerate after changing public/logo.png:

    python3 scripts/build-logo-assets.py
"""

from PIL import Image, ImageDraw

SRC = "public/logo.png"
INK = (23, 23, 23)        # --ink: 0 0% 9%
BADGE = (10, 10, 10)      # near-black badge behind the mark on icons

src = Image.open(SRC).convert("RGBA")

# Luminance is the mask: the white mark keeps its shape, the black field drops
# out, and the anti-aliased edge between them survives as partial alpha.
mask = src.convert("L")
mark = Image.new("RGBA", src.size, (255, 255, 255, 0))
mark.putalpha(mask)
mark = mark.crop(mark.getbbox())


def tinted(colour):
    out = Image.new("RGBA", mark.size, colour + (0,))
    out.putalpha(mark.split()[3])
    return out


def square(fg, bg, size, pad_ratio=0.18, rounded=False, opaque=False):
    """The mark centred on a square field, padded so it reads at small sizes."""
    canvas = Image.new("RGBA", (size, size), bg + (255,) if opaque or bg else (0, 0, 0, 0))
    if bg and not opaque:
        canvas = Image.new("RGBA", (size, size), bg + (255,))
    inner = int(size * (1 - pad_ratio * 2))
    scaled = tinted(fg)
    scaled.thumbnail((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(
        scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2)
    )
    if rounded:
        r = Image.new("L", (size, size), 0)
        ImageDraw.Draw(r).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        canvas.putalpha(r)
    return canvas


# The header mark: ink-coloured, transparent behind, sits on the light UI.
ink = tinted(INK)
ink.save("public/logo-mark.png")

# Favicon: a badge, so the white mark stays visible on a light or dark tab bar.
square((255, 255, 255), BADGE, 512, rounded=True).save("app/icon.png")

# iOS refuses transparency and adds its own corner radius.
square((255, 255, 255), BADGE, 180, rounded=False, opaque=True).convert("RGB").save(
    "app/apple-icon.png"
)

print(f"mark bbox {mark.size}")
for f in ("public/logo-mark.png", "app/icon.png", "app/apple-icon.png"):
    im = Image.open(f)
    print(f"  {f:26} {im.size[0]}x{im.size[1]} {im.mode}")
