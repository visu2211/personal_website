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
1. Go to https://www.strava.com/settings/api and create an app. Any name works; set "Authorization Callback Domain" to `localhost`.
2. Note the **Client ID** and **Client Secret**.
3. Open this URL (put in your Client ID), click Authorize, and copy the `code=` value from the address bar it sends you to:
   `https://www.strava.com/oauth/authorize?client_id=YOUR_ID&response_type=code&redirect_uri=http://localhost&scope=read,activity:read&approval_prompt=force`
4. Trade the code for a refresh token in your terminal:
   `curl -X POST https://www.strava.com/oauth/token -d client_id=YOUR_ID -d client_secret=YOUR_SECRET -d code=THE_CODE -d grant_type=authorization_code`
   Copy `refresh_token` from the response.
5. Add all three to Vercel, then redeploy:
   `npx vercel env add STRAVA_CLIENT_ID production` (and the same for `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`).
Keep the secret and tokens private: never commit them or paste them anywhere public.

## Hevy stats (free, no Pro)
1. Hevy app → Profile → ⚙︎ Settings → Export & Import Data → Export Workouts.
2. Save the file as `data/hevy-workouts.csv`.
3. Run `node scripts/hevy-stats.mjs`. It writes `assets/hevy-data.js`.
4. Redeploy. Repeat whenever you want fresh numbers.

## Deploy
```
npx vercel --prod
```
