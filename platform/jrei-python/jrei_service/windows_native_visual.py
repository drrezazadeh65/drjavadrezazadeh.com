"""JREI's OWN source-only conceptual illustration engine (no model weights).

Uses only Python stdlib + the optional Pillow *library* for raster/WebP.
No Stable Diffusion, external pretrained model, network, model download,
third-party application, face synthesis, image scraping or news fakery.
Output is original mathematically constructed editorial geometry, NOT general
text-to-image neural generation. All assets require owner editorial review.
"""
from __future__ import annotations

from hashlib import sha256
import math
import random
import re

ENGINE = "JREI_NATIVE_VISUAL_V1"
STYLE_IDS = ("GOLDEN_ATLAS", "ORBIT_GRAPH", "LEARNING_PATH", "QUIET_GEOMETRY")
COLORS = {
    "background": (17, 19, 25),
    "graphite": (34, 38, 48),
    "gold": (215, 181, 119),
    "ivory": (246, 239, 225),
    "copper": (119, 93, 66),
}


def semantic_intent(subject: str, brief: str) -> str:
    """Bounded, explainable visual motif classification, not understanding."""
    text = (subject + " " + brief).casefold()
    clusters = {
        "LANGUAGE": r"language|english|persian|زبان|انگلیسی|فارسی|لغات|learning",
        "EDUCATION": r"education|teacher|student|study|مدرسه|دانش|آموزش|معلم",
        "RESEARCH": r"science|research|evidence|آزمایش|پژوهش|علم|مطالعه",
        "NEWS": r"news|report|breaking|خبر|گزارش|رسانه",
        "GROWTH": r"talent|growth|progress|استعداد|رشد|پیشرفت|مسیر",
    }
    return next((label for label, pattern in clusters.items()
                 if re.search(pattern, text)), "EDITORIAL")


def render(*, subject: str, brief: str, width: int, height: int,
           seed: int, style: str):
    """Build one deterministic, original conceptual raster with Pillow.

    PIL is imported only for an owner-queued render. The algorithm is
    entirely source-owned and requires no downloaded language/image weights.
    """
    if (style not in STYLE_IDS or type(width) is not int
            or type(height) is not int or not 320 <= width <= 1600
            or not 240 <= height <= 1200 or type(seed) is not int
            or not 0 <= seed < 2**31
            or not isinstance(subject, str) or not isinstance(brief, str)
            or len(subject) > 180 or len(brief) > 650):
        raise ValueError("JREI_NATIVE_VISUAL_PARAMETERS_INVALID")
    from PIL import Image, ImageDraw, ImageFilter
    rng = random.Random(seed ^ int(sha256(
        (subject + "\n" + brief + "\n" + style).encode("utf-8")
    ).hexdigest()[:8], 16))
    w, h = width, height
    image = Image.new("RGB", (w, h), COLORS["background"])
    draw = ImageDraw.Draw(image, "RGB")
    # A restrained, charcoal gradient with a warm corner highlight.
    for y in range(h):
        shade = y / max(1, h - 1)
        draw.line(((0, y), (w, y)), fill=(
            19 + round(10 * shade), 21 + round(11 * shade),
            27 + round(13 * shade)))
    # Draw at actual target size; no illusion of neural super-resolution.
    thin = max(1, int(min(w, h) / 350))
    gold, ivory, dark = COLORS["gold"], COLORS["ivory"], COLORS["graphite"]
    # Negative space on the left for future website typography; no fake text.
    focus_x = int(w * (0.64 if style != "QUIET_GEOMETRY" else 0.57))
    focus_y = int(h * 0.52)
    radius = int(min(w * 0.32, h * 0.42))
    draw.ellipse((focus_x-radius*1.1, focus_y-radius*1.1,
                  focus_x+radius*1.1, focus_y+radius*1.1),
                 outline=(82, 68, 54), width=thin)
    draw.ellipse((focus_x-radius*.77, focus_y-radius*.77,
                  focus_x+radius*.77, focus_y+radius*.77),
                 outline=(113, 91, 67), width=thin)
    intent = semantic_intent(subject, brief)
    # The optional semantic motif is a geometrical concept, never a claim of
    # illustrating an actual person, news photograph, or scientific finding.
    if style == "GOLDEN_ATLAS":
        for i in range(8):
            angle = i * math.pi / 4 + .2
            rr = radius * (.35 + .055 * (i % 3))
            px = focus_x + math.cos(angle) * rr
            py = focus_y + math.sin(angle) * rr
            a = radius * .18
            draw.arc((px-a, py-a, px+a, py+a),
                     start=i*32, end=i*32+160,
                     fill=gold if i%2 else ivory, width=thin*2)
        draw.ellipse((focus_x-8,focus_y-8,focus_x+8,focus_y+8),fill=gold)
    elif style == "ORBIT_GRAPH":
        positions = []
        for i in range(15):
            theta = i * math.pi * (3-math.sqrt(5))
            rr = radius * math.sqrt((i+1)/16) * .8
            positions.append((focus_x+math.cos(theta)*rr,
                              focus_y+math.sin(theta)*rr))
        for i,(x,y) in enumerate(positions):
            if i>0:
                qx,qy=positions[(i*7)%i]
                draw.line((x,y,qx,qy),fill=(101,85,67),width=thin)
            rad=3+((i*3)%5)
            draw.ellipse((x-rad,y-rad,x+rad,y+rad),
                         fill=gold if i%3==0 else ivory)
    elif style == "LEARNING_PATH":
        points=[]
        for i in range(10):
            u=i/9
            px=w*(.36+.5*u)
            py=h*(.77-.48*u)+math.sin(u*math.pi*3)*h*.08
            points.append((px,py))
        draw.line(points,fill=gold,width=thin*3,joint="curve")
        for i,(x,y) in enumerate(points):
            rr=4+(i//3)
            draw.ellipse((x-rr,y-rr,x+rr,y+rr),
                         fill=ivory if i%3 else gold)
    else:
        for i in range(6):
            step=i*radius*.14
            draw.rounded_rectangle((
                focus_x-radius*.65+step,focus_y-radius*.65+step,
                focus_x+radius*.65-step,focus_y+radius*.65-step),
                radius=max(1,int(radius*.07)),outline=gold if i%2 else ivory,
                width=thin)
    # Purpose-dependent graphic accents; represent topics symbolically.
    if intent in ("LANGUAGE", "EDUCATION"):
        bx,by=int(w*.7),int(h*.62)
        s=radius*.31
        draw.line([(bx-s,by-s*.2),(bx,by-s*.38),(bx+s,by-s*.2)],
                  fill=ivory,width=thin*3)
        draw.line([(bx-s,by-s*.2),(bx-s,by+s*.6),(bx,by+s*.3),
                   (bx+s,by+s*.6),(bx+s,by-s*.2)],
                  fill=gold,width=thin*3)
    elif intent in ("RESEARCH","NEWS"):
        for i in range(4):
            y=int(h*(.33+i*.11))
            draw.line((int(w*.76),y,int(w*(.84+.015*(i%2))),y),
                      fill=ivory if i%2==0 else gold,width=thin*2)
    for _ in range(60):
        px=rng.randrange(int(w*.34),w)
        py=rng.randrange(0,h)
        if rng.random()<.35:
            draw.point((px,py),fill=(101,87,70))
    # Sparse fixed framing ensures the asset works with premium dark UI.
    margin=max(18,int(min(w,h)*.045))
    draw.line((margin,h-margin,w-margin,h-margin),
              fill=(81,70,57),width=thin)
    draw.line((margin,margin,margin,h-margin),
              fill=(81,70,57),width=thin)
    # All generation is geometric and source-based, with no model/weights.
    return image, {
        "engine": ENGINE, "algorithm": "SOURCE_OWNED_PROCEDURAL_GEOMETRY_V1",
        "semantic_motif": intent, "style_id": style,
        "neural_text_to_image": False,
        "external_pretrained_weights_used": False,
        "content_safety_guaranteed": False,
        "owner_visual_review_required": True,
    }
