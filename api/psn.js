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

// One entry per game even when it was played on both PS4 and PS5: hours add up, newest play date wins.
function mergeGames(titles) {
  const byName = new Map();
  for (const g of titles) {
    const name = (g.localizedName || g.name || '').trim();
    const platform = g.category === 'ps5_native_game' ? 'PS5' : 'PS4';
    const cur = byName.get(name);
    if (!cur) {
      byName.set(name, { name, image: g.localizedImageUrl || g.imageUrl, platforms: new Set([platform]), hours: hours(g.playDuration), lastPlayed: g.lastPlayedDateTime });
    } else {
      cur.platforms.add(platform); cur.hours += hours(g.playDuration);
      if (g.lastPlayedDateTime > cur.lastPlayed) { cur.lastPlayed = g.lastPlayedDateTime; if (platform === 'PS5') cur.image = g.localizedImageUrl || g.imageUrl || cur.image; }
    }
  }
  return [...byName.values()]
    .sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''))
    .map((g) => ({ name: g.name, image: g.image, platform: [...g.platforms].sort().reverse().join(' · '), hours: Math.round(g.hours), lastPlayed: g.lastPlayed }));
}

export default async function handler(req, res) {
  if (!process.env.PSN_NPSSO) {
    return res.status(503).json({ error: 'PlayStation is not connected yet. Add PSN_NPSSO in Vercel.' });
  }
  try {
    const a = await authorize();
    const [played, presence, trophies] = await Promise.allSettled([
      getUserPlayedGames(a, 'me', { limit: 20, categories: 'ps4_game,ps5_native_game' }),
      getBasicPresence(a, 'me'),
      getUserTrophyProfileSummary(a, 'me'),
    ]);
    // the profile endpoint needs the real account id, not "me"; the trophy summary includes it
    const accountId = trophies.status === 'fulfilled' ? trophies.value.accountId : null;
    const [profile] = await Promise.allSettled([accountId ? getProfileFromAccountId(a, accountId) : Promise.reject(new Error('no account id'))]);
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
      games: mergeGames(val(played)?.titles ?? []),
    });
  } catch (err) {
    auth = null;
    return res.status(502).json({ error: 'Could not reach PlayStation Network. The PSN_NPSSO token may have expired.' });
  }
}
