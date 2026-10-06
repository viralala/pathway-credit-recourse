# Connecting Supabase and Google sign-in

Pathway runs without a database. These steps switch on accounts ("Sign in", "Save this plan",
"My plans") and the partner enquiry form. They take about 15 minutes and need someone with
access to the Supabase project and to a Google Cloud project.

## 1. Create the tables

In the Supabase dashboard, open **SQL Editor**, paste the whole of
`migrations/20261005000000_pathway_accounts.sql`, and run it once. It creates four tables
(`profiles`, `saved_plans`, `plan_checkins`, `partner_enquiries`) with row level security on
every one, and three functions (`delete_my_account`, `submit_partner_enquiry`, and a trigger that
creates a profile for each new account).

With the Supabase CLI instead: `supabase link --project-ref <ref>` then `supabase db push`.

## 2. Google OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com/), go to **APIs & Services >
   OAuth consent screen**. Choose **External**, fill in the app name (Pathway), a support email,
   and the links to `/privacy` and `/terms` on your domain. Add the scopes `openid`, `email` and
   `profile` only.
2. Go to **Credentials > Create credentials > OAuth client ID**, type **Web application**.
3. Under **Authorised redirect URIs** add the callback Supabase shows you in step 3 (it looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`).
4. Copy the client ID and client secret.

## 3. Turn on Google in Supabase

1. **Authentication > Sign In / Providers > Google**: enable it and paste the client ID and secret.
2. **Authentication > URL Configuration**:
   - **Site URL**: your production address, e.g. `https://pathway-credit-recourse.vercel.app`
     (later your custom domain).
   - **Redirect URLs**: add `https://<your-domain>/auth/callback**` (the `**` lets the sign-in
     carry a return page), and for local testing `http://localhost:3000/auth/callback**`. Add one
     line for every domain the site is served from.

## 4. Give the site the two public values

In Vercel: **Project > Settings > Environment Variables**, for Production (and Preview if you want
it there too):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings > API Keys > publishable key (`sb_publishable_...`; a legacy `anon` key also works) |
| `NEXT_PUBLIC_SITE_URL` | your production address, e.g. `https://www.example.in` |

Then **redeploy**: these values are read at build time.

Never use the `service_role` / secret key in this project. The site talks to the database as the
signed-in person, and row level security does the rest.

## 5. Check it

1. Open the site: the header shows **Sign in**.
2. Sign in with Google, open **Check my loan**, press **Save this plan**.
3. **My plans** lists it. **Update my numbers**, change a figure, **Save today's numbers**: the
   plan shows two updates.
4. **Download my data** returns a JSON file; **Delete my account** removes everything.
5. Send a test enquiry from **For lenders**, then read it in **Table Editor > partner_enquiries**.

## Government schemes

The scheme matcher reads its schemes from the database; no scheme is written in the app's code.
Two migrations set it up, and they run after the accounts migration above:

1. `migrations/20261007000000_government_schemes.sql` creates `government_schemes` (the catalogue,
   readable by everyone, writable by nobody through the API) and `scheme_matches` (a signed-in
   person's match history, visible only to them). A manual check of the row level security is
   written at the bottom of that file for the SQL editor.
2. `migrations/20261007000001_seed_government_schemes.sql` loads the reviewed starting data. It is
   safe to run again: an entry whose scheme and version already exist is skipped.

Run both in the SQL editor in that order, or with `supabase db push`.

**Add or change a scheme.** A published version is never edited: a trigger refuses any change to
its rules, amounts or wording. A change is a new row with the next version number.

1. Open `seed/government_schemes.json` and add an entry with the same `slug` and `version` one
   higher (or a new slug with `version` 1). Read every number and criterion from the official page
   and list the exact pages you read in `sources`.
2. Set `verification_status` to `"verified"` and `last_verified_at` to today only if you read the
   official source and the entry agrees with it. Otherwise use `"unverified"`.
3. Run `npm run seed:schemes`. It validates the file and rewrites the seed migration. Never edit
   that SQL by hand; `npm test` fails if it is out of step with the JSON.
4. Run the new migration. The new version becomes the current one; the old version stays in the
   table for history and stops appearing in matches.

To retire a scheme without a new version, set its `status` to `retired` in the SQL editor
(for example `update public.government_schemes set status = 'retired' where slug = '...'`).

**Re-verify.** Re-read the official pages. If everything still matches, update only the check
date: `update public.government_schemes set last_verified_at = current_date, verification_status =
'verified' where slug = '...' and is_current;`. If anything differs, add a new version as above.
