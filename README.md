# Moona

> **Developers: start with `HANDOVER.md`**, then `docs/DEVELOPER_NOTES.md`. The design spec is `docs/prototype/moona-prototype.html`.

Guest lists and event invitations for launches, retreats, committee meetings, birthdays and every gathering in between.
Moona is a product of **Sports DNA Ltd**. Live at **moona.ng**.

## What's built (session 1)
- Database design with privacy rules (`supabase/schema.sql`)
- Brand: Sora type, plum / magenta / violet / gold, Day / Night / Auto, the moon-phase logo
- Home with **What's on in Lagos** (public events)
- Event pages at `moona.ng/e/<name>`: poster art with the real moon on the night, public / private, hidden addresses, RSVP (Going / Maybe), ticket choice, plus-ones, questions, parent/guardian consent for children's details, bring list
- Guest passes with QR codes at `moona.ng/p/<private link>`
- WhatsApp sharing: formatted invitation, chat preview, and an automatic poster card for link previews
- Host sign-in with a 6-digit email code
- Demo mode: runs with sample events until Supabase is connected

## Next sessions
- **Moona admin (Sports DNA team):** approve or decline What's On listings, feature events, add events on behalf of partner organisers and hand them over, bulk upload from a spreadsheet
- Create flow (17 occasions, moon date picker, writing help)
- Host dashboard: approvals, door check-in with camera, bring list, certificates, copy guest list
- Monnify paid tickets with split payments
- Legal pages (terms, privacy, refunds) for review

## Setting it up (one time)
1. **Supabase**: create a project (region closest to Lagos, e.g. Europe West). SQL Editor → paste `supabase/schema.sql` → Run.
   Authentication → Email: turn on "Email OTP".
2. **Environment**: copy `.env.example` to `.env.local` and fill in the Supabase URL, anon key and service-role key.
3. **Netlify**: import the GitHub repository, add the same environment variables, deploy.
4. **Domain**: in Netlify, add `moona.ng`, then add the DNS records it shows at your domain registrar.

## Run locally
```
npm install
npm run dev
```
