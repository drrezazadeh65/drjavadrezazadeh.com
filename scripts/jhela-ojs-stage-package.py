#!/usr/bin/env python3
"""Stage an official PKP OJS archive *offline*, never under the production web root.
This only verifies and unpacks a supplied, independently SHA-256-verified archive.
It does not install OJS, create accounts, run migrations, contact DB or enable submissions.
"""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile

def require(cond, reason):
    if not cond:
        raise ValueError(reason)

def main():
    ap=argparse.ArgumentParser(description="Stage verified official OJS distribution away from live web roots")
    ap.add_argument("--archive",required=True)
    ap.add_argument("--sha256",required=True,help="64-character SHA256 checked against verified PKP release metadata")
    args=ap.parse_args()
    os.umask(0o077)
    archive=Path(args.archive).expanduser().resolve(strict=True)
    stage_raw=os.environ.get("JHELA_OJS_OFFLINE_STAGE","")
    main_raw=os.environ.get("JHELA_MAIN_PUBLIC_ROOT","")
    require(stage_raw.startswith("/") and main_raw.startswith("/"),"Explicit absolute staging and main public roots required")
    stage=Path(stage_raw).expanduser().resolve()
    mainroot=Path(main_raw).expanduser().resolve(strict=True)
    require(mainroot.is_dir(),"Main production root must be an existing directory")
    require(not (stage==mainroot or stage.is_relative_to(mainroot) or mainroot.is_relative_to(stage)),
            "Staging directory must be isolated from current public site")
    require(not stage.exists(),"Refusing to overwrite existing staging content")
    require(len(args.sha256)==64 and all(c in '0123456789abcdefABCDEF' for c in args.sha256),"Authoritative SHA-256 required")
    require(archive.is_file(),"Release package is not a file")
    digest=hashlib.file_digest(archive.open("rb"),"sha256").hexdigest()
    require(digest.lower()==args.sha256.lower(),"Release SHA-256 did not match")
    require(tarfile.is_tarfile(archive),"Release must be a valid tar archive")
    members=[]
    total=0
    with tarfile.open(archive,"r:*") as tar:
        for m in tar.getmembers():
            n=m.name.replace("\\","/")
            p=Path(n)
            require(not p.is_absolute() and all(v not in ('..','') for v in p.parts),"Unsafe archive path")
            require(m.isfile() or m.isdir(),"Links, device files and special entries forbidden")
            require(len(p.parts)<=24 and len(n)<=350,"Archive member path exceeds safe limit")
            require(m.size>=0 and m.size<=64*1024*1024,"Unexpectedly large release member")
            total+=m.size
            require(total<=650*1024*1024,"Archive exceeds unpack size ceiling")
            members.append((m,p.parts))
        require(bool(members),"Empty archive is not an application")
        prefix={parts[0] for _,parts in members}
        strip=1 if len(prefix)==1 and all(len(parts)>=2 or m.isdir() for m,parts in members) else 0
        require(len(prefix)==1 and next(iter(prefix)).startswith("ojs-"),"Expected an unmodified PKP OJS release top-level directory")
        parent=stage.parent
        require(parent.is_dir(),"Parent of offline staging directory must exist")
        temp=Path(tempfile.mkdtemp(prefix=".jhela-ojs-verify-",dir=str(parent)))
        try:
            for m,parts in members:
                rel=parts[strip:]
                if not rel: continue
                target=temp.joinpath(*rel)
                require(target.is_relative_to(temp),"Tar path escapes staging directory")
                if m.isdir():
                    target.mkdir(mode=0o700,parents=True,exist_ok=True)
                else:
                    target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
                    with tar.extractfile(m) as src, target.open("xb") as dst:
                        shutil.copyfileobj(src,dst,length=1024*1024)
                    target.chmod(0o600)
            require((temp/"index.php").is_file() and (temp/"config.TEMPLATE.inc.php").is_file()
                    and (temp/"lib"/"pkp").is_dir(),
                    "Archive is not a complete official OJS application layout")
            temp.rename(stage)
        except BaseException:
            shutil.rmtree(temp,ignore_errors=True)
            raise
    print("OJS_OFFLINE_STAGE_PASS: verified digest and extracted application in private staging; no production changes; OJS remains uninstalled.")

if __name__=="__main__":
    try: main()
    except (ValueError,OSError,tarfile.TarError) as e:
        print("OJS_OFFLINE_STAGE_BLOCKED: "+str(e),file=sys.stderr)
        sys.exit(1)
