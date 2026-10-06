# Module Extension Contract — v1

This contract is the expansion seam for the ecosystem. A future capability is not added by scattering pages, tables and conditions across the codebase. It is added as a bounded module with an explicit dependency graph.

## Required module declaration

Every module declares:
- a stable module ID;
- its architectural kind and lifecycle state;
- its authority boundary;
- its data class;
- explicit dependencies;
- the capabilities it exposes;
- a feature flag that is OFF until release;
- purpose, data flow, threat boundary, privacy impact, API contract (or an explicit NONE), rollback plan and release gate.

## Dependency rule

Dependencies must point inward toward stable capabilities. Cycles are prohibited. Removing or replacing a module requires checking its dependants first. A provider may change without changing a domain contract: payment gateway, email provider, storage service, authentication implementation, analytics provider and career-reference source are adapters rather than the domain itself.

## Activation rule

Registration does not mean production. Activation requires a valid dependency graph, an ON feature flag, the module's release gate, and a production-capable lifecycle state. PREVALIDATION, PREINTEGRATION, STAGING and PLANNED_OFF modules cannot be promoted by client state.

## Why this matters

The architecture can therefore expand from a static bilingual public surface into a server-backed education platform without rebuilding the identity, SEO, privacy, evidence, commerce, journal and research boundaries each time. New products inherit the foundation instead of bypassing it.
