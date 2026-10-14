# Config Pokedex

An unofficial, phone-first agenda for **Config India 2026, Day 2** (Thu, Oct 15, BIEC Bengaluru).
Browse the day, add sessions to your plan, see what's live, and share your plan on WhatsApp to compare with friends.

Plain HTML, CSS and JavaScript. No framework, no build step, no backend.

Vibecoded by Waqar Khan ([@waqarkh4n](https://x.com/waqarkh4n)).

> **Disclaimer:** Config Pokedex is an unofficial community project. It is not made, endorsed or sponsored by Figma, and has no affiliation with Figma, Inc. or Config. Figma and Config are trademarks of Figma, Inc. Session details and speaker photos come from the public Config agenda and belong to their owners.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Page markup |
| `styles.css` | All styles (light theme) |
| `app.js` | The app: schedule, My plan, speakers, venue, sheets, time scrubber |
| `data.js` | Agenda data (sessions, rooms, speakers) |
| `images/banner.webp` | Art strip in the hero card |
| `favicon.png`, `apple-touch-icon.png` | Tab and home-screen icons, cropped from the art strip |

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

- **Saved plans** live in each visitor's browser (`localStorage`) until the end of Fri, Oct 16. Plans are never sent to a server; shared plans travel inside the link's `#` part.
- **Visitor stats** use [Vercel Web Analytics](https://vercel.com/docs/analytics): anonymous, no cookies. Turn it on in the Vercel dashboard under your project's **Analytics** tab, then redeploy. Unique visitors and page views show up there.
- **Data** comes from the public schedule on config.figma.com as of Oct 14, 2026. Summaries and bios are short paraphrases, and every session links to its official page.
- **Fonts:** Inter, Newsreader (page titles) and DM Mono, all free from Google Fonts under the SIL Open Font License.
- Adding a session here doesn't reserve a seat.
