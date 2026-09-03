"""
Generates the desktop app icon from the app's own theme colours.

The project had no icon asset of any kind, and Windows shows a generic
placeholder without one. Drawing it here (rather than shipping a binary blob of
unknown origin) keeps the icon reproducible: re-run this script and you get the
same file.

Design: the app's dark green (`primaryDark`, #205B4C) rounded square with a
speech bubble in the off-white background colour (#F7F7F2) and three rising
bars inside it — "speaking, measured".

Usage:  python tools/make_icon.py
Output: assets/icons/app-icon.ico  (+ app-icon.png for previewing)
"""

import pathlib

from PIL import Image, ImageDraw

PRIMARY_DARK = (32, 91, 76, 255)   # #205B4C
PRIMARY = (46, 125, 104, 255)      # #2E7D68
CANVAS = (247, 247, 242, 255)      # #F7F7F2
ACCENT = (217, 137, 61, 255)       # #D9893D

# Drawn large, then downsampled: cheap anti-aliasing without any filters.
SUPERSAMPLE = 8
BASE = 256
SIZE = BASE * SUPERSAMPLE


def rounded_square(draw: ImageDraw.ImageDraw) -> None:
    inset = int(SIZE * 0.045)
    radius = int(SIZE * 0.225)
    draw.rounded_rectangle(
        [inset, inset, SIZE - inset, SIZE - inset],
        radius=radius,
        fill=PRIMARY_DARK,
    )

    # A lighter wedge in the top-right corner, echoing the circle motif on the
    # app's own "Speaking practice" card.
    highlight = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    highlight_draw = ImageDraw.Draw(highlight)
    centre = (int(SIZE * 0.86), int(SIZE * 0.16))
    r = int(SIZE * 0.30)
    highlight_draw.ellipse(
        [centre[0] - r, centre[1] - r, centre[0] + r, centre[1] + r],
        fill=PRIMARY[:3] + (110,),
    )
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [inset, inset, SIZE - inset, SIZE - inset],
        radius=int(SIZE * 0.225),
        fill=255,
    )
    highlight.putalpha(
        Image.composite(highlight.getchannel("A"), Image.new("L", (SIZE, SIZE), 0), mask)
    )
    return highlight


def speech_bubble(draw: ImageDraw.ImageDraw) -> None:
    left = int(SIZE * 0.205)
    right = int(SIZE * 0.795)
    top = int(SIZE * 0.235)
    bottom = int(SIZE * 0.655)
    radius = int(SIZE * 0.115)

    draw.rounded_rectangle([left, top, right, bottom], radius=radius, fill=CANVAS)

    # Tail, pointing down-left like a spoken line.
    draw.polygon(
        [
            (int(SIZE * 0.315), bottom - int(SIZE * 0.02)),
            (int(SIZE * 0.470), bottom - int(SIZE * 0.02)),
            (int(SIZE * 0.300), int(SIZE * 0.815)),
        ],
        fill=CANVAS,
    )


def level_bars(draw: ImageDraw.ImageDraw) -> None:
    """Three rising bars: the app scores every recording, so the icon says so."""
    heights = [0.105, 0.170, 0.235]
    colours = [PRIMARY, PRIMARY, ACCENT]
    bar_width = int(SIZE * 0.088)
    gap = int(SIZE * 0.055)
    baseline = int(SIZE * 0.565)
    total = len(heights) * bar_width + (len(heights) - 1) * gap
    x = (SIZE - total) // 2

    for height, colour in zip(heights, colours):
        bar_height = int(SIZE * height)
        draw.rounded_rectangle(
            [x, baseline - bar_height, x + bar_width, baseline],
            radius=bar_width // 2,
            fill=colour,
        )
        x += bar_width + gap


def main() -> None:
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    highlight = rounded_square(draw)
    image = Image.alpha_composite(image, highlight)
    draw = ImageDraw.Draw(image)

    speech_bubble(draw)
    level_bars(draw)

    final = image.resize((BASE, BASE), Image.LANCZOS)

    out_dir = pathlib.Path(__file__).resolve().parent.parent / "assets" / "icons"
    out_dir.mkdir(parents=True, exist_ok=True)

    final.save(out_dir / "app-icon.png")
    # Windows picks the size it needs from the sizes stored inside the .ico.
    final.save(
        out_dir / "app-icon.ico",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("wrote", out_dir / "app-icon.ico")
    print("wrote", out_dir / "app-icon.png")


if __name__ == "__main__":
    main()
