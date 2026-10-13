#!/usr/bin/env python3
import json
import pathlib
import subprocess
import sys
import tempfile

script=pathlib.Path(__file__).resolve().parents[1]/"scripts"/"bertina-prune-backups.py"
with tempfile.TemporaryDirectory() as tmp:
    listing=pathlib.Path(tmp)/"ftp.txt"
    listing.write_text("\n".join([
        "../backup-10.12.2026_23-23-00_drjavad1.tar.gz",
        "../backup-2026-10-13_10-00-00_drjavad1.tar.gz",
        "../backup-13.10.2026_11-00-00_drjavad1.tar.gz",
    ])+"\n",encoding="utf-8")
    result=subprocess.run([sys.executable,str(script),str(listing)],check=True,text=True,capture_output=True)
    plan=json.loads(result.stdout)
    assert plan["keep"]=="backup-13.10.2026_11-00-00_drjavad1.tar.gz"
    assert len(plan["remove"])==2
    listing.write_text("../backup-unexpected.tar.gz\n",encoding="utf-8")
    failed=subprocess.run([sys.executable,str(script),str(listing)],text=True,capture_output=True)
    assert failed.returncode!=0
print("PASS: newest single cPanel backup selected; unknown names fail closed.")
