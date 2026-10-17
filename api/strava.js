// GET /api/strava: run totals and recent runs from Strava's free official API.
// Needs STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN in Vercel (see README).
// Cached at Vercel's CDN for 30 minutes to stay well under Strava's rate limits.
let token = null;

async function accessToken() {
  if (token && Date.now() / 1000 < token.expires_at - 60) return token.access_token;
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  token = await r.json();
  return token.access_token;
}

const api = async (path) => {
  const r = await fetch('https://www.strava.com/api/v3' + path, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
};

const MI = 1609.344;
const totals = (t) => t && { runs: t.count, miles: +(t.distance / MI).toFixed(1), hours: +(t.moving_time / 3600).toFixed(1), elevFt: Math.round(t.elevation_gain * 3.28084) };

export default async function handler(req, res) {
  if (!process.env.STRAVA_REFRESH_TOKEN) {
    return res.status(503).json({ error: 'Strava is not connected yet.' });
  }
  try {
    const athlete = await api('/athlete');
    const [stats, acts] = await Promise.all([api(`/athletes/${athlete.id}/stats`), api('/athlete/activities?per_page=30')]);
    const runs = acts.filter((a) => /Run/.test(a.sport_type || a.type)).slice(0, 6).map((a) => ({
      name: a.name,
      date: a.start_date_local,
      miles: +(a.distance / MI).toFixed(2),
      movingSec: a.moving_time,
      paceSecPerMi: a.distance ? Math.round(a.moving_time / (a.distance / MI)) : null,
      elevFt: Math.round(a.total_elevation_gain * 3.28084),
      url: `https://www.strava.com/activities/${a.id}`,
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=7200');
    return res.status(200).json({
      recent: totals(stats.recent_run_totals),   // last 4 weeks
      ytd: totals(stats.ytd_run_totals),
      all: totals(stats.all_run_totals),
      runs,
    });
  } catch {
    token = null;
    return res.status(502).json({ error: 'Could not reach Strava right now.' });
  }
}
