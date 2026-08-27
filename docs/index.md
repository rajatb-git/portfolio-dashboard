---
layout: home

hero:
  name: Portfolio Dashboard
  text: Your holdings, all in one place
  tagline: A self-hosted dashboard for stocks and crypto — live market data, portfolio analytics, price alerts, MQTT notifications and optional AI equity research. Your data stays on your own machine.
  image:
    src: /logo.svg
    alt: Portfolio Dashboard
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: What it does
      link: /guide/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/rajatb-git/portfolio-dashboard

features:
  - icon: 📊
    title: Live portfolio view
    details: Every holding across every account, enriched in real time with price, day change, market value, gain/loss and analyst ratings.
    link: /features/dashboard
    linkText: Dashboard & Today
  - icon: 📈
    title: Analytics that go deeper
    details: Risk metrics, sector allocation, performance attribution, realized gains, monthly returns, correlation and tax-loss harvesting candidates.
    link: /features/analytics
    linkText: Analytics
  - icon: ⚖️
    title: Rebalancing
    details: Set target weights per symbol and see drift, the dollar trade and the approximate share count needed to get back on plan.
    link: /features/rebalance
    linkText: Rebalance
  - icon: 🔎
    title: Ticker research
    details: Quote, fundamentals, peers, earnings history, insider transactions and news for any symbol — with an optional AI-written synthesis.
    link: /features/research
    linkText: Research & AI
  - icon: 🔔
    title: Alerts you actually get
    details: Price triggers, big-move and spike alerts, breaking news, earnings and dividend reminders — delivered over MQTT, with quiet hours.
    link: /features/alerts
    linkText: Alerts & notifications
  - icon: 🔒
    title: Private by design
    details: Runs on your hardware against your own MongoDB. Personal financial data is never sent to an external AI provider — that rule is enforced in the codebase.
    link: /internals/ai-privacy
    linkText: The privacy rule
---

## Why self-host it?

Portfolio Dashboard is a single-user app you run yourself. There is no hosted
service, no account to create and no third party holding your positions. It
talks to Finnhub and NASDAQ for public market data, stores everything in a
MongoDB instance you control, and exposes the whole dataset as a zip you can
export at any time.

## Quick start

```sh
git clone https://github.com/rajatb-git/portfolio-dashboard.git
cd portfolio-dashboard
pnpm install
cp packages/backend/.env.example packages/backend/.env   # add MONGO_URI + FINN_HUB_API_KEY
pnpm dev
```

The frontend comes up on `http://localhost:5173` and the API on
`http://localhost:3001`. Full walkthrough in
[Getting started](/guide/getting-started), or go straight to
[Deploying with Docker](/guide/docker).

::: tip No portfolio data yet?
Turn on [Demo Mode](/features/demo-mode-and-lock) in **Settings** to explore
every screen against a generated dataset in a separate database. Your real
data is untouched.
:::
