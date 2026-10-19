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

## Strava setup (one time, free)
1. Create an app at https://www.strava.com/settings/api. Any name and category; set **Authorization Callback Domain** to `localhost`.
2. In this folder, run `node scripts/connect-strava.mjs` and follow the prompts. It links the folder to Vercel if needed,
   opens Strava's Authorize page, and saves `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REFRESH_TOKEN` to Vercel
   without printing or storing them. Then it offers to redeploy.

## Hevy stats (free, no Pro)
1. Hevy app → Profile → ⚙︎ Settings → Export & Import Data → Export Workouts.
2. Save the file as `data/hevy-workouts.csv`.
3. Run `node scripts/hevy-stats.mjs`. It writes `assets/hevy-data.js`.
4. Redeploy. Repeat whenever you want fresh numbers.

## Deploy
```
npx vercel --prod
```
