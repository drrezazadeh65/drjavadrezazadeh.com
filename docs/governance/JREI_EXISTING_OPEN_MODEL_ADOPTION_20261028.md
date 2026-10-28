# SUPERSEDED — OWNER NATIVE-ONLY JREI DECISION (2026-10-28)

The prior discussion below is historical research only. **Do not install or activate Qwen, Granite, PEFT-on-external-base, LM Studio, or any external pretrained model** through the current JREI owner workflow. The owner explicitly selected code/algorithm reuse without third-party pretrained language weights. Refer to `docs/governance/JREI_INDEPENDENT_WINDOWS_ACTIVATION_HANDOFF_20261028.md`. The canonical JREI CMD installer no longer downloads external weights. The real native JREI neural checkpoint has NOT yet been trained, and the private evidence-only fallback is explicitly not presented as a trained LLM.

---

> **SUPERSEDED BY OWNER DIRECTIVE (28 October 2026):** Qwen is no longer an eligible JREI language backend. The replacement route is `platform/jrei-python/jrei_service/windows_language_backend.py` with an independently selected non-Qwen model, plus the native optional `windows_peft_training.py` LoRA implementation. This historical model review is preserved for provenance only. Neither a replacement model nor training has been installed or run; Windows deployment and site publication remain paused.

# JREI · Existing open-weight language-model adoption decision (2026-10-28)

## Owner directive and decision

JREI must **not build a billion-parameter transformer language model or a fine-tuning framework from scratch**. Its differentiator is the *native JREI evidence/learning orchestration, bilingual educational corpus, governance, and carefully measured improvement*. Reuse appropriately licensed existing pretrained model weights and established Python training libraries. This is an internal **Windows-only source-development decision**, not an authorization to install, download, train, enable public chat or deploy the website. Preserve the existing Qwen model and owner command center unchanged until independent acceptance.

### Concrete upstreams considered

| Candidate | What is already available | Decision |
| --- | --- | --- |
| **Qwen3-4B-Base** | Official base model in Hugging Face Transformers/safetensors; Apache-2.0, https://huggingface.co/Qwen/Qwen3-4B-Base . Official Qwen3 overview and finetuning guidance: https://github.com/QwenLM/Qwen3 | **Preferred compatibility-first future training base** because the installed local inference artifact is Qwen3-4B-GGUF. This is a **separate** trainable checkpoint; do not claim the existing GGUF itself can be used as an ordinary PEFT training base. Adapter portability to a particular inference GGUF must be separately evaluated, with matching architecture/revisions and a reversible conversion procedure. |
| **Qwen3.5-2B-Base** | Official smaller pretrained-only base, intended for fine-tuning, Apache-2.0, https://huggingface.co/Qwen/Qwen3.5-2B-Base | **Candidate for a later separate low-resource bilingual weight-training experiment**, not a silent replacement for the observed Qwen3-4B chat runtime. Qwen3.5 includes additional multimodal/hybrid implementation requirements; verify library versions and hardware before proposing it for Windows. |
| **Hugging Face Transformers + PEFT / LoRA** | Real Python APIs for training small adapter weights on a pretrained model without updating the entire backbone; https://github.com/huggingface/peft and https://huggingface.co/docs/transformers/peft | **Preferred native-library route** once a compatible hardware/backend and genuinely reviewed training dataset exist. Import libraries *within* JREI's existing Python training component; do not install a second assistant or copy an entire agent application. |
| **LLaMA-Factory** | Apache-2.0 training-code reference, actual Qwen3 supervised LoRA and QLoRA examples, plus continued-pretraining and multi-node configuration; https://github.com/hiyouga/LlamaFactory/blob/main/examples/README.md and https://github.com/hiyouga/LlamaFactory/blob/main/examples/train_lora/qwen3_lora_sft.yaml | **Study exact configuration and training data contracts, not install a parallel dashboard or runtime**. Proven template for selecting LoRA hyperparameters and loss masking, subject to version/hardware validation. |
| **Unsloth (Python core)** | Fast LoRA/QLoRA tuning, documented native Windows route; https://github.com/unslothai/unsloth and https://unsloth.ai/docs/get-started/install/windows-installation | **Conditional acceleration option**, not a default dependency. Core has Apache-2.0 while optional Studio components may use AGPL-3.0; inspect component-level licensing and GPU support. |
| **AMD ROCm/HIP compatibility** | Official Windows compatibility tables: https://rocm.docs.amd.com/projects/radeon-ryzen/en/latest/docs/shared/hipsdk/reference/system-requirements.html | **Block unsupported GPU-training assertions**. The RX 580 observed in JREI notes is not a validated modern Windows ROCm/HIP PEFT accelerator. Qwen Vulkan/llama.cpp inference success is not evidence that CUDA/ROCm model training will work. |

## Integration into our *existing* JREI

1. Keep the current SHA-pinned **Qwen3-4B GGUF + llama.cpp** model as an unchanged inference baseline; do not confuse it with a trainable Transformers checkpoint.
2. Preserve `windows_model_curriculum.py` as the source of candidate examples and metadata. Its exported JSONL remains **candidate-only** unless external review validity and dataset rights are independently established. The current export manifest explicitly reports model/trainer compatibility as NOT_VERIFIED.
3. When a trainable checkpoint and compatible GPU or realistic small-model CPU environment have been established, call established `transformers` + `peft` Python APIs **inside the existing Windows training workflow**. Training must be an explicit owner-authorized job with local-only checkpoint paths, pinned model revision, source/version provenance, dataset SHA, separate untouched bilingual heldout partition, resource backpressure, interruptible checkpoints, and auditable abort/rollback.
4. Begin with **supervised LoRA/QLoRA** on reviewed bilingual examples rather than unfiltered internet text or self-generated statements. Consider separately licensed domain-adaptive continued pretraining only after the data quality/replay/forgetting issues and compute budget have been resolved.
5. Reuse the existing JREI mission queue, signed Windows workers, learning agenda, SQLite metadata, and panel. **No second chatbot, agent, model manager, database, control port, or public-site integration.** Using training libraries as dependencies is not installing another AI assistant.
6. Promote an adapter to private inference only after independent Persian/English heldout evidence beats the baseline with documented regressions, latency, exact weight/model hashes, explicit owner approval and reversible rollback. Never infer a quality gain solely from lower training loss or more crawled pages.

## Status at the time of decision

This commit is **research and architecture only**, NOT an integrated trainer. The only known model artifact on owner Node A is the existing quantized Qwen3-4B GGUF inference model; current notes record AMD RX 580 uncertainty, without demonstrated suitable weight-training acceleration. No trainable safetensors checkpoint has been downloaded and no PEFT/Unsloth/LLaMA-Factory training was installed or performed. No tests, site deployment or production changes were performed.

Source re-use: upstream projects and library APIs were **researched and referenced**; no third-party code or model weights were copied into this document.
