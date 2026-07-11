# Production Runbook — VastuPlan 2D

Quick reference for tasks that must be done in external dashboards (Supabase, Vercel, Google Cloud) before a deployed feature works in production.

## Supabase Auth configuration

The app uses Supabase Auth for email/magic-link and Google sign-in. If auth methods return **"Supabase Auth is not configured"**, the live Supabase project has not been set up.

### 1. Auth URL Configuration

In the Supabase dashboard for the production project:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to the deployed Vercel domain, e.g. `https://<your-vercel-domain>/`.
3. Add the same domain with a wildcard to **Redirect URLs**:
   - `https://<your-vercel-domain>/**`
4. Save changes.

> The app redirects to `/auth/callback` after magic-link/OAuth flows, so the wildcard redirect is required.

### 2. Email provider

1. Go to **Authentication → Sign In / Providers → Email**.
2. Enable the **Email** provider.
3. Configure confirmation / secure email-change settings as needed.

### 3. Google OAuth provider

1. In Google Cloud Console, create or open the OAuth 2.0 client for VastuPlan.
2. Add the Supabase callback URL to **Authorized redirect URIs**.
   - The exact URL is shown in **Supabase → Authentication → Sign In / Providers → Google**.
3. In Supabase, enable the **Google** provider and paste the **Client ID** and **Client Secret**.
4. Save changes.

### 4. Vercel environment variables

In the Vercel project dashboard:

1. Open **Settings → Environment Variables**.
2. Make sure these are set to the production Supabase values (from **Supabase → Project Settings → API**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Redeploy the project after changing environment variables.

> Note: the **OAuth Server** page in Supabase (`/auth/oauth-server`) is not related to logging users into your app. It makes your Supabase project act as an identity provider for third-party apps. Leave it off unless you specifically need that capability.

## Vercel deployment

- Production auto-deploys on pushes to `main`.
- Preview deploys are created for every pull request.
- If the preview returns 403, use `npx vercel share <url>` or the Vercel dashboard to generate a temporary access link.

## Analytics / error tracking

- Plausible and Sentry credentials live in environment variables. Verify they are set in Vercel for production previews if you want production data.

## Domain / DNS

## Razorpay / Pro Export Pack configuration

M-2 added server-side Razorpay payments. The UI will warn "Payments are not configured" until these steps are completed.

### 1. Razorpay account keys

1. In Razorpay Dashboard, copy the **Key ID** and **Key Secret** for the production mode (`rzp_live_...`).
2. Add them to the Railway (or hosting) environment for the server:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET` (generate a webhook secret in the Razorpay dashboard)
3. Add `SUPABASE_JWT_SECRET` to the server environment (from **Supabase → Project Settings → API → JWT Settings**).

### 2. Razorpay webhook

1. In Razorpay Dashboard → Settings → Webhooks, add a webhook pointing to:
   - `https://<your-api-domain>/api/payments/webhook`
2. Enable these events:
   - `payment.captured`
   - `order.paid`
3. Paste the same `RAZORPAY_WEBHOOK_SECRET` into the server environment.

### 3. Pricing / duration

The Pro Export Pack defaults to ₹499 for 365 days. Override in the server environment if needed:

- `PRO_EXPORT_PRICE_PAISE=49900` (amount in paise; 49900 = ₹499)
- `PRO_EXPORT_CURRENCY=INR`
- `PRO_EXPORT_TIER=pro_export`
- `PRO_EXPORT_DURATION_DAYS=365`

### 4. Database schema

Run the updated `server/db/001_public_schema.sql` in the Supabase SQL Editor. It creates:

- `public.payments` — order/payment records.
- `public.webhook_events` — Razorpay webhook idempotency log.
- Updated `public.user_entitlements` policy to allow server upserts.

### 5. Test the live flow

1. Sign in on the deployed app.
2. Open **Presentation Export** (`/app`).
3. Click **Upgrade to Pro for ₹499**.
4. Complete a Razorpay test-card payment.
5. Verify the export no longer applies the watermark.

## Domain / DNS

If a custom domain is added later, update the Supabase **Site URL** and **Redirect URLs** to match the custom domain and redeploy.
