# JREI native-only, no-third-party-model handoff — 28 October 2026

**Canonical branch:** migration/bertina-linux6  
**Status:** Code committed to GitHub. Windows installation, source activation and any actual model training are NOT remotely verified. No tests or website deployment have been run.

## Owner model policy (supersedes earlier Granite recommendation)

JREI is its own owner-private Windows app and learning system. The operating path MUST NOT download, install or start Granite, Qwen, LM Studio, a commercial API, or any other external pretrained language model. The earlier Granite installer and associated model acquisition module have been removed from the canonical source. An already existing outside model process is not touched or secretly deleted. No existing live task is altered merely by committing this source.

Reusing reusable open-source *code and algorithms* is permitted with licenses respected. Reusing pretrained weights or relabeling an external model as JREI is not permitted by this operating policy.

## What works in code without pretrained weights

The existing private JREI Python command center uses its existing SQLite knowledge and memory store and scheduler. The code includes approved-source acquisition (owner-authorized sources only), local ingestion, rights-aware versioned passages, FTS5 or bounded lexical retrieval, provenance and citations, knowledge gap logging and autonomous research agenda. Existing models are not necessary for this evidence-retrieval functionality.

The local conversational path now has a **native extractive fallback** when no trained language model is present: authorized passages can be quoted with source anchors, and missing knowledge yields a clear evidence gap rather than fabricated ChatGPT-like text. This is not a generative LLM, not new neural weights, and cannot yet do unrestricted coding or open-ended academic synthesis.

The owner UI and status distinguish the two: native evidence handling is available **in the new source**; independently trained general-purpose JREI language-model weights have **not** been created. Previously installed JREI app snapshots may remain on earlier code until acceptance and source promotion.

## Windows owner command

platform/jrei-v5/windows-worker/JREI-START-INDEPENDENT-AI.cmd

The launcher's checked-in code now syncs and starts only the original JREI private Windows app. It does not require installing an additional app, download external weights or deploy the website. The existing owner-SID and active-mission checks remain. The current automatic repository transfer can fetch new GitHub commits, but transfer is **not the same as activation**: immutable app snapshots are protected by separate final acceptance and approval.

## Training a useful proprietary JREI language model

A new neural language model cannot acquire credible general intelligence simply by running a learning loop. The next engineering stages need (1) rights-verified, sufficient bilingual training datasets, (2) a reusable open-source neural architecture and training code, (3) compute resources and training/validation cycles, (4) a checkpoint signed as trained by JREI and verified independently for Persian and English, and (5) owner-approved activation within the already existing app. No such checkpoint is claimed today.

All coding remains on the canonical branch with [skip ci]. Keep production website URLs and the owner one-click Bertina deployment unchanged. No new independent database, admin dashboard, external subscription or desktop application.
