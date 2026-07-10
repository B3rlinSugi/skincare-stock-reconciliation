# Security Policy

## Supported Versions

Currently, only the latest `main` branch and the latest release are supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

Security is a top priority for this project, especially since it handles financial and inventory data. 

If you discover a vulnerability, **please do not open a public issue.**

Instead, please email the maintainer at `berlin.sugiyanto@example.com` (replace with actual email if applicable) or reach out via direct message on GitHub.

We will evaluate the issue and release a patch as soon as possible.

### Security Architecture Highlights
- **No Client-Side API Keys:** The `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to Next.js Server Actions and never leaked to the client.
- **Row Level Security (RLS):** All data access is gated at the PostgreSQL level.
- **JWT Integrity:** Sessions are managed via secure HttpOnly cookies.
- **SQL Injection Prevention:** Supabase client bindings inherently use prepared statements, neutralizing SQL injection vectors.
