# Licensed open-source components actually included in the JREI Python package

The files in this directory are code, **not** model weights or third-party desktop applications. Each component keeps its complete, unmodified MIT license file in its own subdirectory.

| Component | Source | Exact upstream blob | Included code | Modification |
|---|---|---|---|---|
| minBPE | https://github.com/karpathy/minbpe | base.py `65cc45cf9b08b29b884f4f8b74abdb3cbe2c7e9d`; basic.py `9bc5ab76c66d2e317121a1069b9a801ee77a0514` | `minbpe/base.py`, `minbpe/basic.py`, original `minbpe/LICENSE` | Attribution header only |
| nanoGPT | https://github.com/karpathy/nanoGPT | model.py `c698f8b60129d793494de058b0dd4e318c0dcb5e` | `nanogpt/model.py`, original `nanogpt/LICENSE` | The `GPT.from_pretrained` method was removed so JREI's source cannot load external pretrained checkpoints; original MIT notice preserved |

The following are **not** bundled: original upstream datasets, GPT-2 weights, Qwen weights, Granite weights, cloud inference services, upstream training CLIs, model downloaders, and separate frontends.

The `jrei_service.windows_native_corpus` and `windows_native_scratch_training` integrations are original JREI application code and are **not copied from a third-party source**. They require reviewed licensed data and explicit local owner approval. This implementation is source-only and has not yet produced or independently validated a trained JREI checkpoint.
