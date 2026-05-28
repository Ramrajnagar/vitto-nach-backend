# Vitto e-NACH Backend

A conversational pre-screening and automated repayment ledger for micro-lending built for the Vitto Money assignment.

## The Problem

Most small business owners in India (kirana stores, tailors, mobile repair shops) don't have a credit score. They need small loans fast. But the paperwork, verification, and follow-ups kill the deal before it starts.

On the repayment side  chasing EMI manually is expensive. NACH mandates exist but integrating them with a clean ledger and retry logic is where most teams drop the ball.

## What This Does

This is a no-frills backend that solves two core workflows:

### 1. WhatsApp Pre-Screening

A user texts something like:

> "Hi, my name is Rajesh, I run a grocery store and make 50000 a month. I need a loan."

The API parses this conversationally (Hinglish/English), extracts name, business type, and income and responds back with:

- Confirmed registration
- Loan range (up to 3x monthly income)
- Suggested EMI (40% of income)
- "We'll call you in 24 hours"

No forms. No dropdowns. Just text.

### 2. e-NACH Repayment Ledger

A webhook endpoint accepts repayment status from a payment gateway. If payment fails:

- Marks the repayment as FAILED
- Increments retry counter
- Applies ₹250 late fee
- Logs audit trail

If it succeeds — clean close. Paid_at timestamped. No orphan records.

## Stack

| Thing | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js (ESM) | Ships on Vercel serverless, no build step |
| Framework | Express | Bare minimum, no magic |
| Database | PostgreSQL | Raw `pg` driver — no ORM, no cold-start tax |
| Deployment | Vercel | Free tier, routes via vercel.json |

## API

```
POST /api/whatsapp-webhook   →  Register user from text message
POST /api/repayment-webhook  →  Process e-NACH callback (SUCCESS/FAILED)
GET  /api/dashboard          →  See all users + repayment status
GET  /api/health             →  Health check
```

## What You Need to Run This

A Postgres connection string. That's it.

Get one free from [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com). Put it in `.env`:

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

Then:

```
npm install
npm run db:init    # creates tables + mock data
npm run dev        # starts on localhost:3000
```



## Why This Approach

- **No ORM** — Prisma/Sequelize adds 50-80ms to every cold start on serverless. Raw `pg` keeps it under 5ms.
- **Connection pool is lazy-initialized** — doesn't connect until the first request hits. Survives Vercel's warm/cold cycles without exhausting Postgres connections.
- **The parser is regex + rules** — not an LLM call. Runs in microseconds. No API bills. But still handles Hinglish naturally.

