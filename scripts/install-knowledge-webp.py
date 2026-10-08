#!/usr/bin/env python3
"""Install the already-approved 45-article photo set without changing URLs.

Usage: python3 scripts/install-knowledge-webp.py /path/to/featured_images_FINAL_45_CLEAN_web_ready.zip
       python3 scripts/install-knowledge-webp.py /path/to/archive.zip --check-only

The full archive is validated BEFORE any public page is modified.
Never substitutes a placeholder or imports unapproved image files.
"""
import argparse
import csv
import json
import re
import struct
import sys
from pathlib import Path
from zipfile import ZipFile, BadZipFile

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://drjavadrezazadeh.com"
HUB = ROOT / "fa/rahnamaha/index.html"
MAP = ROOT / "sitemap-fa.xml"
REGISTRY = ROOT / "assets/media-registry.json"
IMAGEDIR = ROOT / "assets/images/knowledge"

def webp_size(data):
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("Missing WebP RIFF signature")
    c = data[12:16]
    if c == b"VP8X":
        return (1 + int.from_bytes(data[24:27], "little"),
                1 + int.from_bytes(data[27:30], "little"))
    if c == b"VP8L" and data[20] == 0x2f:
        x = data[21:25]
        return (1 + (x[0] | ((x[1] & 63) << 8)),
                1 + ((x[1] >> 6) | (x[2] << 2) | ((x[3] & 15) << 10)))
    if c == b"VP8 " and data[23:26] == b"\x9d\x01\x2a":
        return (struct.unpack_from("<H", data, 26)[0] & 0x3fff,
                struct.unpack_from("<H", data, 28)[0] & 0x3fff)
    raise ValueError("Unknown or malformed WebP frame header")

def slugs():
    text = MAP.read_text(encoding="utf-8")
    ids = re.findall(r"<loc>https://drjavadrezazadeh\.com/fa/rahnamaha/([a-z0-9-]+)/</loc>",text)
    if len(ids)!=45 or len(set(ids))!=45:
        raise ValueError(f"Expected 45 distinct article URLs, got {len(ids)}")
    return ids

def install(archive, check_only=False):
    ids = slugs()
    manifest = ROOT / "assets/data/knowledge-image-seo-manifest.csv"
    with manifest.open(encoding="utf-8-sig", newline="") as fp:
        image_rows = {row["slug"]: row for row in csv.DictReader(fp)}
    if set(image_rows) != set(ids):
        raise ValueError("Image manifest must match exactly the 45 published article slugs")
    binary = {}
    with ZipFile(archive) as z:
        names=z.namelist()
        for slug in ids:
            for group, suffix, dimensions in (
                ("featured-1600x900", "featured", (1600,900)),
                ("og-1200x630", "og", (1200,630)),
            ):
                wanted=image_rows[slug]["featured_file" if suffix=="featured" else "og_file"]
                matches=[n for n in names if n==wanted or n.endswith("/"+wanted)]
                if len(matches)!=1:
                    raise ValueError(f"Expected exactly one {wanted}, got {len(matches)}")
                member=z.getinfo(matches[0])
                if member.file_size>6_000_000 or member.file_size<2_000:
                    raise ValueError(f"Suspicious image byte length: {wanted}")
                data=z.read(member)
                if len(data)!=member.file_size or webp_size(data)!=dimensions:
                    raise ValueError(f"Invalid WebP dimensions: {wanted}; expected {dimensions}")
                binary[f"{slug}-{suffix}.webp"]=data

    if len(binary)!=90:
        raise AssertionError("All 90 WebP variants must be present")
    oldhub = HUB.read_text(encoding="utf-8")
    newhub=oldhub
    changes={}
    for slug in ids:
        article=ROOT / "fa/rahnamaha" / slug / "index.html"
        source=article.read_text(encoding="utf-8")
        oldname=f"{slug}-featured.svg"
        newname=f"{slug}-featured.webp"
        imageurl=f"{DOMAIN}/assets/images/knowledge/{newname}"
        ogurl=f"{DOMAIN}/assets/images/knowledge/{slug}-og.webp"
        if source.count(oldname)<3 or f"/{oldname}" not in oldhub:
            raise ValueError(f"Missing expected image references for {slug}")
        new=source.replace(oldname,newname)
        old_og=f'<meta property="og:image" content="{imageurl}">'
        if old_og not in new:
            raise ValueError(f"Open Graph reference missing after replacement: {slug}")
        new=new.replace(old_og,f'<meta property="og:image" content="{ogurl}">')
        new=re.sub(r'(<meta property="og:image:width" content=")1600(")',r'\g<1>1200\2',new)
        new=re.sub(r'(<meta property="og:image:height" content=")900(")',r'\g<1>630\2',new)
        newhub=newhub.replace(oldname,newname)
        changes[article]=new
    if newhub.count('class="knowledge-card-thumbnail"')!=45:
        raise ValueError("Card coverage changed unexpectedly")
    changes[HUB]=newhub

    maptext=MAP.read_text(encoding="utf-8")
    newmap=maptext
    for slug in ids:
        target=f"{slug}-featured.svg</image:loc>"
        if target not in newmap:
            raise ValueError(f"Missing image sitemap entry for {slug}")
        newmap=newmap.replace(target,f"{slug}-featured.webp</image:loc>")
    changes[MAP]=newmap

    register=json.loads(REGISTRY.read_text(encoding="utf-8"))
    present={record.get("path") for record in register["assets"]}
    for slug in ids:
        for kind,width,height in [("featured",1600,900),("og",1200,630)]:
            p=f"assets/images/knowledge/{slug}-{kind}.webp"
            if p not in present:
                register["assets"].append({
                    "path":p, "kind":"editorial-photography",
                    "role":"knowledge-"+kind, "mime_type":"image/webp",
                    "width":width,"height":height, "source_status":"production-source",
                    "provenance":"Original owner-approved 45-image web-ready archive (2026-10-08)",
                    "rights":"site-use-approved by owner",
                    "alt_fa":image_rows[slug]["alt_fa"],
                    "optimization_profile":"knowledge-"+kind
                })
                present.add(p)
    changes[REGISTRY]=json.dumps(register,ensure_ascii=False,indent=2)+"\n"

    print(f"VALIDATED {len(ids)} article slugs, {len(binary)} WebP images, "
          f"{len(changes)} metadata/page files.")
    if check_only:
        print("CHECK-ONLY: production files unchanged")
        return
    IMAGEDIR.mkdir(parents=True,exist_ok=True)
    for name,data in binary.items():
        (IMAGEDIR / name).write_bytes(data)
    for path,text in changes.items():
        path.write_text(text,encoding="utf-8")
    print("INSTALLED: 45 featured and 45 Open Graph WebP files.")
    print("Next: run knowledge-hub-seo.mjs, browser QA, live crawl and deployment.")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("archive", type=Path)
    p.add_argument("--check-only",action="store_true")
    args=p.parse_args()
    if not args.archive.is_file():
        p.error(f"Cannot access original ZIP: {args.archive}")
    try:
        install(args.archive,args.check_only)
    except (OSError, ValueError, BadZipFile) as exc:
        print(f"SAFE ABORT: {exc}",file=sys.stderr)
        sys.exit(2)
