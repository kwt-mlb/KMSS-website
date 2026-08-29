# KMSS Website

The website of the **Kuwait Melbourne Student Society** — events, ticketing,
a bilingual Melbourne guide for new students, and the archive of everything we've run.

**Editing the site?** → **[docs/HOW-TO-EDIT.md](docs/HOW-TO-EDIT.md)** (no coding required)
**Taking over from last year's committee?** → [docs/HANDOVER.md](docs/HANDOVER.md)

---

## What's on it

- **Landing page** — hero with a live countdown to the next event, what we do, this
  semester's events, a new-student callout and sponsors.
- **Events** — Upcoming / month Calendar / Past archive grouped by year, with search
  and category filters. Each event has a details pop-up, *Add to Google Calendar*, an
  `.ics` download and a share button.
- **Tickets** — every paid event links straight to its Sellfy product page. No payment
  handling, card data or bank details ever touch this site.
- **The Melbourne Guide** — a first-7-days checklist plus housing, transport, halal
  food, mosques, health and emergencies, money and admin, and things to do. Searchable.
- **About** — committee, FAQ, contact, join.
- **English + Arabic** with full right-to-left layout, one click to switch.
- **Dark mode**, following the visitor's device and toggleable.

## Design decisions (why it's built this way)

The brief was *professional, but no headache to run*. So:

- **No build step, no framework, no dependencies.** Plain HTML, CSS and JavaScript.
  Nothing to install, nothing to update, nothing that stops working in three years
  because a package went stale.
- **Content lives in `data/*.json`,** edited on github.com by anyone on the committee
  with no local setup. The design is completely separate from the words.
- **Events file themselves.** An event's `date` decides whether it shows as upcoming
  or moves into the past-events archive. Nobody has to remember to move anything.
  An event with no date is a draft and stays off the site until someone fills it in.
- **All branding is in one file** (`assets/css/theme.css`) so a re-brand is a
  five-minute job, not a rewrite. The palette is taken from the logo artwork:
  navy `#060f49` and off-white `#e4e5e5`, with a red and a gold used sparingly
  for small highlights.
- **The logo is a single SVG** (`assets/img/logo-mark.svg`) rendered as a CSS mask,
  so one file serves navy-on-white, off-white-on-navy and dark mode.
- **A safety net on every save** — a GitHub Action checks the content files are valid
  before a typo can blank out a section of the live site.
- **Hosted free on GitHub Pages,** forever, with no server and no bill to hand over.

## Layout

```
index.html          Landing page
events.html         Upcoming, calendar, past archive
guide.html          The Melbourne Guide
about.html          About, committee, FAQ, contact, join
404.html

data/               ← everything the committee edits
  site.json           name, contacts, socials, Sellfy store, stats, sponsors, pillars
  events.json         every event, past and future
  guide.json          the Melbourne Guide
  team.json           the committee
  faq.json            frequently asked questions
  i18n.json           UI wording, English + Arabic

assets/
  css/theme.css     ← ALL colours, fonts and spacing (the one file to re-brand)
  css/main.css        layout and components
  js/app.js           data loading, language switching, dark mode, nav + footer
  js/events.js        event cards, calendar, ticket buttons, .ics export
  js/guide.js         the Melbourne Guide
  js/pages.js         homepage blocks, committee, FAQ, join form
  img/

docs/               How to edit · yearly handover
```

## Going live (one-time setup, ~2 minutes)

1. Merge this branch into `main`.
2. Repository → **Settings** → **Pages**.
3. **Source:** *Deploy from a branch* → **Branch:** `main` → **Folder:** `/ (root)` → **Save**.
4. Wait a minute. The site is live at `https://kwt-mlb.github.io/KMSS-website/`.

### Custom domain: kmss.online

This site uses `kmss.online` (bought on Namecheap) instead of the default
`github.io` address. The `CNAME` file in the repo root already points to it —
if you ever need to redo this from scratch:

1. Repository → Settings → Pages → **Custom domain** → enter `kmss.online` → Save
   (this recreates the `CNAME` file).
2. At Namecheap → Domain List → `kmss.online` → **Manage** → **Advanced DNS**,
   add:
   - Four **A records** (host `@`) pointing to `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One **CNAME record** (host `www`) pointing to `kwt-mlb.github.io`
3. Back in Settings → Pages, tick **Enforce HTTPS** once GitHub finishes
   verifying the domain (can take up to 24 hours after DNS propagates).

## Working on it locally

The pages load their content with `fetch`, so opening the `.html` files directly
from your file manager won't work. Serve the folder instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

No npm, no build, no dependencies.

## Before each release

- Check both languages (the العربية button in the navbar).
- Check dark mode.
- Check it on a phone.
- Click every ticket link.
