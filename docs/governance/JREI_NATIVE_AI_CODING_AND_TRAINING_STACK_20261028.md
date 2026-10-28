# JREI Windows native AI — adopted source stack and actual status
Date: 2026-10-28 | Canonical branch: `migration/bertina-linux6`

## Authority and direction

The owner rejected dependence on Qwen and any parallel assistant application.
**JREI** owns its operator, tool permissions, knowledge evidence, source memory,
coding workspace, review history, model registry and future adapter weights.
Open-source code/libraries and legally reusable pretrained weights are inputs,
**not competing services**. No design ceiling is imposed by the present two
Windows computers: future nodes, GPUs and data centres remain additive, but
actual jobs require observed local resources and authenticated identities.

### Open-source search and provenance

| Source | Upstream rights | JREI native adaptation | Copy status |
| --- | --- | --- | --- |
| [Aider](https://github.com/Aider-AI/aider), repo-map | [Apache 2.0](https://github.com/Aider-AI/aider/blob/main/LICENSE.txt) | `windows_codebase_map.py` extracts bounded Python AST and JS/PHP symbol lines with source hashes; `windows_project_workflows.py` and `windows_workspace.py` consume it in the EXISTING coding tools | Original JREI code informed by design; no verbatim upstream source copied |
| [SWE-agent](https://github.com/SWE-agent/SWE-agent) | [MIT](https://github.com/SWE-agent/SWE-agent/blob/main/LICENSE) | `windows_code_experience.py` records immutable draft SHA references, owner review metadata and limited negative feedback for future edits | Original native feedback-loop design; no agent installed |
| [Transformers](https://github.com/huggingface/transformers) and [PEFT](https://github.com/huggingface/peft) | Apache 2.0 subject to actual package versions | `windows_peft_training.py`: private explicit offline LoRA training using local model snapshot, pinned source hashes, disjoint heldout, completion-only labels, checkpointing, candidate manifest | Original JREI Python that invokes published training APIs; no model downloaded or trained |
| [IBM Granite 4.0](https://github.com/ibm-granite/granite-4.0-language-models), [Granite H Tiny](https://huggingface.co/ibm-granite/granite-4.0-h-tiny), [Granite H Tiny Base](https://huggingface.co/ibm-granite/granite-4.0-h-tiny-base) | Apache 2.0, as documented by IBM | Non-Qwen *candidate* for separate JREI-owned adaptation and inference; requires pinned weight snapshots, license acknowledgement, compatible model architecture and independent Persian/English quality evidence | Researched only; no weights or upstream code copied |
| [IBM Granite 3.3 8B Instruct](https://huggingface.co/ibm-granite/granite-3.3-8b-instruct) | Apache 2.0 | Alternative baseline for code and instruction following, not automatically selected | Researched only |

**Important language limitation:** Granite's listed supported languages include
English and Arabic but do **not** explicitly establish Persian proficiency.
Bilingual Persian-English evaluation and potentially licensed Persian fine-tuning
are required. The fastest open-weight option is not automatically the best model.

## Existing-source integration committed

1. `windows_language_backend.py` is the JREI-owned private loopback
   model-neutral gateway, *disabled until an explicitly selected NON-Qwen
   artifact is hash-pinned and authorized*. It refuses old Qwen ports.
   `windows_command_center.py` no longer discovers or restarts Qwen, and
   retains its normal private Python health check.
2. `windows_codebase_map.py` supplies bounded, source-hashed symbol context
   to `windows_project_workflows.py` and the pre-existing `windows_workspace.py`
   local editing routine. It never executes generated code.
3. `windows_code_experience.py` stores local draft review status in the same
   `missions.sqlite3`; authenticated Windows endpoints expose an owner
   feedback flow. Only owner-reviewed verdicts may affect later code editing
   hints. Neither draft nor owner feedback is automatically certified correct.
4. `windows_peft_training.py` implements an **optional explicit** local trainer.
   It uses installed Python training libraries when separately invoked and
   writes an unpromoted LoRA adapter candidate. It cannot automatically train
   against unreviewed documents or candidate data.
5. `jrei_orchestrator/adaptive_capacity.py` now recognizes separately
   authorized offline model-training and data-preparation work on additional
   observed nodes. GPU resources are independently measured per machine;
   the two PCs' VRAM cannot be treated as one address space. The existing
   signed worker/lease path is not yet connected to the new trainer.

## Implementation boundary: what these commits do NOT prove

- No model has been copied, downloaded, started or removed on owner PCs.
  The old Qwen binary may still exist on disk, but the newly committed owner
  command-center routing excludes it once that source is installed.
- No PEFT libraries installed, model weights trained, GPU benchmark measured,
  Persian/English quality gains verified, coding edits executed, full feedback
  cycle completed or two-node training job executed.
- No tests run during this coding phase, no changes published to Bertina,
  and no site release or operational synchronization authorized.
- Human-reviewed labels with SHA receipts alone do not scientifically verify
  correctness, and trained adapter weights derived from a licensed base model
  are **not** a foundation model independently pretrained by JREI.
- The final model choice, download, GPU training backend, source/rights reviews,
  heldout model comparison and production promotion remain separate gates.

## Next implementation order

Maintain a single JREI architecture: (a) inspect and reuse licensable mature
code per subsystem; (b) mature independent evidence acquisition and reviewed
coding feedback; (c) stage real authorized bilingual data; (d) provision a
non-Qwen open-weight base and compatible PEFT runtime privately; (e) run
isolated training and independent heldout comparison *only when authorized
at the end of coding*; (f) promote a reversible JREI model checkpoint after
documented evaluation; (g) add the second Windows node and later GPUs through
the original signed node identities, no competing panel or cloud dependency.
