#!/usr/bin/env python3
"""Build a strict plan that retains exactly the newest dated Bertina cPanel backup."""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import re
import sys

UTC=dt.timezone.utc
ISO=re.compile(r"^backup-(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})_drjavad1\.tar\.gz$")
DOT=re.compile(r"^backup-(\d{2})\.(\d{2})\.(\d{4})_(\d{2})-(\d{2})-(\d{2})_drjavad1\.tar\.gz$")

def timestamp(name: str) -> dt.datetime:
    match=ISO.fullmatch(name)
    if match:
        y,m,d,h,minute,second=map(int,match.groups())
        return dt.datetime(y,m,d,h,minute,second,tzinfo=UTC)
    match=DOT.fullmatch(name)
    if match:
        first,second_day,y,h,minute,second=map(int,match.groups())
        possibilities=[]
        for month,day in ((first,second_day),(second_day,first)):
            try:
                possibilities.append(dt.datetime(y,month,day,h,minute,second,tzinfo=UTC))
            except ValueError:
                pass
        now=dt.datetime.now(UTC)+dt.timedelta(days=1)
        valid=[value for value in possibilities if value<=now]
        if valid:
            return max(valid)
    raise ValueError(f"unrecognized or future Bertina backup filename: {name}")

def main() -> int:
    if len(sys.argv)!=2:
        raise SystemExit("usage: bertina-prune-backups.py FTP_LISTING_FILE")
    listing=pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()
    names=sorted({line.strip().rsplit("/",1)[-1] for line in listing if line.strip()})
    if not names:
        raise SystemExit("no matching cPanel backup archives found; refusing deletion")
    dated=sorted(((timestamp(name),name) for name in names),reverse=True)
    print(json.dumps({"keep":dated[0][1],"remove":[name for _,name in dated[1:]]},separators=(",",":")))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
