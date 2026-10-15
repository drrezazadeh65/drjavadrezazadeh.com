# JHELA — Scientific Evidence, Journal Audit and Indexing Claims SOP
**JHELA-AUDIT-001 · 16 October 2026 · Founding/prelaunch · Not a live verification service**  
**Canonical machine ledger:** `platform/jhela-gate-evidence-ledger-v1.json`  
**Audit executable:** `scripts/jhela-evidence-ledger-audit.mjs`  
**Independent tests:** `tests/jhela-evidence-ledger.test.mjs`  
**Scholarly target:** `platform/jhela-international-roadmap-v1.json`

## 1. Scientific accountability over progress theatre

JHELA's development is not a numerical completion exercise. A policy written in a repository, a successful software test, the existence of a journal homepage, an ISSN application and the submission of an indexing application are fundamentally different kinds of evidence. An index listing or journal quartile must never be marked obtained merely because the underlying application has been submitted or the technical website is operational.

The canonical 10-stage evidence registry therefore begins with **ten UNVERIFIED statuses and zero independently verified stage certifications**, and expresses a percentage of progress as `null`, not 0% or 100%. Zero certifications is a factual statement about the current *registry*; it is not an assessment of the completeness of the publishing project. The evidence ledger presently stores empty source-level metadata only and is **not an operational audit database**.

## 2. Duties and separation of authority

- **Journal Manager:** prepares factual draft evidence records, identifies the scope and source, and proposes a stage for assessment. Cannot independently approve their own material.
- **Handling Editor / Editor-in-Chief:** supplies scholarly governance and genuine editorial records *through the protected OJS system*. Has no right to fabricate external indexing acceptance or alter finance settlement.
- **Independent Auditor:** must separately evaluate original evidence, its provenance, the associated claim and limitations, and record a dated attestation. An automated CI test does not become an independent audit.
- **Publisher / legal officer:** supplies authoritative publisher and contracts evidence; has no authority to alter independent scientific manuscript decisions.
- **Finance officer:** provides billing/waiver evidence in a separate restricted system; has no access to blind reviews or editorial acceptance rights.
- **External indexer/provider:** makes its own admission decision; journal staff may only record the externally verifiable result.

## 3. Evidence classification and restrictions

The machine ledger recognises legal publisher identity, host/runtime, editorial governance, genuine publicly published articles, registry/provider (e.g. ISSN or Crossref) evidence, digital preservation, independent indexing authority, and independent audit. Each stage has defined *required evidence kinds*, and a source-level validator rejects a VERIFIED state without a separate reviewer, dated attestation, required proof hashes and provenance. For DOAJ, Scopus and Web of Science gates, indexing-acceptance proof must identify an official authoritative domain; a marketing screenshot, a forwarded email or a pending application alone is insufficient.

**Do not place raw editorial evidence inside GitHub**, including submitted manuscripts, peer-review reports, reviewer identity, unpublished accusations, private author correspondence, participant data, bank details, passwords, API keys or signed staff approval documents. Stage metadata in a versioned public source is only an implementation blueprint. Before any actual evidence is recorded, provision a separate encrypted private evidence vault, role-scoped file access, retention policy, immutable event log and independent audit interface. A hash verifies integrity but does not grant permission to redistribute confidential content.

## 4. Stage-specific decision procedure

1. Identify the stage `JH-01` through `JH-10` and its approved scientific target.
2. Obtain original evidence through a source-authorised workflow; record collection basis and whether the evidence is public or confidential.
3. Validate official source and link/version or private vault reference. Record capture time, content checksum, authority and scope; check for changes/expiry.
4. Have a genuinely independent qualified reviewer assess whether the evidence supports the **exact wording** of the proposed public claim.
5. Record decisions as append-only audit events and preserve objections, limitations and revised versions.
6. Publish only a minimal public projection of formally VERIFIED and still-current claims. A future external removal, delisting, expired certification or correction must revoke the claim and remove any associated badge or schema assertion.
7. For any category quartile or Impact Factor, record exact database, metric, subject category, assessment year and official evidence. A raw citation count or impact claim does not prove journal quartile.
8. Review index/metadata/publisher claims at least annually, and immediately after an external authority communicates a status change.

### Status meaning

| Status | Interpretation | May claim achieved publicly? |
| --- | --- | --- |
| `UNVERIFIED` | No appropriate independently reviewed evidence recorded | **No** |
| `UNDER_REVIEW` | Evidence under scrutiny, no sign-off yet | **No** |
| `VERIFIED` | Date-bounded, independently attested primary evidence supports the exact claim | Only the supported claim |
| `EXPIRED` | Evidence cannot support a current status | **No** |
| `REJECTED` | Evidence reviewed and insufficient or invalid | **No** |

Stage re-verification does not make a prior unsupported claim retroactively valid.

## 5. Useful evidence without distorting the record

For manuscript editorial operations, audit process integrity rather than editor popularity or purchased decision speed. Track objectively recorded submissions, missing-consent flags, first-decision time distributions with cohort size and date window, reviewer invitation nonresponse, conflict recusals, overdue review tasks, corrections and appeals; disaggregate internally where legitimate and privacy-safe. Never expose identifiable manuscripts or staff performance data through the public dashboard. A small-number category may reveal identities; apply suppression before public reporting.

For publishing excellence, distinguish actual submitted manuscripts, desk-rejected manuscripts, reviewed manuscripts, accepted articles, published articles, genuine citation sources, indexed articles and independently selected index coverage. Automatically classifying a manuscript as "in press" or a journal as "Scopus Q1" from a planned workflow is prohibited.

## 6. Technical safety, future interface and migration

Future privately hosted audit service shall expose an authenticated, least-privilege, versioned *read-only projection* to the website administrator dashboard, not replicated OJS review tables. Server-side roles, audit logs, key rotation and idempotent evidence ingestion are required; never accept a client-side status toggle as authoritative certification. Real-time counters must show **unknown/not connected** until the source system and date window are confirmed. Never invent performance data for dashboard decoration.

The current future-scale architecture decision `docs/journal/JHELA_FUTURE_SCALE_ARCHITECTURE_ADR_20261016.md` governs private database, file storage, independent audit services, migration and high availability. No technical hosting tier can bypass the journal's independent scientific acceptance requirements. The owner's intended five-gigabyte disk increase on 17 October 2026 does not affect the audit rules.

## 7. Required CI and runtime verification

**Source CI:** validate ten unique stage identifiers, permitted evidence kinds, no fabricated indexing awards, independent sign-off requirements, authoritative indexing domains and prohibitions on private payloads. CI may verify consistency; it must not set production gate status to true.

**Runtime later:** execute real authenticated staff and auditor paths; test denied roles, revoked expired evidence, audit-event replay, simultaneous edits, a compromised attestation, private file access, restoration and audit report redaction. Record actual observed results before operating the private evidence service.

**Current disposition:** no private evidence vault or reviewer audit backend is installed. The machine ledger and signed-proof validator are ready as source contracts; no journal external indexing is claimed.

### Principal references
- [DOAJ application criteria](https://doaj.org/apply/guide/)
- [Scopus selection policy](https://www.elsevier.com/products/scopus/content/content-policy-and-selection)
- [Clarivate Web of Science journal evaluation](https://clarivate.com/academia-government/scientific-and-academic-research/research-discovery-and-referencing/web-of-science/web-of-science-core-collection/editorial-selection-process/journal-evaluation-process-selection-criteria/)
- [PKP OJS system security](https://github.com/pkp/pkp-docs/blob/main/admin-guide/en/securing-your-system.md)
