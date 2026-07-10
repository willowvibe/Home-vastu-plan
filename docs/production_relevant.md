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

If a custom domain is added later, update the Supabase **Site URL** and **Redirect URLs** to match the custom domain and redeploy.
