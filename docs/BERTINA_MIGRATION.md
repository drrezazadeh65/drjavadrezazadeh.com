# Bertina Production Migration

## Current decision
Bertina is the sole production hosting/DNS/PHP/MySQL/domain-mail platform. GitHub remains source control and CI.

## Deployment
The sanitized public artifact is deployed by GitHub Actions over explicit TLS FTP to Bertina `public_html`. Local runtime files such as `api/config.local.php`, `.user.ini`, `php.ini`, `.well-known/` and `cgi-bin/` are preserved.

## Application runtime
Browser clients use same-origin `/api/`. The PHP runtime lives under `api/` and is fail-closed until its local configuration is present. MySQL schema is stored in `docs/BERTINA_MYSQL_SCHEMA.sql`.

## Email
Account verification, password recovery and transactional mail use Bertina domain mail after a domain mailbox and local mail transport are verified. No retired transactional-email provider is required.

## Security
Do not enable public authentication or payment until trusted TLS is installed. Secrets never belong in Git or browser JavaScript. Private and API routes remain no-store/noindex.
