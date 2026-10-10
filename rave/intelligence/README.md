# Unified intelligence metrics core

Portable, source-aware metric validation and aggregation. This is a code foundation, not a deployed dashboard or live reporting service.

Source-specific adapters must authenticate and validate their data before creating metrics. Never trust user-submitted revenue or mix currencies. Period and service IDs must be reconciled to canonical catalogues. Do not store customer records in GitHub. Read-only search metrics and verified backend commerce metrics remain distinct authorities.

Run: node --test rave/intelligence/metrics.test.mjs

Next: authenticated private ingestion, durable persistence, RBAC, metric lineage and management API, then dashboard.
