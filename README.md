# YPDC_AU_AACK Recruitment — Buyer Handover

This ZIP replaces the earlier static-only version. It includes the complete website, recruitment form, server-side administrator login, and PDF/Excel exports.

## Features
- Dark-green URAAN / YPDC branding and the supplied logo.
- President Muhammad Umar Rashid, Vice President Muhammad Okasha Hassan, and General Secretary Awais Azeem.
- Eight team choices matching the AUCIS structure, adapted for YPDC.
- Three-step application for students from all departments; Member, Deputy and Co-Lead roles.
- Primary and optional second team preference, skills, tools, portfolio, availability and motivation.
- Previous society experience plus: “Have you previously applied to any society outside this university?” A Yes answer requires the society and outcome.
- Additional leadership and disagreement questions for Deputy and Co-Lead applicants.
- Three-second hold on the YPDC_AU_AACK footer text opens password-protected administration.
- Real PDF and XLSX exports containing all application fields.
- “Developed by Tayyab” linking to the supplied LinkedIn profile.

## Deploy using only GitHub and Vercel
No Firebase, Neon, Supabase, Upstash or other backend account is required. Applications are saved in Vercel's own PRIVATE Blob storage. One storage setup inside Vercel is necessary so applications persist across devices and redeploys.

1. Extract the ZIP. Create a new repository in the buyer's GitHub account.
2. Upload everything INSIDE `ypdc-recruitment` to the repository root. `package.json`, `vercel.json`, `api`, `lib` and `public` must be at that root. Include the lockfile. Do not upload the outer folder as an extra nesting level.
3. In the buyer's Vercel account, import that repository. Choose framework preset **Other**, Node **24.x**, install command **npm ci**, no build command, output directory **public**. The included `vercel.json` configures the output and API routing.
4. In Vercel's Storage area, create a **Blob** store with **Private** access and connect it to this project. Vercel adds `BLOB_READ_WRITE_TOKEN` to the selected environments. Use a dedicated store for this society. Do not choose public storage or a marketplace database.
5. In Project Settings > Environment Variables, set:
   - `ADMIN_PASSWORD`: your own unique password, at least 12 characters.
   - `SESSION_SECRET`: a random value of at least 32 characters. Generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `RECRUITMENT_OPEN`: `true` (optional; set `false` to pause applications).
6. Enable these settings for Production, then redeploy. Do not add production storage credentials to untrusted preview branches. Use a separate test store if you want preview deployments to collect test applications.
7. Submit one test application on the live site, sign in through the footer and verify both export buttons. Production storage cannot be tested until the buyer's private store is connected.

No admin password is hardcoded into the ZIP. Keep passwords and tokens in Vercel environment variables, never in public files or GitHub. Existing applications remain in the connected Blob store when you redeploy. Vercel's storage plan and usage limits apply.

Official setup reference: https://vercel.com/docs/vercel-blob/private-storage

## Administrator access
Scroll to the footer and hold **YPDC_AU_AACK** for three seconds using the mouse or a touch screen. Keyboard users can focus it and hold Enter or Space. Releasing early cancels the action. Enter the `ADMIN_PASSWORD` configured in Vercel. Download PDF or Excel, then sign out.

The hidden gesture is only a shortcut: access to the records is enforced by the server. The session uses an HttpOnly one-hour cookie. Changing the administrator password invalidates existing sessions. Duplicate university + registration ID applications are rejected. The default backend includes basic per-instance throttling; use Vercel Firewall rules if you need stricter deployment-wide traffic limits.

## Local preview on another device
Install Node.js 24, open a terminal in this folder, then run:

    npm ci
    npm run dev

Open http://127.0.0.1:5173. When no Blob token is configured, local preview creates an ignored `.data` directory. The generated local admin password is in `.data/local-admin.json`. Local submissions are only for testing and do not appear in production. The `.data` directory is deliberately excluded from this handover.

To test against a private Vercel store locally, copy `.env.example` to `.env`, fill in your own values, and restart. Never commit `.env`.

## Editing
- `public/index.html`: branding, leadership, WhatsApp link and developer credit.
- `public/styles.css` and `public/recruitment.css`: layout and colors.
- `public/recruitment.js`: team descriptions, application fields, steps and admin interface.
- `lib/schema.js`: matching server-side allowed teams, fields and validation. If changing teams or fields, keep this and the frontend aligned.
- `lib/storage.js`: private Vercel Blob storage and local preview storage.
- `lib/exports.js`: PDF and Excel formatting.
- `api/index.js`: submission and administrator API.

The WhatsApp URL appears in HTML and JavaScript; update both if it changes. The supplied URAAN/YPDC logo remains its owner's branding. Google Fonts load online with Arial as the offline fallback.

## Checks performed
Server tests cover validation, conditional fields, consent, duplicate applications, login, protected exports and logout. Run them with `npm test`. These tests use temporary local storage, not the production Blob store.
