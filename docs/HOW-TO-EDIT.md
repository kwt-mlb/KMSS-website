# How to edit the KMSS website

**You do not need to know how to code, and you do not need to install anything.**
Everything below is done in a web browser on github.com.

The site is made of two kinds of files:

| | |
|---|---|
| **`data/` folder** | All the words, events and info. **This is what you edit.** |
| everything else | The design and the machinery. Leave it alone unless you know what you're doing. |

When you save a change on github.com, the live site updates itself in about **1 minute**.

---

## The 60-second version

1. Go to <https://github.com/kwt-mlb/KMSS-website>
2. Click the **`data`** folder.
3. Click the file you want to change (see the table below).
4. Click the **pencil ✏️ icon** at the top right.
5. Make your change.
6. Scroll down, click the green **Commit changes** button.
7. Wait 1 minute. Refresh the website. Done.

---

## Which file do I edit?

| I want to… | Edit this file |
|---|---|
| Add / change / remove an event | `data/events.json` |
| Change the society name, tagline, email, Instagram, WhatsApp, Sellfy store, sponsors, the numbers on the homepage | `data/site.json` |
| Update the Melbourne Guide | `data/guide.json` |
| Update the committee list each year | `data/team.json` |
| Add a question to the FAQ | `data/faq.json` |
| Change a button label or menu wording | `data/i18n.json` |
| Change the colours / branding | `assets/css/theme.css` |

---

## Adding an event (the thing you'll do most)

Open `data/events.json`. You'll see blocks that look like this:

```json
{
  "id": "welcome-2026",
  "title": { "en": "Welcome Week BBQ 2026", "ar": "حفل الترحيب" },
  "date": "2026-09-12",
  "start": "12:00",
  "end": "16:00",
  "venue": { "en": "Royal Park, Parkville", "ar": "رويال بارك" },
  "mapUrl": "https://maps.google.com/?q=Royal+Park+Melbourne",
  "category": "social",
  "price": "Free",
  "status": "free",
  "featured": true,
  "ticket": "",
  "image": "",
  "album": "",
  "summary": { "en": "Short one-liner shown on the card.", "ar": "..." },
  "details": { "en": "The longer text shown when someone clicks Details.", "ar": "..." }
}
```

**To add a new event:** copy one whole block from `{` to `}`, paste it directly
after the `"events": [` line, put a comma after the closing `}`, then change the values.

### What each field means

| Field | What to put |
|---|---|
| `id` | A short unique nickname, lowercase, no spaces: `iftar-2027`. Used in the web link. |
| `date` | Always `YYYY-MM-DD`. **This is the only thing that decides whether an event is "upcoming" or "past"** — you never have to move events by hand. |
| `start` / `end` | 24-hour time, `18:30`. Leave `end` as `""` if unknown. |
| `venue` | Where it is. |
| `mapUrl` | Optional Google Maps link — adds an "Open in Maps" link. |
| `category` | One of: `social`, `cultural`, `academic`, `sports`, `trip`, `other`. |
| `price` | Free text: `"$35"`, `"Free"`, `"$20 members / $30 guests"`. |
| `status` | `open` (on sale) · `soldout` · `free` · `invite` (members only). |
| `featured` | `true` puts it in the big wide card at the top. **Use it on one event only.** |
| `ticket` | The Sellfy product link (see below). Leave `""` for free events. |
| `image` | A link to a picture. Leave `""` and the site draws a nice gradient instead. |
| `album` | For past events: the Google Photos / Drive album link. Adds a "See photos" button. |
| `summary` | One or two sentences shown on the card. |
| `details` | Longer text shown in the pop-up. Can be `""`. |

**You never delete past events.** Once the date passes, the event moves itself into
the *Past events* archive, filed under its year. That archive is the point.

### Arabic

Every `{ "en": ..., "ar": ... }` pair is optional on the Arabic side. If you're in a
rush, write English in both, or leave the Arabic as `""` — the site falls back to
English automatically and nothing breaks.

---

## Selling tickets (Sellfy)

The website does not take payments itself — Sellfy does. This is deliberate: no
card details, no refunds logic and no bank account ever touch this site.

1. In Sellfy, create a product for the event (a digital product / ticket).
2. Copy its product URL, e.g. `https://kmss.sellfy.store/p/national-day-2027`
3. Paste it into that event's `"ticket"` field.
4. Set `"status": "open"`.

A **Get tickets →** button appears on the card and in the pop-up. When it sells out,
change `"status"` to `"soldout"` — the button is replaced with a *Sold out* badge.

Your main store link lives in `data/site.json` under `"sellfyStore"`.

---

## Changing the colours

Open `assets/css/theme.css`. The top of that file is a list of colours with a
comment explaining each one:

```css
--brand:  #060f49;   /* KMSS navy: buttons, links, highlights   */
--sand:   #e4e5e5;   /* KMSS off-white: panels and dividers     */
--accent: #c8102e;   /* Small highlights only                   */
```

The first two are taken straight off the logo artwork. If you ever want the site
navy-and-white only, set `--accent` and `--gold` to `#060f49` as well.

Change a hex code, save, done — it updates every page at once. Dark mode has its
own short list further down the same file.

---

## Adding photos

Two options:

- **Easiest:** paste any public image URL into the `"image"` field (an Instagram
  image, a Google Drive direct link, an Imgur link).
- **Tidiest:** upload the file into `assets/img/` on github.com (Add file → Upload
  files), then write `"image": "assets/img/your-photo.jpg"`.

Keep photos under ~500 KB so the site stays fast.

---

## If you break something

**Don't panic — nothing is ever lost.** Every change is saved forever and can be
undone in two clicks.

The most common mistake is a **JSON syntax error**: a missing comma, one comma too
many, or a deleted `"` quote mark. We have a safety net for this: when you save,
GitHub automatically checks your file. If it's broken you'll see a **red ✗** next to
your change and an email telling you which file and what's wrong.

**To undo a change:**
1. Go to the repository → **Commits**.
2. Find your change, click it.
3. Click the **⋯** menu → **Revert**.

**To check a file yourself before saving:** paste it into <https://jsonlint.com>.

### The three rules of JSON

1. Every `"` opens and closes. Text always sits inside quotes.
2. A comma goes **between** items — never before a closing `}` or `]`.
3. If you copy a block, copy it from `{` all the way to its matching `}`.

---

## Where the site lives

- **Live site:** see Settings → Pages in the repository for the address.
- **Source:** <https://github.com/kwt-mlb/KMSS-website>
- **Cost:** $0. GitHub Pages is free for public repositories, forever.
