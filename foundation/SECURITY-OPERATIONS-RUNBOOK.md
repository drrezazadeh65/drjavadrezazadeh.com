# Security Operations Runbook

## Scope
This runbook defines the production control contract. It does not claim that an external provider is already provisioned.

## Identity and administration
ADMIN and SUPER_ADMIN accounts require MFA. Roles are server-authoritative and every grant/revoke is audited. Recovery revokes existing sessions. Raw passwords, recovery tokens and session secrets are never persisted.

## Upload quarantine
Private uploads remain unavailable until authenticated ownership, MIME allow-list, size limit and malware scan all pass. Failed or indeterminate scans stay quarantined. Public URLs are never generated for private educational records.

## Retention and rights
Each data class carries a purpose, retention basis and deletion/export rule. Operational deletion and research obligations are evaluated separately. Legal holds suspend destructive deletion without converting the data into a new purpose.

## Backup and recovery
Production requires encrypted backups, documented RPO/RTO, scheduled restore tests and recorded evidence of the restore result. A backup that has not been restore-tested is not accepted as recovery readiness.

## Incident response
Triage severity; preserve audit evidence; contain access; rotate affected credentials; eradicate cause; restore from known-good state; validate privacy impact; notify where legally required; document corrective actions and complete a post-incident review.

## Vulnerability reporting
Publish a security contact on the permanent domain. Reports must never request passwords, private records or secrets in a public issue. Confirm receipt, triage severity, remediate, verify and close with an auditable record.
