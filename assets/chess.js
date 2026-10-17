// Live chess.com data for visu22. chess.com's public API allows cross-origin reads,
// so this runs entirely in the browser. If the API is unreachable, a snapshot is used.
window.ChessLive = (() => {
  const USER = 'visu22';
  const API = `https://api.chess.com/pub/player/${USER}`;

  // Snapshot taken Oct 6, 2026, shown only if the live request fails.
  const SNAPSHOT = {
    live: false,
    rapid: 983, blitz: 713, bullet: 683, tactics: 1652, puzzleRush: 19,
    modes: {
      rapid: { now: 983, best: 1200, w: 507, l: 403, d: 28 },
      blitz: { now: 713, best: 1346, w: 1445, l: 1414, d: 95 },
      bullet: { now: 683, best: 847, w: 246, l: 229, d: 12 },
    },
  };

  const get = (url) => fetch(url, { headers: { Accept: 'application/json' } }).then((r) => {
    if (!r.ok) throw new Error(r.status); return r.json();
  });

  let statsP;
  function stats() {
    return statsP ||= get(`${API}/stats`).then((s) => {
      const mode = (k) => s[`chess_${k}`] && {
        now: s[`chess_${k}`].last?.rating, best: s[`chess_${k}`].best?.rating ?? s[`chess_${k}`].last?.rating,
        w: s[`chess_${k}`].record?.win ?? 0, l: s[`chess_${k}`].record?.loss ?? 0, d: s[`chess_${k}`].record?.draw ?? 0,
      };
      const modes = { rapid: mode('rapid'), blitz: mode('blitz'), bullet: mode('bullet') };
      return {
        live: true,
        rapid: modes.rapid?.now, blitz: modes.blitz?.now, bullet: modes.bullet?.now,
        tactics: s.tactics?.highest?.rating, puzzleRush: s.puzzle_rush?.best?.score, modes,
      };
    }).catch(() => SNAPSHOT);
  }

  // Recent games, newest first, from the last two monthly archives.
  function games(limit = 60) {
    return get(`${API}/games/archives`).then(async ({ archives }) => {
      const months = archives.slice(-2).reverse();
      const out = [];
      for (const m of months) {
        const { games } = await get(m);
        out.push(...games.reverse());
        if (out.length >= limit) break;
      }
      return out.slice(0, limit).map((g) => {
        const meWhite = g.white.username.toLowerCase() === USER;
        const me = meWhite ? g.white : g.black, opp = meWhite ? g.black : g.white;
        const drawn = ['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'];
        const result = me.result === 'win' ? 'W' : drawn.includes(me.result) ? 'D' : 'L';
        return { url: g.url, timeClass: g.time_class, end: g.end_time * 1000, color: meWhite ? 'white' : 'black',
          rating: me.rating, opp: opp.username, oppRating: opp.rating, result, how: result === 'W' ? opp.result : me.result };
      });
    }).catch(() => []);
  }

  const ago = (t) => {
    const s = (Date.now() - t) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + 'm ago';
    if (s < 86400) return Math.round(s / 3600) + 'h ago';
    return Math.round(s / 86400) + 'd ago';
  };

  return { USER, stats, games, ago, profile: `https://www.chess.com/member/${USER}` };
})();
