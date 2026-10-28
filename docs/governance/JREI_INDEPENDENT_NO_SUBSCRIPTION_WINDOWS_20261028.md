# JREI standalone without ChatGPT subscription — Windows implementation (2026-10-28)

Owner objective: keep the existing drjavadrezazadeh.com and its JREI command center, build an independent local educational AI (Persian/English, coding, SEO/GEO, site operations, original imagery), reuse appropriately licensed open-source programs and avoid recurring commercial AI API subscriptions.

## Source integration already recorded in canonical repository

- Existing owner-private Windows command center on 127.0.0.1:8092; existing missions.sqlite3 and owner-controlled queue; no parallel assistant, database or controller.
- Existing model-neutral local language gateway in platform/jrei-python/jrei_service/windows_language_backend.py, with non-Qwen-only route, exact SHA256 verified local model and explicitly owner-approved private settings. Merely editing this file DOES NOT uninstall or install models on Windows.
- Evidence-based continuous-learning, codebase symbol mapping, isolated code editing, learning agenda and code-experience records are original JREI Python modules and require independent review to count as actual learned skills.
- The opt-in JREI LoRA trainer, windows_peft_training.py, uses established Apache-2.0 Transformers + PEFT APIs, lazily imported only for a separately owner-invoked offline job. It does not certify data rights or start training itself.
- Original website illustration producer in windows_site_image_studio.py uses Diffusers and PyTorch **if and only if** compatible separately licensed model weights are locally installed, SHA-pinned and commercial use is approved. Generates unpublished WebP drafts in 16:9, 1:1 and 4:5 and bilingual alt text; provenance, file hashes and owner review live in the existing private mission DB and Windows panel. No human faces or synthetic documentary photographs presented as real news.
- Direct Python GitHub operator in windows_github_operator.py. This reads exact branch HEAD, allowlisted source excerpts and the existing scheduled first-party site governor reports. Explicit owner review and an exact HEAD lease are required to send one isolated source patch to GitHub. It neither deploys Bertina nor triggers the release workflow. GitHub owner authentication uses a fine-grained token available only in the Windows process environment JREI_GITHUB_TOKEN (never in website code, model prompt or Git history).

## Non-Qwen model candidate identified and documented

IBM Granite 4.1 instruction model: https://huggingface.co/ibm-granite/granite-4.1-3b

Matching fine-tuneable base: https://huggingface.co/ibm-granite/granite-4.1-3b-base

Official licensing and repo: https://github.com/ibm-granite/granite-4.1-language-models

These model weights are provided under Apache-2.0, including commercial use. IBM provides pretrained base and instruction-tuned weights; JREI owns its distinctive tool/memory/research/editorial workflow and any original trained adapter, but pretrained base weights remain governed by their upstream license. Inference can reuse a compatible existing OpenAI-style local model server rather than creating another chatbot. Correct GGUF model files and SHA must be separately verified before activation.

**Persian limitation:** Persian is not in the published official supported-language list for this model family. Real bilingual Persian/English evaluation and any targeted learning are essential before claiming broad Persian capability or replacing active production chat. The 8B and 30B variants are future expansion candidates; no architectural maximum is imposed by current two computers, but actual VRAM/runtime compatibility still matters.

## Images and licenses

Hugging Face Diffusers source: https://github.com/huggingface/diffusers ; Apache-2.0 software library.

Library license does NOT automatically authorize use or commercial distribution of model checkpoint weights. Any diffusion checkpoint requires separate model-card/rights review, output-content review and provenance. Local generation needs no paid inference API but consumes electricity, disk, bandwidth, and suitable computing resources.

## Exact independent owner-private API

GET /api/github/status
GET /api/github/site-governor
GET /api/github/source?path=...
POST /api/github/owner-reviewed-patch
GET /api/site-images/jobs
GET /api/site-images/asset?id=...&name=...
POST /api/site-images/enqueue
POST /api/site-images/retry
POST /api/site-images/review

These use the original owner token and private 127.0.0.1:8092 console. GitHub status and site-governor observation require a real GitHub API connection. On private repositories, a revocable scoped GitHub token is required. The original website one-click deploy workflow is preserved: no command here can deploy to Bertina.

## Honest status

Only source commits on migration/bertina-linux6. No tests, model training, Windows activation, model downloads, node-B GPU dispatch, deployment, live site edits, or rendered images have been independently observed as part of these commits. The model-neutral JREI gateway cannot answer until a non-Qwen model is installed and configured on Windows. Nor can the image backend render until a licensed model, dependencies and compatible runtime are present. No ChatGPT subscription is required by these local components once actually installed and activated, but no equivalence to ChatGPT capabilities is implied.

After source-development freeze: pin and stage an official model artifact and its verified hash, prepare non-destructive Windows activation, install optional local libraries, verify the two nodes' capabilities, configure scoped GitHub authentication, run one integrated acceptance evaluation and then allow only the existing owner-approved one-click site deployment if needed.
