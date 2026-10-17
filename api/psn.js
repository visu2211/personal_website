// GET /api/psn: recently played PS5/PS4 games, online status, and trophy level.
// Needs one environment variable in Vercel: PSN_NPSSO (see README "PlayStation setup").
// Results are cached at Vercel's CDN for 15 minutes so Sony's API isn't hit on every visit.
import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserPlayedGames,
  getBasicPresence,
  getUserTrophyProfileSummary,
  getProfileFromAccountId,
} from 'psn-api';

let auth = null; // reused across requests on a warm instance

async function authorize() {
  if (auth && Date.now() < auth.expiresAt) return auth;
  if (auth?.refreshToken && Date.now() < auth.refreshExpiresAt) {
    const t = await exchangeRefreshTokenForAuthTokens(auth.refreshToken);
    return (auth = withExpiry(t));
  }
  const code = await exchangeNpssoForAccessCode(process.env.PSN_NPSSO);
  return (auth = withExpiry(await exchangeAccessCodeForAuthTokens(code)));
}
const withExpiry = (t) => ({
  ...t,
  expiresAt: Date.now() + (t.expiresIn - 60) * 1000,
  refreshExpiresAt: Date.now() + (t.refreshTokenExpiresIn - 60) * 1000,
});

// "PT12H34M5S" -> hours as a number
const hours = (iso = '') => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return m ? (+(m[1] || 0) + +(m[2] || 0) / 60) : 0;
};

export default async function handler(req, res) {
  if (!process.env.PSN_NPSSO) {
    return res.status(503).json({ error: 'PlayStation is not connected yet. Add PSN_NPSSO in Vercel.' });
  }
  try {
    const a = await authorize();
    const [played, presence, trophies, profile] = await Promise.allSettled([
      getUserPlayedGames(a, 'me', { limit: 12, categories: 'ps4_game,ps5_native_game' }),
      getBasicPresence(a, 'me'),
      getUserTrophyProfileSummary(a, 'me'),
      getProfileFromAccountId(a, 'me'),
    ]);
    const val = (r) => (r.status === 'fulfilled' ? r.value : null);
    const bp = val(presence)?.basicPresence;

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json({
      onlineId: val(profile)?.onlineId ?? null,
      avatar: val(profile)?.avatars?.at(-1)?.url ?? null,
      online: (bp?.primaryPlatformInfo?.onlineStatus ?? bp?.onlineStatus) === 'online',
      lastOnline: bp?.primaryPlatformInfo?.lastOnlineDate ?? bp?.lastOnlineDate ?? null,
      nowPlaying: bp?.gameTitleInfoList?.[0]?.titleName ?? null,
      trophyLevel: val(trophies)?.trophyLevel ?? null,
      trophies: val(trophies)?.earnedTrophies ?? null,
      games: (val(played)?.titles ?? []).map((g) => ({
        name: g.localizedName || g.name,
        image: g.localizedImageUrl || g.imageUrl,
        platform: g.category === 'ps5_native_game' ? 'PS5' : 'PS4',
        hours: Math.round(hours(g.playDuration)),
        lastPlayed: g.lastPlayedDateTime,
      })),
    });
  } catch (err) {
    auth = null;
    return res.status(502).json({ error: 'Could not reach PlayStation Network. The PSN_NPSSO token may have expired.' });
  }
}
