# vishal-kanala portfolio

Live at **https://vishalkanala.com**. A static site on Vercel, deployed automatically on every push to `main`.

| Page | File |
|---|---|
| Home | `index.html` |
| Beyond code (chess, training, bike, hobbies) | `beyond.html` |
| Scrapbook (places + photos) | `scrapbook.html`, data in `assets/places.js` |
| World globe | `world.html`, same data as the scrapbook |
| Photo album | `photos.html`, data in `assets/photos.js` |
| Private upload page | `admin.html` (not linked, hidden from search engines) |

## Updating training stats (Hevy and Strava)
Open **https://vishalkanala.com/admin.html**, unlock it with your password, and drop in:
- **Hevy:** in the app, Profile › Settings › Export & Import Data › Export Workouts → `workouts.csv`
- **Strava:** on strava.com, Settings › My Account › Download or Delete Your Account › Request Your Archive → the emailed `export_….zip`

The page reads the file in your browser (only `activities.csv` from the Strava zip), shows a preview, and on **Publish**
sends just the summary numbers to `api/publish.js`, which commits `assets/hevy-data.js` or `assets/strava-data.js`.
That commit redeploys the site in about a minute. Stats are computed by `assets/training-stats.js`.

**One-time setup** in Vercel › Settings › Environment Variables (Production), then redeploy:
- `ADMIN_PASSWORD`: a long passphrase you pick
- `GITHUB_TOKEN`: a fine-grained token (github.com › Settings › Developer settings › Fine-grained tokens) with access to
  only `visu2211/personal_website` and **Contents: Read and write**

## PlayStation (live, Video games card)
`api/psn.js` reads your recently played games, online status, and trophy level from PlayStation Network,
cached for 15 minutes. It needs one Vercel environment variable, `PSN_NPSSO` (see below). The token lasts about 2 months;
when the card shows "Offline", get a new one and replace it.
1. PS5 or PlayStation app › Settings › Users and Accounts › Privacy: set **Gaming | Media** visibility to **Anyone**.
2. Sign in at https://www.playstation.com, then open https://ca.account.sony.com/api/v1/ssocookie in the same browser.
3. Copy the 64-character `npsso` value and add it in Vercel as `PSN_NPSSO` (Production), then redeploy.

## Adding photos
- Headshot: `photos/headshot.jpg` (square).
- Album photos: put files in `photos/` and add a line per photo in `assets/photos.js`.
  Photos in the `Eagle Scout` album also appear in the Eagle Scout section on the home page.
- Scrapbook trips: put files in `scrapbook/` and add a place in `assets/places.js` (it shows on the globe too).

Commit and push to publish.
