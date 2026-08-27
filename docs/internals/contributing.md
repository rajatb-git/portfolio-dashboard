# Contributing

Contributions of all sizes are welcome — bug fixes, features, docs and tests.
This page is the working version of
[`CONTRIBUTING.md`](https://github.com/rajatb-git/portfolio-dashboard/blob/develop/CONTRIBUTING.md)
in the repository; the repo file is authoritative if the two ever drift.

The project follows the
[Contributor Covenant](https://github.com/rajatb-git/portfolio-dashboard/blob/develop/CODE_OF_CONDUCT.md).

## Getting set up

Requires **Node ≥ 22** and **pnpm** (`corepack enable` picks up the pinned
version).

```sh
git clone https://github.com/<your-user>/portfolio-dashboard.git
cd portfolio-dashboard
pnpm install
cp packages/backend/.env.example packages/backend/.env   # MONGO_URI + FINN_HUB_API_KEY
pnpm dev
```

Full walkthrough: [Getting started](/guide/getting-started).

## The one hard rule

**Never send personal financial data to an external AI provider.** Read
[the AI data-privacy rule](/internals/ai-privacy) before touching any AI code
path. A PR that violates it will not be merged.

## Making a change

1. Branch off `develop`: `git checkout -b fix/short-description`.
2. Keep it focused — one logical change per PR.
3. Follow the existing patterns. Do not invent a new one for something the
   codebase already solves a specific way.
4. Run `pnpm lint` and `pnpm -r build` — both must pass.
5. Bump the version (below).
6. Open a PR against `develop` and fill out the template.

## Conventions

| Area | Rule |
|---|---|
| **TypeScript** | Strict. Avoid `any` unless the surrounding code already uses it |
| **Backend errors** | `try/catch` in every route, log via winston, return `errorBody(name, message)` — never a raw string. `400` for client errors, `500` for server errors |
| **Frontend errors** | Every API method ends with `.catch(catchCustomError)`; every call site surfaces failures with `toast.error(...)`. No silent catches |
| **Forms** | Inputs persist behind an explicit **Save** button with dirty-state tracking — never `onBlur`/`onChange` auto-save |
| **UI** | MUI components and `sx` props only. Icons via `Iconify`. Loading states use `Skeleton`, not spinners. Respect theme tokens |
| **Path params** | Any route taking a filename or path validates against an allowlist |
| **Comments** | Explain a non-obvious *why*, never the *what* |

The long versions: [Error handling](/internals/error-handling),
[UI conventions](/internals/ui-conventions),
[Design system](/internals/design-system).

## Commit messages

Short imperative subject, blank line, bulleted body explaining *why*:

```
Cache sector lookups per symbol

- Finnhub sector calls were repeated on every dashboard render
- add a CacheDBModel-backed lookup keyed by symbol to cut request volume
```

## Version bumping

Every PR bumps the version in **all three** `package.json` files (root,
`packages/frontend`, `packages/backend`), kept in lockstep, using
[semver](https://semver.org) based on what the whole PR delivers:

| Bump | When |
|---|---|
| **patch** | Bug fix, refactor, perf, copy or docs change |
| **minor** | A new backward-compatible feature or capability |
| **major** | A breaking change |

Bump once per branch relative to `develop`, in the same commit as your change —
not a separate one.

## Documentation

This site lives in `docs/` and is built with [VitePress](https://vitepress.dev/).

```sh
pnpm docs:dev      # hot-reloading local server
pnpm docs:build    # production build into docs/.vitepress/dist
pnpm docs:preview  # serve the built output
```

Structure:

```
docs/
  index.md            home page
  guide/              install, configure, deploy, troubleshoot
  features/           one page per user-facing feature
  reference/          API, env vars, data models, services, commands
  internals/          architecture and engineering conventions
  .vitepress/         config and theme
```

Adding a page means creating the Markdown file **and** adding it to the sidebar
in `docs/.vitepress/config.ts`. The build fails on dead internal links, so a
broken cross-reference is caught in CI rather than shipped.

**Publishing is automatic.** The `Docs` workflow builds the site on every PR
that touches `docs/`, and deploys to GitHub Pages on every push to `develop`.
Nothing to do by hand.

::: tip Keep docs in the same PR as the change
A feature PR that changes behaviour should update the page describing that
behaviour. It is much cheaper than a docs-catch-up PR later.
:::

## Reporting bugs & requesting features

Use the
[issue templates](https://github.com/rajatb-git/portfolio-dashboard/issues/new/choose).
Search first to avoid duplicates.

For security issues, **do not** open a public issue — follow
[SECURITY.md](https://github.com/rajatb-git/portfolio-dashboard/blob/develop/SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](https://github.com/rajatb-git/portfolio-dashboard/blob/develop/LICENSE).
