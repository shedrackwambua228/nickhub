# NICKHUB Backend

Node.js / Express API for the NICKHUB frontend: auth, releases, royalties,
withdrawals, support tickets, admin review, and Stripe subscription billing
at **$2.99/month** or **$25.00/year**.

## Stack

- **Express** — HTTP API
- **PostgreSQL + Prisma** — database and ORM
- **Stripe** — subscription billing (Checkout + Customer Portal + webhooks)
- **JWT + bcrypt** — auth

Recommended free/cheap hosting: **Postgres** on [Neon](https://neon.tech) or
[Supabase](https://supabase.com); **API** on [Railway](https://railway.app)
or [Render](https://render.com) — both deploy a Node app from a git repo in
a few clicks and let you set environment variables in their dashboard.

## 1. Install

```bash
cd nickhub-backend
npm install
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — from your Postgres provider
- `JWT_SECRET` — any long random string (`openssl rand -hex 32`)
- `STRIPE_SECRET_KEY` — from the Stripe Dashboard → Developers → API keys
- `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` — see step 2

## 2. Create the two Stripe Prices

In the Stripe Dashboard → **Product catalog** → **Add product**:

1. Product: "NICKHUB Subscription"
   - Price 1: **$2.99**, recurring **monthly** → copy the Price ID into `STRIPE_PRICE_MONTHLY`
   - Price 2 (add another price to the same product): **$25.00**, recurring **yearly** → copy into `STRIPE_PRICE_YEARLY`

Or via CLI:

```bash
stripe products create --name "NICKHUB Subscription"
stripe prices create --product prod_xxx --unit-amount 299 --currency usd --recurring[interval]=month
stripe prices create --product prod_xxx --unit-amount 2500 --currency usd --recurring[interval]=year
```

## 3. Set up the database

```bash
npx prisma migrate dev --name init
```

This creates all tables from `prisma/schema.prisma`. To seed an admin user,
sign up normally through `/api/auth/signup`, then flip that user's `role` to
`ADMIN` directly in the database (or `npx prisma studio`).

## 4. Run it

```bash
npm run dev      # local dev, auto-reload
npm start         # production
```

API is live at `http://localhost:4000`. Health check: `GET /health`.

## 5. Stripe webhook (required for subscriptions to actually activate)

Locally:

```bash
stripe listen --forward-to localhost:4000/api/billing/webhook
```

Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET` in `.env`.

In production, add an endpoint in the Stripe Dashboard pointing to
`https://your-api.com/api/billing/webhook`, subscribed to at least:
`checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`invoice.payment_failed`. Copy that endpoint's signing secret into
`STRIPE_WEBHOOK_SECRET` on your host.

## API overview

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me` |
| Releases | `GET/POST /api/releases`, `GET /api/releases/:id`, `POST /api/releases/:id/submit` |
| Royalties | `GET /api/royalties`, `GET /api/royalties/summary` |
| Withdrawals | `GET/POST /api/withdrawals` |
| Support | `GET/POST /api/support` |
| Billing | `POST /api/billing/checkout-session`, `POST /api/billing/portal-session`, `GET /api/billing/subscription` |
| Admin | `/api/admin/users`, `/api/admin/releases/pending`, `/api/admin/releases/:id/review`, `/api/admin/withdrawals`, `/api/admin/royalty-reports/import`, `/api/admin/tickets` |

All routes except signup/login require `Authorization: Bearer <token>`.
Admin routes additionally require the caller's `role` to be `ADMIN`.
Creating and submitting releases requires an **active subscription**
(`requireActiveSubscription` middleware) — remove that middleware from
`src/routes/releases.routes.js` if you want a free tier instead.

## Wiring up the existing frontend

The uploaded `index.html` is a static prototype (all `alert()` placeholders,
no real requests). To connect it:

1. On signup/login, `POST /api/auth/signup` or `/login`, store the returned
   `token` (e.g. in memory or `sessionStorage` — avoid `localStorage` for
   anything sensitive), and send it as `Authorization: Bearer <token>` on
   every subsequent request.
2. Replace the "Submit for review" button's `alert(...)` with a real
   `POST /api/releases` (create) followed by `POST /api/releases/:id/submit`.
3. Add a pricing call-to-action that hits
   `POST /api/billing/checkout-session` with `{ "plan": "monthly" }` or
   `{ "plan": "yearly" }`, then redirect the browser to the returned `url`
   (Stripe Checkout). After payment, Stripe redirects back to your
   `CLIENT_URL/billing/success` page.
4. For account management (cancel/change plan), call
   `POST /api/billing/portal-session` and redirect to the returned `url`
   (Stripe's hosted Customer Portal).

## What's intentionally left simple

- File storage for audio/artwork isn't wired to a provider — swap in S3,
  Cloudflare R2, or similar and store the resulting URL in `audioUrl` /
  `artworkUrl` when creating a release.
- "Available balance" for withdrawals isn't computed automatically from
  royalty lines yet — add that calculation in `withdrawals.controller.js`
  once you decide how commission and payout timing should work.
- Payout methods like M-Pesa aren't wired to a payment processor — Stripe
  handles the *subscription* charges, but paying artists out is a separate
  integration (e.g. Flutterwave or Paystack, which support M-Pesa payouts
  in Kenya) you'd add in the withdrawals flow.
