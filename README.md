# PHOTA — Hospital and Public Donation Portal

PHOTA is a responsive Next.js application for verified hospitals and individual patients/donors. It combines hospital-managed medical records with a protected public portal for nearby blood and organ availability.

## Main capabilities

- Separate hospital/admin and public-user authentication with HTTP-only JWT sessions.
- Mandatory one-time email codes for hospitals and public users, renewed every seven days.
- Hospital approval/rejection/deletion and blocked-public-account review by administrators.
- Blood and organ searches with medical compatibility checks and nearest-first geolocation ranking.
- Privacy-preserving public results: approximate distance bands are shown instead of donor addresses or stable donor identifiers.
- Protected requester/donor match rooms with rate limits and automated message moderation.
- A transactional three-month cooldown after a completed blood donation. Active listings and conversations for that donor are closed atomically.
- Search-abuse detection that automatically blocks suspicious accounts until an administrator reviews them.

Potential matches are coordination aids only. Final donor and recipient eligibility must be confirmed by qualified clinicians and a verified hospital.

## Local setup

Copy `.env.example` to `.env` and configure:

```dotenv
DATABASE_URL=postgresql://...
JWT_SECRET=use-a-long-random-secret
OTP_PEPPER=use-a-different-long-random-secret
RATE_LIMIT_PEPPER=use-another-long-random-secret
RESEND_API_KEY=re_...
EMAIL_FROM=PHOTA <verification@your-verified-domain.example>
OPENAI_API_KEY=sk-...
```

`RESEND_API_KEY` and `EMAIL_FROM` are required to deliver verification codes. `OPENAI_API_KEY` is required for public match chat; messages fail closed when the AI safety moderator is unavailable.

Generate each signing/pepper value independently (for example, `openssl rand -base64 48`). Never reuse a sample value or commit the populated `.env` file.

Install and run:

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run lint
npm run build
npm start
```

## Architecture

- `app/public/` — public portal pages, dashboard, profile, verification, and match rooms.
- `app/api/public/` — public authentication, listings, search, matches, chat, and donation completion.
- `app/api/verification/` — shared hospital/public email verification endpoints.
- `app/admin/hospitals/` — hospital approval and public anti-spam review console.
- `lib/public-auth.ts` and `lib/auth.ts` — isolated public and hospital JWT/session boundaries.
- `lib/public-db.ts` and `lib/db.ts` — Neon persistence, schema initialization, transactional matching, and cooldown enforcement.
- `lib/verification.ts` and `lib/email.ts` — hashed, expiring OTP workflow and email delivery.
- `lib/geo.ts`, `lib/matching.ts`, and `lib/medical-rules.ts` — location ranking and medical eligibility rules.
- `lib/moderation.ts`, `lib/abuse.ts`, and `lib/security.ts` — communication moderation, throttling, account blocking, and request protections.

The server initializes additive PostgreSQL tables and indexes on first database access. Public signup can never provision an administrator; administrator accounts must be created through a trusted server-side/database process.
