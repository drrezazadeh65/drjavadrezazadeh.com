"""Original website illustrations through existing JREI Windows command center.

Owner-confirmed offline generation using the open-source Hugging Face
diffusers + PyTorch libraries. Model WEIGHTS are separately licensed and
must be installed, hashed and commercial-use-reviewed by the owner. No
downloads, site publishing, photorealistic documentary news or auto-approval.
All assets are local WebP drafts until explicit owner editorial review.

API contract is additive. SQLite lives in the *existing* missions.sqlite3;
no second dashboard, database, public HTTP server or independent AI.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import secrets
import sqlite3
import time

from jrei_service import windows_native_visual as native_visual
from jrei_service import windows_visual_learning as visual_learning

SCHEMA = "jr.jrei.site-image-studio.v1"
ENGINE_SCHEMA = "jr.jrei.site-image-engine.v1"
SHA = re.compile(r"^[0-9a-f]{64}$")
ID = re.compile(r"^[0-9a-f]{32}$")
PAGE = re.compile(r"^/(?:fa|en)/[a-zA-Z0-9_/-]{0,160}$")
MODEL_PART = re.compile(r"^[A-Za-z0-9_.-]{1,95}$")
FORMATS = {
    "WIDE_16_9": (1024, 576, ((1024, 576), (800, 450), (480, 270))),
    "SQUARE_1_1": (768, 768, ((768, 768), (512, 512), (384, 384))),
    "PORTRAIT_4_5": (768, 960, ((768, 960), (480, 600), (320, 400))),
}
PURPOSE = frozenset(("BLOG", "SERVICE", "HOMEPAGE", "NEWS_CONCEPT", "SOCIAL"))
STATES = frozenset((
    "QUEUED", "RUNNING", "GENERATED_UNREVIEWED",
    "HELD_MISSING_MODEL", "HELD_DEPENDENCY", "HELD_RESOURCES",
    "GENERATION_FAILED", "INTERRUPTED", "APPROVED_FOR_MANUAL_HANDOFF",
    "REJECTED",
))
IMAGE_ROOT = "site-image-studio"
NEGATIVE = (
    "people, person, human, face, hands, portrait, photograph of real events, "
    "real news photography, existing trademarks, corporate logos, text, letters, "
    "numbers, watermark, signature, low quality, disfigured"
)
PROMPT_PREFIX = (
    "Original premium editorial conceptual illustration for an educational "
    "and academic website, sophisticated charcoal, dark graphite, muted gold "
    "and ivory, balanced cinematic lighting, polished clean composition, "
    "strong visual hierarchy, no lettering, no people, no faces. Topic: "
)


def _connect(db_path: Path):
    db = sqlite3.connect(db_path, timeout=15)
    db.execute("PRAGMA busy_timeout=15000")
    return db


def initialize(db_path: Path):
    with closing(_connect(db_path)) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS jrei_site_image_jobs(
          id TEXT PRIMARY KEY, created INTEGER NOT NULL, updated INTEGER NOT NULL,
          state TEXT NOT NULL, purpose TEXT NOT NULL, aspect TEXT NOT NULL,
          page_path TEXT NOT NULL, subject TEXT NOT NULL,
          visual_brief TEXT NOT NULL, alt_fa TEXT NOT NULL, alt_en TEXT NOT NULL,
          model_license_reviewed INTEGER NOT NULL DEFAULT 0,
          owner_approved INTEGER NOT NULL DEFAULT 0,
          seed INTEGER NOT NULL, steps INTEGER NOT NULL,
          artifacts_json TEXT NOT NULL DEFAULT '{}',
          manifest_sha256 TEXT NOT NULL DEFAULT '',
          error_code TEXT NOT NULL DEFAULT '',
          reviewer TEXT NOT NULL DEFAULT '', reviewed_at INTEGER,
          output_published INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS jrei_site_image_queue
          ON jrei_site_image_jobs(state, created);
        """)
        # Preserve old diffusers jobs, but make owner-queued NEW jobs native.
        # These additive columns do not rewrite or erase prior visual assets.
        columns = {row[1] for row in db.execute(
            "PRAGMA table_info(jrei_site_image_jobs)")}
        if "renderer" not in columns:
            db.execute("""ALTER TABLE jrei_site_image_jobs
                ADD COLUMN renderer TEXT NOT NULL
                DEFAULT 'EXTERNAL_LEGACY_HELD'""")
        if "native_style" not in columns:
            db.execute("""ALTER TABLE jrei_site_image_jobs
                ADD COLUMN native_style TEXT NOT NULL DEFAULT ''""")
        db.commit()
        # An interrupted generation cannot silently resume after process death.
        db.execute("""UPDATE jrei_site_image_jobs
            SET state='INTERRUPTED',updated=?,error_code='WINDOWS_PROCESS_RESTARTED'
            WHERE state='RUNNING'""", (int(time.time()),))
        db.commit()
    visual_learning.initialize(db_path)


def _text(value, limit: int, name: str, minimum=5):
    if (not isinstance(value, str) or not minimum <= len(value.strip()) <= limit
            or "\x00" in value or re.search(r"[\x00-\x08\x0b-\x1f]", value)):
        raise ValueError("JREI_IMAGE_" + name + "_INVALID")
    return value.strip()


def enqueue(db_path: Path, request: dict) -> dict:
    """Owner explicitly requests a single draft, not a publication."""
    if not isinstance(request, dict) or request.get("confirm") is not True:
        raise ValueError("JREI_IMAGE_OWNER_CONFIRMATION_REQUIRED")
    purpose, aspect = request.get("purpose"), request.get("aspect")
    if purpose not in PURPOSE or aspect not in FORMATS:
        raise ValueError("JREI_IMAGE_PRESET_INVALID")
    page = request.get("page_path")
    if not isinstance(page, str) or not PAGE.fullmatch(page) or "//" in page:
        raise ValueError("JREI_IMAGE_PUBLIC_PAGE_PATH_INVALID")
    if request.get("documentary") is not False or request.get("human_faces") is not False:
        raise ValueError("JREI_IMAGE_CONCEPTUAL_ONLY")
    subject = _text(request.get("subject"), 180, "SUBJECT", 8)
    brief = _text(request.get("visual_brief"), 650, "BRIEF", 12)
    alt_fa = _text(request.get("alt_fa"), 260, "ALT_FA", 12)
    alt_en = _text(request.get("alt_en"), 260, "ALT_EN", 12)
    if not re.search(r"[\u0600-\u06ff]", alt_fa) or not re.search(r"[a-zA-Z]", alt_en):
        raise ValueError("JREI_IMAGE_BILINGUAL_ALT_REQUIRED")
    if len((PROMPT_PREFIX + brief).encode("utf-8")) > 2900:
        raise ValueError("JREI_IMAGE_PROMPT_OVERSIZE")
    steps = request.get("steps", 24)
    if type(steps) is not int or not 12 <= steps <= 45:
        raise ValueError("JREI_IMAGE_STEPS_INVALID")
    # No third-party pretrained model may become the default. Old queued
    # legacy jobs remain for explicit future owner review; NEW jobs use
    # original native geometric art only.
    if request.get("renderer", native_visual.ENGINE) != native_visual.ENGINE:
        raise ValueError("JREI_IMAGE_NEW_JOB_NATIVE_ONLY")
    seed = secrets.randbelow(2**31 - 1)
    chosen = visual_learning.select_style(db_path, purpose=purpose, seed=seed)
    now, ident = int(time.time()), secrets.token_hex(16)
    with closing(_connect(db_path)) as db:
        db.execute("""INSERT INTO jrei_site_image_jobs(
          id,created,updated,state,purpose,aspect,page_path,subject,visual_brief,
          alt_fa,alt_en,seed,steps,owner_approved,renderer,native_style)
          VALUES(?,?,?,'QUEUED',?,?,?,?,?,?,?,?,?,1,?,?)""",
          (ident, now, now, purpose, aspect, page, subject, brief,
           alt_fa, alt_en, seed, steps, native_visual.ENGINE, chosen["style_id"]))
        db.commit()
    return {"schema": SCHEMA, "id": ident, "state": "QUEUED",
            "renderer": native_visual.ENGINE,
            "native_style_id": chosen["style_id"],
            "style_policy": chosen["selection_policy"],
            "publication": "NOT_AUTHORIZED",
            "generation": "NOT_YET_ATTEMPTED"}


def _model_config(private: Path) -> tuple[dict, Path]:
    path = private / "site-image-engine.json"
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 45000:
        raise ValueError("JREI_IMAGE_MODEL_NOT_CONFIGURED")
    cfg = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(cfg, dict) or cfg.get("schema") != ENGINE_SCHEMA:
        raise ValueError("JREI_IMAGE_ENGINE_SCHEMA_INVALID")
    if not all(cfg.get(x) is True for x in (
        "enabled", "owner_approved", "model_license_reviewed",
        "commercial_site_use_permitted", "local_files_only"
    )):
        raise ValueError("JREI_IMAGE_MODEL_RIGHTS_OR_APPROVAL_REQUIRED")
    if cfg.get("pipeline") not in ("StableDiffusionXLPipeline", "StableDiffusionPipeline"):
        raise ValueError("JREI_IMAGE_PIPELINE_NOT_ALLOWED")
    model_root = (private.parent / "models" / "site-images").resolve(strict=True)
    folder_raw = cfg.get("model_dir")
    if not isinstance(folder_raw, str):
        raise ValueError("JREI_IMAGE_MODEL_PATH_INVALID")
    folder = Path(folder_raw)
    if (not folder.is_absolute() or folder.is_symlink() or
            not folder.resolve(strict=True).is_relative_to(model_root) or
            not folder.is_dir()):
        raise ValueError("JREI_IMAGE_MODEL_OUTSIDE_PRIVATE_STORE")
    manifest = cfg.get("model_files_sha256")
    if not isinstance(manifest, dict) or not manifest or len(manifest) > 900:
        raise ValueError("JREI_IMAGE_MODEL_DIGEST_MANIFEST_INVALID")
    actual = set()
    for item in folder.rglob("*"):
        if item.is_symlink():
            raise ValueError("JREI_IMAGE_MODEL_LINKS_DISALLOWED")
        if item.is_file():
            rel = item.relative_to(folder).as_posix()
            actual.add(rel)
    if set(manifest) != actual or "model_index.json" not in actual:
        raise ValueError("JREI_IMAGE_MODEL_FILE_SET_CHANGED")
    for rel, digest in manifest.items():
        parts = PurePosixPath(rel).parts
        if (not parts or any(not MODEL_PART.fullmatch(x) or x in (".", "..")
                             for x in parts)
                or not isinstance(digest, str) or not SHA.fullmatch(digest)):
            raise ValueError("JREI_IMAGE_MODEL_MANIFEST_ENTRY_INVALID")
        if not rel.lower().endswith((
            ".json", ".txt", ".safetensors", ".model", ".vocab", ".merges"
        )):
            raise ValueError("JREI_IMAGE_UNSAFE_MODEL_FILE_EXTENSION")
        file = folder.joinpath(*parts)
        with file.open("rb") as fh:
            h = hashlib.sha256()
            for chunk in iter(lambda: fh.read(1024*1024), b""):
                h.update(chunk)
        if h.hexdigest() != digest:
            raise ValueError("JREI_IMAGE_MODEL_FILE_CHANGED")
    model_meta = json.loads((folder / "model_index.json").read_text(encoding="utf-8"))
    if model_meta.get("_class_name") != cfg["pipeline"]:
        raise ValueError("JREI_IMAGE_MODEL_PIPELINE_MISMATCH")
    return cfg, folder


def local_model_status(private: Path) -> dict:
    # Avoid expensive full-weight hashing in frequent status requests.
    path = private / "site-image-engine.json"
    if not path.is_file() or path.is_symlink():
        return {"state": "NATIVE_PROCEDURAL_SOURCE_READY_UNTESTED",
                "native_engine": native_visual.ENGINE,
                "native_renderer_requires_pillow": True,
                "neural_text_to_image_model_installed": False,
                "external_pretrained_weights_used_by_native": False,
                "installed": False, "running": False}
    try:
        cfg = json.loads(path.read_text(encoding="utf-8"))
        enabled = (cfg.get("schema") == ENGINE_SCHEMA and cfg.get("enabled") is True)
        return {"state": "NATIVE_PROCEDURAL_SOURCE_READY_UNTESTED",
                "native_engine": native_visual.ENGINE,
                "native_renderer_requires_pillow": True,
                "neural_text_to_image_model_installed": False,
                "legacy_model_config_present_unverified": enabled,
                "installed": False, "running": False,
                "license_approval_claimed": cfg.get("model_license_reviewed") is True}
    except (OSError, ValueError, TypeError):
        return {"state": "NATIVE_PROCEDURAL_SOURCE_READY_UNTESTED",
                "native_engine": native_visual.ENGINE,
                "legacy_model_config_invalid": True,
                "neural_text_to_image_model_installed": False,
                "installed": False, "running": False}


def claim(db_path: Path) -> str | None:
    with closing(_connect(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("""SELECT id FROM jrei_site_image_jobs
            WHERE state='QUEUED'
            ORDER BY created LIMIT 1""").fetchone()
        if row:
            db.execute("""UPDATE jrei_site_image_jobs SET state='RUNNING',
                error_code='',updated=? WHERE id=?""", (int(time.time()), row[0]))
        db.commit()
    return row[0] if row else None


def _job(db_path: Path, ident: str) -> dict:
    if not isinstance(ident, str) or not ID.fullmatch(ident):
        raise ValueError("JREI_IMAGE_JOB_ID_INVALID")
    with closing(_connect(db_path)) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM jrei_site_image_jobs WHERE id=?",
                         (ident,)).fetchone()
    if row is None:
        raise ValueError("JREI_IMAGE_JOB_NOT_FOUND")
    return dict(row)


def _digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _folder(private: Path, ident: str) -> Path:
    if not ID.fullmatch(ident):
        raise ValueError("JREI_IMAGE_JOB_ID_INVALID")
    root = private / IMAGE_ROOT
    if root.is_symlink():
        raise ValueError("JREI_IMAGE_OUTPUT_ROOT_LINKED")
    folder = root / ident
    if folder.is_symlink():
        raise ValueError("JREI_IMAGE_OUTPUT_LINKED")
    return folder


def render_one(db_path: Path, private: Path, ident: str) -> dict:
    """Only the explicit owner-queued job ID can reach this entrypoint."""
    job = _job(db_path, ident)
    if job["state"] != "RUNNING" or job["owner_approved"] != 1:
        raise ValueError("JREI_IMAGE_JOB_NOT_CLAIMED")
    native = job.get("renderer") == native_visual.ENGINE
    details = {}
    if native:
        from PIL import Image  # Optional raster library, NOT an image AI.
        width, height, _variants = FORMATS[job["aspect"]]
        image, details = native_visual.render(
            subject=job["subject"], brief=job["visual_brief"],
            width=width, height=height, seed=int(job["seed"]),
            style=job["native_style"])
        cfg = None
    else:
        # Backward-compatible owner-approved LEGACY renderer; old existing
        # jobs only. It cannot be selected for any new JREI-generated job.
        cfg, model_dir = _model_config(private)  # licenses + exact file hashes
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_DATASETS_OFFLINE"] = "1"
    # Optional imports are never required for ordinary JREI chat.
    if not native:
        import torch
        from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline
        from PIL import Image
        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device == "cpu" and cfg.get("allow_cpu_generation") is not True:
            raise RuntimeError("JREI_IMAGE_GPU_UNAVAILABLE_CPU_NOT_APPROVED")
        pipe_type = (StableDiffusionXLPipeline if
                     cfg["pipeline"] == "StableDiffusionXLPipeline" else
                     StableDiffusionPipeline)
        pipe = pipe_type.from_pretrained(
            str(model_dir), local_files_only=True, use_safetensors=True,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        )
        pipe = pipe.to(device)
        pipe.enable_attention_slicing()
        if hasattr(pipe, "enable_vae_slicing"):
            pipe.enable_vae_slicing()
        generator = torch.Generator(device=device).manual_seed(int(job["seed"]))
        image = pipe(
            prompt=PROMPT_PREFIX + job["visual_brief"],
            negative_prompt=NEGATIVE,
            height=FORMATS[job["aspect"]][1],
            width=FORMATS[job["aspect"]][0],
            num_inference_steps=int(job["steps"]),
            guidance_scale=6.5, generator=generator, num_images_per_prompt=1,
        ).images[0]
    _width, _height, variants = FORMATS[job["aspect"]]
    if not isinstance(image, Image.Image):
        raise RuntimeError("JREI_IMAGE_RENDERER_RETURNED_NO_IMAGE")
    output_dir = _folder(private, ident)
    output_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    files = {}
    try:
        for w, h in variants:
            filename = f"jrei-{ident[:12]}-{w}x{h}.webp"
            path = output_dir / filename
            resized = image.resize((w, h), Image.Resampling.LANCZOS)
            resized.save(path, format="WEBP", quality=87, method=5, exif=b"")
            files[filename] = {
                "sha256": _digest(path), "width": w, "height": h,
                "mime": "image/webp", "bytes": path.stat().st_size
            }
        receipt = {
            "schema": SCHEMA, "id": ident, "state": "GENERATED_UNREVIEWED",
            "source": ("ORIGINAL_PROCEDURAL_ILLUSTRATION" if native
                       else "ORIGINAL_AI_ILLUSTRATION"),
            "illustrative_only": True, "documentary_photo": False,
            "generated_from": ("JREI_SOURCE_OWNED_GEOMETRIC_ART" if native
                               else "OWNER_APPROVED_LOCAL_OPEN_SOURCE_PIPELINE"),
            "native_renderer": native_visual.ENGINE if native else None,
            "native_style_id": job["native_style"] if native else None,
            "native_visual_provenance": details if native else None,
            "neural_text_to_image": not native,
            "external_pretrained_weights_used": not native,
            "pipeline": ("SOURCE_OWNED_PROCEDURAL_GEOMETRY_V1" if native
                         else cfg["pipeline"]),
            "model_license": ("NO_MODEL_WEIGHTS" if native
                              else cfg.get("license_id", "")),
            "model_manifest_sha256": ("NO_MODEL_WEIGHTS" if native else
                hashlib.sha256(json.dumps(
                    cfg["model_files_sha256"], sort_keys=True).encode()).hexdigest()),
            "purpose": job["purpose"], "page_path": job["page_path"],
            "subject": job["subject"],
            "prompt_sha256": hashlib.sha256((
                PROMPT_PREFIX + job["visual_brief"]).encode("utf-8")).hexdigest(),
            "seed": job["seed"], "steps": job["steps"], "aspect": job["aspect"],
            "altFa": job["alt_fa"], "altEn": job["alt_en"],
            "files": files, "rightsReviewed": False,
            "editorialApproved": False, "published": False,
            "requiresManualEditorialAndWebsiteHandoff": True,
        }
        raw = json.dumps(receipt, ensure_ascii=False, sort_keys=True, indent=2)
        manifest = output_dir / "asset-manifest.json"
        manifest.write_text(raw, encoding="utf-8")
        manifest_digest = _digest(manifest)
        with closing(_connect(db_path)) as db:
            db.execute("BEGIN IMMEDIATE")
            changed = db.execute("""UPDATE jrei_site_image_jobs
              SET state='GENERATED_UNREVIEWED',updated=?,artifacts_json=?,
                  manifest_sha256=? WHERE id=? AND state='RUNNING'""",
              (int(time.time()), json.dumps(files, sort_keys=True), manifest_digest,
               ident)).rowcount
            if changed != 1:
                db.rollback()
                raise ValueError("JREI_IMAGE_JOB_STATE_CHANGED")
            db.commit()
        return {"id": ident, "state": "GENERATED_UNREVIEWED",
                "manifest_sha256": manifest_digest, "published": False}
    except Exception:
        # Keep failed artifacts for forensic inspection; never serve them
        # until SQLite records a complete, hash-checked generated version.
        raise


def mark_failure(db_path: Path, ident: str, state: str, code: str):
    if state not in ("HELD_MISSING_MODEL", "HELD_DEPENDENCY",
                     "HELD_RESOURCES", "GENERATION_FAILED"):
        raise ValueError("JREI_IMAGE_FAILURE_STATE_INVALID")
    if not isinstance(code, str) or not re.fullmatch(r"[A-Z0-9_]{3,90}", code):
        raise ValueError("JREI_IMAGE_FAILURE_CODE_INVALID")
    with closing(_connect(db_path)) as db:
        db.execute("""UPDATE jrei_site_image_jobs SET state=?,error_code=?,updated=?
           WHERE id=? AND state='RUNNING'""", (state, code, int(time.time()), ident))
        db.commit()


def retry(db_path: Path, request: dict) -> dict:
    if not isinstance(request, dict) or request.get("confirm") is not True:
        raise ValueError("JREI_IMAGE_RETRY_CONFIRMATION_REQUIRED")
    ident = request.get("id")
    if not isinstance(ident, str) or not ID.fullmatch(ident):
        raise ValueError("JREI_IMAGE_JOB_ID_INVALID")
    with closing(_connect(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        changed = db.execute("""UPDATE jrei_site_image_jobs
            SET state='QUEUED',updated=?,error_code='' WHERE id=? AND
            state IN ('HELD_MISSING_MODEL','HELD_DEPENDENCY',
                      'HELD_RESOURCES','GENERATION_FAILED','INTERRUPTED')""",
            (int(time.time()), ident)).rowcount
        if changed != 1:
            db.rollback()
            raise ValueError("JREI_IMAGE_JOB_NOT_RETRYABLE")
        db.commit()
    return {"schema": SCHEMA, "id": ident, "state": "QUEUED",
            "published": False}


def list_recent(db_path: Path, limit: int=20) -> dict:
    with closing(_connect(db_path)) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute("""SELECT id,created,updated,state,purpose,aspect,
            page_path,subject,alt_fa,alt_en,artifacts_json,manifest_sha256,
            error_code,reviewer,output_published,renderer,native_style
            FROM jrei_site_image_jobs
            ORDER BY created DESC LIMIT ?""", (min(50, max(1, int(limit))),))
        items = []
        for row in rows:
            item = dict(row)
            item["variants"] = list(json.loads(item.pop("artifacts_json")).keys())
            items.append(item)
    return {"schema": SCHEMA, "items": items,
            "site_publication_enabled": False}


def asset_bytes(db_path: Path, private: Path, ident: str, filename: str) -> bytes:
    job = _job(db_path, ident)
    if job["state"] not in ("GENERATED_UNREVIEWED",
                            "APPROVED_FOR_MANUAL_HANDOFF"):
        raise ValueError("JREI_IMAGE_NOT_AVAILABLE")
    files = json.loads(job["artifacts_json"])
    if not isinstance(filename, str) or filename not in files:
        raise ValueError("JREI_IMAGE_VARIANT_NOT_FOUND")
    file = _folder(private, ident) / filename
    if (file.is_symlink() or not file.is_file()
            or file.stat().st_size > 8_000_000
            or file.stat().st_size != files[filename]["bytes"]
            or _digest(file) != files[filename]["sha256"]):
        raise ValueError("JREI_IMAGE_ARTIFACT_INTEGRITY_FAILURE")
    return file.read_bytes()


def review(db_path: Path, private: Path, request: dict) -> dict:
    if not isinstance(request, dict) or request.get("confirm") is not True:
        raise ValueError("JREI_IMAGE_REVIEW_CONFIRMATION_REQUIRED")
    ident = request.get("id")
    verdict = request.get("verdict")
    if verdict not in ("APPROVE", "REJECT"):
        raise ValueError("JREI_IMAGE_REVIEW_VERDICT_INVALID")
    reviewer = _text(request.get("reviewer"), 90, "REVIEWER", 3)
    job = _job(db_path, ident)
    if job["state"] != "GENERATED_UNREVIEWED":
        raise ValueError("JREI_IMAGE_REVIEW_STATE_INVALID")
    if verdict == "APPROVE":
        if (request.get("rights_reviewed") is not True or
                request.get("visual_reviewed") is not True or
                request.get("alt_reviewed") is not True):
            raise ValueError("JREI_IMAGE_INDEPENDENT_REVIEW_REQUIRED")
        folder = _folder(private, ident)
        manifest = folder / "asset-manifest.json"
        if (manifest.is_symlink() or not manifest.is_file() or
                _digest(manifest) != job["manifest_sha256"]):
            raise ValueError("JREI_IMAGE_MANIFEST_CHANGED")
        for filename in json.loads(job["artifacts_json"]):
            asset_bytes(db_path, private, ident, filename)
    target_state = ("APPROVED_FOR_MANUAL_HANDOFF" if verdict == "APPROVE"
                    else "REJECTED")
    with closing(_connect(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        changed = db.execute("""UPDATE jrei_site_image_jobs SET state=?,reviewer=?,
             model_license_reviewed=?,reviewed_at=?,updated=?
             WHERE id=? AND state='GENERATED_UNREVIEWED'""",
             (target_state, reviewer, int(verdict=="APPROVE"), int(time.time()),
              int(time.time()), ident)).rowcount
        if changed != 1:
            db.rollback()
            raise ValueError("JREI_IMAGE_REVIEW_CONFLICT")
        db.commit()
    return {"schema": SCHEMA, "id": ident, "state": target_state,
            "published": False, "website_approval_not_implied": True}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="JREI private offline image rendering")
    parser.add_argument("--render", required=True)
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--owner-queued", action="store_true")
    args = parser.parse_args()
    if not args.owner_queued:
        parser.error("JREI_IMAGE_OWNER_QUEUED_JOB_REQUIRED")
    private = args.private.resolve(strict=True)
    if private.name != "command-center" or private.parent.name != "JREI":
        parser.error("JREI_IMAGE_PRIVATE_ROOT_INVALID")
    db_path = private / "missions.sqlite3"
    try:
        answer = render_one(db_path, private, args.render)
        print(json.dumps(answer, ensure_ascii=False))
    except (ImportError, OSError, ValueError, RuntimeError) as exc:
        message = str(exc)
        if "MODEL_" in message or "PIPELINE_" in message:
            state = "HELD_MISSING_MODEL"
        elif isinstance(exc, ImportError):
            state = "HELD_DEPENDENCY"
        elif "GPU_" in message or "CUDA" in message or "RESOURCES" in message:
            state = "HELD_RESOURCES"
        else:
            state = "GENERATION_FAILED"
        try:
            mark_failure(db_path, args.render, state,
                         "RENDER_" + exc.__class__.__name__.upper())
        except (OSError, ValueError, sqlite3.Error):
            pass
        print(json.dumps({"state": state, "error_class": exc.__class__.__name__,
                          "published": False}))
        raise SystemExit(2) from None


if __name__ == "__main__":
    main()
