# RAVE — portable visibility monitoring foundation

Run locally or on any CI runner with Node.js 20+:

```sh
node rave/audit.mjs
```

Optional site override: `PUBLIC_SITE_ORIGIN=https://staging.example.org node rave/audit.mjs`.

The monitor checks configured public routes and writes a machine-readable report to `rave/reports/latest.json`. It is intentionally read-only, uses no Cloudflare APIs and does not modify production, spend money or send messages. A GitHub Actions workflow schedules the same CLI and stores reports as workflow artifacts. The workflow is installed on a feature branch and will not run on its daily schedule until merged into the default branch.

See `PORTABILITY-ARCHITECTURE.md` for the mandatory migration-ready design contract. This is a minimal functional foundation, **not** a complete SEO, AI visibility, sales or marketing automation engine.
