#!/usr/bin/env python3
"""Positive and adversarial fixture tests; no real manuscript or OJS installation."""
from io import BytesIO
from pathlib import Path
import hashlib
import os
import subprocess
import sys
import tarfile
import tempfile

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts"/"jhela-ojs-stage-package.py"

def package(path,malicious=False):
    with tarfile.open(path,"w:gz") as tf:
        for name,data in [
            ("ojs-3.5.0-4/index.php",b"<?php /* fixture */"),
            ("ojs-3.5.0-4/config.TEMPLATE.inc.php",b"; fixture"),
            ("ojs-3.5.0-4/lib/pkp/README",b"fixture")]:
            item=tarfile.TarInfo(name)
            item.size=len(data)
            tf.addfile(item,BytesIO(data))
        if malicious:
            item=tarfile.TarInfo("ojs-3.5.0-4/../../private-secret.txt")
            data=b"attack"
            item.size=len(data)
            tf.addfile(item,BytesIO(data))
    return hashlib.sha256(path.read_bytes()).hexdigest()

def stage(archive,digest,root,stagepath):
    env={**os.environ,"JHELA_OJS_OFFLINE_STAGE":str(stagepath),"JHELA_MAIN_PUBLIC_ROOT":str(root)}
    return subprocess.run([sys.executable,str(SCRIPT),"--archive",str(archive),"--sha256",digest],
        capture_output=True,text=True,env=env,timeout=30)

with tempfile.TemporaryDirectory(prefix="jhela-ojs-test-") as raw:
    base=Path(raw);web=base/"public_html";web.mkdir()
    (web/"existing-site.txt").write_text("Do not change",encoding="utf-8")
    correct=base/"ojs-test.tar.gz";sha=package(correct)
    staged=base/"verified-stage"
    good=stage(correct,sha,web,staged)
    assert good.returncode==0,good.stderr
    assert (staged/"index.php").is_file()
    assert (staged/"lib/pkp/README").is_file()
    assert (web/"existing-site.txt").read_text()=="Do not change"
    mismatch=stage(correct,"0"*64,web,base/"bad-digest")
    assert mismatch.returncode!=0 and not (base/"bad-digest").exists()
    unsafe=stage(correct,sha,web,web/"nested-stage")
    assert unsafe.returncode!=0 and not (web/"nested-stage").exists()
    evil=base/"evil.tar.gz";evil_sha=package(evil,malicious=True)
    rejected=stage(evil,evil_sha,web,base/"evil-stage")
    assert rejected.returncode!=0 and not (base/"evil-stage").exists()
    assert not (base/"private-secret.txt").exists()
print("JHELA verified offline OJS package test PASS (good archive, forged checksum, public-root guard, traversal rejection).")
