# Media Library Runbook — v4.3.0

Status: ACTIVE  
Canonical registry: `assets/media-registry.json`  
Policy: `platform/media-library-policy.json`

## Purpose

This runbook makes image replacement, optimization and responsive derivative generation repeatable. It exists specifically to prevent ad-hoc recompression, accidental redesign, stale references and repeated manual conversion work.

## Rules

1. Start from the highest-quality owner-approved source available.
2. Register the source before deriving variants.
3. Never repeatedly recompress an already lossy derivative when a better source exists.
4. Book covers and identity-critical assets are composition-locked: no crop, redesign or invented detail.
5. Upscaling is blocked by default.
6. New production files must be represented in the registry with provenance, rights and bilingual alt text.
7. After any production image change, normal cache/PWA invalidation rules apply automatically through the existing release cache workflow.
8. Delete or archive obsolete production derivatives only after confirming that no HTML, CSS, JS, JSON or manifest still references them.

## Standard derivative command

The canonical generator is:

`node scripts/media-derive.mjs --input <registered-source> --widths 640,960 --formats webp,avif --quality 88 --out-dir assets/images/derived`

The script:

- refuses unregistered inputs;
- refuses repository escape paths;
- refuses composition-locked cropping;
- refuses upscaling unless explicitly overridden;
- preserves aspect ratio;
- strips unnecessary metadata through the image pipeline;
- generates deterministic filenames;
- records dimensions, source relationship and SHA-256 in the registry;
- updates existing derivative records instead of duplicating them.

The runtime dependency is `sharp`. CI installs a pinned version in the workflow rather than committing a large node_modules tree.

## GitHub workflow

Use **Media Derivative Pipeline** for repeatable repository-side generation. Provide:

- registered source path;
- target widths;
- formats;
- quality;
- output directory.

The workflow audits the resulting library before committing.

## Book-cover profile

For Sepid, Tariki and Bonbast:

- preserve the approved composition exactly;
- prioritize fidelity over maximum byte reduction;
- do not create artificial detail;
- do not crop;
- prefer AVIF/WebP delivery;
- keep the currently approved production source recorded honestly when no higher-quality archival master is available.

## Replacement procedure

When the owner provides a better approved source:

1. store/register the new master or approved source;
2. generate derivatives from that source;
3. update catalogue references only after the derivative exists;
4. run `node scripts/media-library-audit.mjs`;
5. run Browser QA / responsive certification for affected surfaces;
6. allow automatic cache-version invalidation to propagate the replacement;
7. verify the production URL before removing stale derivatives.

## Prohibited workflow

Do not download a web derivative, resize it repeatedly, convert it through several lossy formats, overwrite an approved cover blindly, or ask the owner to clear browser cache as the normal deployment mechanism.
