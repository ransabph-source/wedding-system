This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend (Supabase)

Events, guests, tables and zones are stored in Supabase Postgres. The browser
talks only to the Next.js API routes in `src/app/api/events/`, which query the
database with a server-only secret key.

One-time setup:

1. Create a project at [supabase.com](https://supabase.com).
2. In the project's **SQL Editor**, run `supabase/migrations/20260930000000_init.sql`,
   then `supabase/migrations/20261001000000_roles.sql` (user roles and event
   owners), then `supabase/migrations/20261002000000_leads.sql` (the sales
   leads CRM), then `supabase/migrations/20261003000000_leads_convert.sql`
   (lead-to-event conversion), then `supabase/migrations/20261004000000_role_claim.sql`
   (puts the user's role in their session token), then `supabase/seed.sql`
   (optional demo data).
   Then enable the role hook: **Authentication → Hooks → Customize Access
   Token (JWT) Claims** → Postgres function `public.custom_access_token_hook`.
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY` and `SUPABASE_PUBLISHABLE_KEY` from the project's settings.
4. Create your admin account: in **Authentication → Users**, add a user, then
   run the commented `insert into public.profiles ...` query at the bottom of
   the roles migration with that user's email.
5. Restart `npm run dev` and sign in at `/login`.

`/admin` and `/api/admin/*` require a signed-in user whose profile role is
`admin` (checked in `src/app/admin/layout.tsx` and in each admin route via
`getCurrentUser()` from `src/lib/auth.ts`).

Staff (hostess) accounts are created at `/admin/staff`. Staff land on `/live`
after login, where they pick today's event or enter an event ID, and may only
open `/live/*`. `src/proxy.ts` redirects them away from `/admin` and `/couple`
using the role claim from the hook above (see `src/lib/areas.ts`); the
layouts and API routes enforce the same rules against the database, and the
guests API lets staff change only arrival fields.

| Route | Methods |
| --- | --- |
| `/api/events` | `GET` list, `POST` create |
| `/api/events/[eventId]` | `GET`, `PUT` (partial update, e.g. `{ "phase": "SEATING" }`), `DELETE` |
| `/api/events/[eventId]/guests` | `GET`, `POST` (create `Guest[]`), `PUT` (upsert `Guest[]`), `DELETE` (`{ "ids": [...] }`) |
| `/api/events/[eventId]/tables` | same as guests, with `SeatingTable[]` |
| `/api/events/[eventId]/zones` | same as guests, with `SeatingZone[]` |

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
