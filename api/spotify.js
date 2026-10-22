// GET /api/spotify: what I'm playing now, top artists and tracks (last 4 weeks), and recently played.
// Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN in Vercel
// (run `node scripts/connect-spotify.mjs` once to set them). Cached at the CDN for 2 minutes.
let token = null;

async function accessToken() {
  if (token && Date.now() < token.expiresAt) return token.value;
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: process.env.SPOTIFY_REFRESH_TOKEN }),
  });
  if (!r.ok) throw new Error('token ' + r.status);
  const t = await r.json();
  token = { value: t.access_token, expiresAt: Date.now() + (t.expires_in - 60) * 1000 };
  return token.value;
}

async function api(path) {
  const r = await fetch('https://api.spotify.com/v1' + path, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (r.status === 204) return null;                 // nothing playing
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}

const img = (images = []) => (images.find((i) => i.width && i.width <= 320) || images.at(-1) || images[0] || {}).url || null;
const track = (t) => t && {
  name: t.name,
  artists: t.artists.map((a) => a.name).join(', '),
  image: img(t.album?.images),
  url: t.external_urls?.spotify,
};

export default async function handler(req, res) {
  if (!process.env.SPOTIFY_REFRESH_TOKEN) return res.status(503).json({ error: 'Spotify is not connected yet.' });
  try {
    const [now, artists, tracks, recent] = await Promise.allSettled([
      api('/me/player/currently-playing'),
      api('/me/top/artists?time_range=short_term&limit=8'),
      api('/me/top/tracks?time_range=short_term&limit=5'),
      api('/me/player/recently-played?limit=8'),
    ]);
    const val = (r) => (r.status === 'fulfilled' ? r.value : null);
    const n = val(now);
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    return res.status(200).json({
      nowPlaying: n && n.is_playing && n.item ? track(n.item) : null,
      topArtists: (val(artists)?.items || []).map((a) => ({ name: a.name, image: img(a.images), url: a.external_urls?.spotify })),
      topTracks: (val(tracks)?.items || []).map(track),
      recent: (val(recent)?.items || []).map((i) => ({ ...track(i.track), playedAt: i.played_at })),
    });
  } catch {
    token = null;
    return res.status(502).json({ error: 'Could not reach Spotify right now.' });
  }
}
