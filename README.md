# Config India Pocket Agenda

An unofficial, phone-first agenda for **Config India 2026, Day 2** (Thu, Oct 15, BIEC Bengaluru).
Browse the day, add sessions to your plan, see what's live, and compare plans with friends using a short plan code.

Plain HTML, CSS and JavaScript. No framework, no build step, no backend.

Vibecoded by Waqar Khan ([@waqarkh4n](https://x.com/waqarkh4n)).

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | All styles (light theme) |
| `app.js` | The app: schedule, My plan, speakers, venue, sheets, time scrubber |
| `data.js` | Agenda data (sessions, rooms, speakers) |
| `images/banner.webp` | Art strip in the hero card |
| `fonts/` | Timeless Serif for the page titles, with its license |
| `favicon.svg` | Tab icon |

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

Preview any moment of the day by adding `#tHHMM` to the URL, for example `#t1140` for 11:40 AM IST,
or drag the time scrubber at the bottom.

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, choose **Add New → Project** and import the repo.
3. Set **Framework Preset** to **Other**, leave the build command empty and the output directory as the root.
4. Deploy.

## Notes

- **Saved plans** live in each visitor's browser (`localStorage`) until the end of Fri, Oct 16. Nothing is sent to a server.
- **Data** comes from the public schedule on config.figma.com as of Oct 14, 2026. Summaries and bios are short paraphrases, and every session links to its official page.
- **Fonts:** Inter and DM Mono load from Google Fonts. Timeless Serif is by [Timeless](https://timeless.co) under the Timeless Free Font License 1.2 (`fonts/LICENSE.pdf`). It may be embedded in websites but not put in a public repository, so `fonts/` is in `.gitignore` by default. See the comment there.
- Not affiliated with Figma. Adding a session here doesn't reserve a seat.
