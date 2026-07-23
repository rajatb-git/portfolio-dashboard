# Security Policy

Portfolio Dashboard is a self-hosted, single-user application that handles
personal financial data. Security reports are taken seriously.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report privately through GitHub's **[Private vulnerability reporting](https://github.com/rajatb-git/portfolio-dashboard/security/advisories/new)**
(Security → Advisories → "Report a vulnerability"). This keeps the report
confidential until a fix is available.

Please include:

- A description of the issue and its potential impact.
- Steps to reproduce (a proof of concept if possible).
- Affected version(s) and any relevant configuration.

You can expect an initial acknowledgement within a few days. Once triaged, a
fix will be prepared and released, and the report disclosed responsibly after
users have had a chance to update.

## Scope

This project is designed to run locally without authentication. When assessing
severity, keep in mind:

- It is intended for a single trusted user on their own machine/network — it is
  **not** hardened for multi-tenant or public-internet deployment.
- Reports of highest interest include: path traversal in file/backup handling,
  leakage of personal financial data to external services (see the AI
  data-privacy rule in [`CLAUDE.md`](CLAUDE.md)), dependency vulnerabilities
  with a practical exploit, and secret/credential exposure.

## Supported versions

This is an actively developed project; fixes land on the latest release. Please
reproduce issues against the most recent version before reporting.
