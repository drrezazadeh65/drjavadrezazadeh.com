# Staging and Preview Policy — Bertina-era

Non-production previews are not production origins.

Rules:
- production canonical URLs always remain on `https://drjavadrezazadeh.com`;
- preview builds must be noindex where publicly reachable;
- private routes remain no-store and noindex;
- synthetic data only in preview environments;
- production database, email and payment secrets are never injected into public preview builds;
- promotion to production requires CI, Bertina deployment, and live-origin verification.

GitHub is used for source control and CI. Bertina is the only production runtime.
