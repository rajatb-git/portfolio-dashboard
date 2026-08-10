# Contributing to Portfolio Dashboard

Thanks for your interest in contributing! This is a self-hosted, single-user
app for tracking stock and crypto holdings. Contributions of all sizes are
welcome — bug fixes, features, docs, and tests.

Please read this guide before opening a pull request. For deeper design and
architecture notes, see [`docs/`](docs/).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating, you agree to uphold it.

## Getting set up

Requires **Node ≥ 22** and **pnpm** (the repo pins a version via
`packageManager` — run `corepack enable` and pnpm will match it).

```sh
# 1. Fork and clone
git clone https://github.com/<your-user>/portfolio-dashboard.git
cd portfolio-dashboard

# 2. Install
pnpm install

# 3. Configure the backend
cp packages/backend/.env.example packages/backend/.env
#    add a free Finnhub API key (https://finnhub.io) to packages/backend/.env

# 4. Run both packages
pnpm dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3001`.

### Common commands

| Task | Command |
|---|---|
| Dev (both) | `pnpm dev` |
| Build all | `pnpm -r build` |
| Lint | `pnpm lint` |
| Format | `pnpm format` |

## Project layout

```
packages/frontend/   React 19 + MUI 7 SPA (Vite)
packages/backend/    Koa 3 API + MongoDB (centralized document store)
docs/                architecture, design system, UI + error-handling guides
```

A fuller tour lives in [`docs/architecture.md`](docs/architecture.md).

## The one hard rule: never send personal financial data to external AI

**Personal financial data must never be sent to an external AI provider**
(Claude API, Gemini API, or any non-local service). This includes holding
quantities, cost basis, purchase/average prices, gain/loss, portfolio dollar
values, account IDs/names, transaction history, and target prices.

The only AI feature permitted to call an external provider is the per-ticker
research insight, and it sends **only publicly available market data** for a
single symbol (company profile, price, analyst ratings, earnings, news
headlines). If your change touches any AI code path, confirm the prompt
contains nothing about the user's personal position. When in doubt, don't
build it — open an issue to discuss first.

## Making a change

1. **Branch off `develop`** in your fork: `git checkout -b fix/short-description`.
2. Keep changes focused — one logical change per PR.
3. Follow the existing patterns (see below). Don't introduce new patterns for
   things the codebase already solves a specific way.
4. Run `pnpm lint` and `pnpm -r build` locally; both must pass. Add or update
   tests where it makes sense.
5. Bump the version (see below).
6. Open a PR against `develop` and fill out the template.

### Coding conventions (please match these)

- **TypeScript strict.** Avoid `any` unless the surrounding code already uses it.
- **Error handling.** Every backend route wraps logic in `try/catch`, logs via
  winston, and returns a structured `errorBody(name, message)` — never a raw
  string. Every frontend API method ends with `.catch(catchCustomError)`, and
  every call site surfaces failures via `toast.error(...)`. No silent catches.
  See [`docs/error-handling.md`](docs/error-handling.md).
- **Forms.** Inputs persist behind an explicit **Save** button with dirty-state
  tracking, not `onBlur`/`onChange` auto-save. See the AI Agent section of
  `pages/Settings.tsx` for the reference pattern.
- **UI.** Stick to MUI components and `sx` props (no custom CSS beyond
  `global.css`). Icons via the `Iconify` component. Loading states use MUI
  `Skeleton`. Respect light/dark theme tokens.
- **Path params.** Any route taking a filename/path must validate against an
  allowlist (path-traversal guard).
- **Comments** explain a non-obvious *why*, not *what*.

### Commit messages

Short imperative subject, blank line, then a bulleted body explaining *why*
(not just *what*). Example:

```
Cache sector lookups per symbol

- Finnhub sector calls were repeated on every dashboard render
- add a CacheDBModel-backed lookup keyed by symbol to cut request volume
```

### Version bumping (required)

Every change bumps the version in **all three** `package.json` files
(root, `packages/frontend`, `packages/backend`) — kept in lockstep at the same
number. Use [semver](https://semver.org) based on what the **whole PR**
delivers:

- **patch** — bug fix, refactor, perf, copy/docs (`3.9.6` → `3.9.7`)
- **minor** — a new backward-compatible feature or capability (`3.9.6` → `3.10.0`)
- **major** — a breaking change (`3.9.6` → `4.0.0`)

Bump once per branch relative to `develop`, as part of your commit (not a
separate commit).

## Reporting bugs & requesting features

Use the [issue templates](.github/ISSUE_TEMPLATE/). Search existing issues
first to avoid duplicates. For security issues, **do not** open a public issue —
see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
