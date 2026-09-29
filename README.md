# Vision Board

A compact personal vision board built with Next.js, designed for Vercel.

## V1 features

- Pastel, responsive vision board
- Promotion & Career and Travel with Wife as priority areas
- Financial Freedom, Health & Lifestyle, Family & Happiness
- OM symbol and browser-generated continuous OM-like meditation sound
- Sound ON by default with mute/unmute control
- "I Saw My Vision Board" daily viewing tracker
- LocalStorage fallback
- Supabase cloud tracking when environment variables are configured

## Supabase setup

The app uses the Supabase project configured for the Vision Board and stores daily viewing records in:

`public.vision_board_views`

No login is required. A random browser `visitor_id` is stored locally so the app can associate daily views with the same browser.

Set these Vercel environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://ccqhvmavmgngevihtcnf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your Supabase publishable key>
```

A template is provided in `.env.example`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

If the Supabase environment variables are not configured, the app continues to work using localStorage only.

## Deployment

Import the GitHub repository into Vercel and add the two Supabase environment variables before deploying.
