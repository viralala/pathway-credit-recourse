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
