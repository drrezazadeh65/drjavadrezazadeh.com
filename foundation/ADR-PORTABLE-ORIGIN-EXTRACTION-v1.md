# ADR — Portable Origin & Subdomain Extraction

**Status:** Accepted  
**Architecture baseline:** v5.0  
**Date:** 2026-10-06

The ecosystem is intentionally deployable as a single public repository today while preserving clean extraction boundaries for later production services.

## Decision

The permanent public identity is `drjavadrezazadeh.com`. Private application, API and journal workloads are bounded contexts, not folders that must remain coupled forever. Their reserved future targets are `app.`, `api.` and `journal.`, but none is treated as live until infrastructure, security and release gates are satisfied.

The current path-mounted private pages therefore act as **route and UX prototypes only**. Their route identities, locale semantics, RBAC contracts, consent rules and noindex/no-store policy are designed to survive extraction.

## Cutover discipline

The main-domain canonical migration is atomic: external DNS and TLS are verified first; only then may the write-mode cutover command run with the explicit HTTPS-ready acknowledgement. The same release changes canonicals/sitemaps/structured data and the machine origin state.

Reserved app/API/journal hosts must never leak into public canonical or production API metadata before their origin state is LIVE.

## Why this matters

This avoids two opposite failures: a monolith that becomes impossible to separate, and premature microservice complexity that claims infrastructure which does not yet exist. The architecture keeps stable contracts now and allows provider or hosting choices later without rebuilding the conceptual ecosystem.
