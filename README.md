# vishal-kanala portfolio

Static site plus one Vercel Function (`api/psn.js`) for PlayStation activity.

| Page | File |
|---|---|
| Home | `index.html` |
| Beyond code (live chess + PS5) | `beyond.html` |
| Scrapbook (places) | `scrapbook.html`, data in `assets/places.js` |
| Photo album | `photos.html`, data in `assets/photos.js` |

## Add photos
- Headshot: save as `photos/headshot.jpg` (square).
- Album photos: put files in `photos/`, then add a line per photo in `assets/photos.js`.
  Photos in the `Eagle Scout` album also appear in the Eagle Scout section on the home page.
- Scrapbook trips: put files in `scrapbook/`, then add a place in `assets/places.js`.

## PlayStation setup (one time)
1. In PlayStation settings, set "Gaming | Media → Games and apps you play" visibility to **Anyone**.
2. Sign in at https://www.playstation.com in your browser.
3. In the same browser, open https://ca.account.sony.com/api/v1/ssocookie and copy the `npsso` value (64 characters).
   Treat it like a password: never commit it or paste it anywhere public.
4. Add it to Vercel:  `npx vercel env add PSN_NPSSO production`  (paste when prompted), then redeploy.
The token lasts about 2 months. When the PS5 card says "Offline", repeat steps 2–4.

## Strava stats (free export, no API subscription)
1. Strava → Settings → My Account → Download or Delete Your Account → **Request Your Archive**. Strava emails a zip.
2. Leave it in Downloads (`export_XXXXXXX.zip`). The daily job below picks it up, or run
   `node scripts/strava-stats.mjs ~/Downloads/export_XXXXXXX.zip` yourself. Only `activities.csv` is read.

## Automatic refresh job
`scripts/install-refresh-job.sh` installs a daily 10:00 job (launchd) that rebuilds the Hevy and Strava stats whenever a
newer export appears in Downloads, then commits and pushes so Vercel redeploys. Every 14 days it shows a Mac notification
reminding you to export from both apps. Log: `data/refresh.log`. Remove with `scripts/install-refresh-job.sh --remove`.

## Hevy stats (free, no Pro)
1. Hevy app → Profile → ⚙︎ Settings → Export & Import Data → Export Workouts.
2. Save the file as `data/hevy-workouts.csv`.
3. Leave `workouts.csv` in Downloads for the daily job, or run `node scripts/hevy-stats.mjs` yourself.

## Deploy
```
npx vercel --prod
```
