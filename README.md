# Vision Board

A compact personal vision board built with Next.js, designed for Vercel.

## V1 features

- Pastel, responsive vision board
- Promotion & Career and Travel with Wife as priority areas
- Financial Freedom, Health & Lifestyle, Family & Happiness
- OM symbol and browser-generated continuous OM-like meditation sound
- Sound ON by default with mute/unmute control
- "I Saw My Vision Board" tracker: 3 fixed daily slots (morning 5am-12pm, afternoon 12-5pm, evening 5pm-5am)
- Calendar view (/calendar) with Day, Week, Month and Year views
- Weekly actions per life area: up to 3 editable, checkable actions per area each week (Mon–Sun), stored in `public.vision_board_actions`
- Save labels: each view and action shows "☁ Saved in Supabase" only after the database confirmed the write, otherwise "device only"
- Sync across devices: a private sync code (shown under "Sync across devices") lets a second device load the same views and actions
- LocalStorage fallback
- Supabase cloud tracking when environment variables are configured

## Supabase setup

The app uses the Supabase project configured for the Vision Board and stores daily viewing records in:

`public.vision_board_views`

No login is required. A random sync code (stored as `visitor_id`) identifies your board. It is sent with every request in the `x-visitor-id` header.

`supabase/migrations/202609301003_scope_rls_to_sync_code.sql` restricts each request to rows matching that code. Apply it only after this version is deployed, because the older app does not send the header.

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
