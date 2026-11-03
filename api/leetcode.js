// GET /api/leetcode: solved counts, badges and the past year's submission calendar for leetcode.com/u/visu22.
// LeetCode's GraphQL endpoint is public but blocks browser (CORS) requests, so this function relays it.
// Cached at the CDN for an hour.
const USER = 'visu22';
const QUERY = `query ($u: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $u) {
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    badges { displayName icon creationDate }
    userCalendar { streak totalActiveDays submissionCalendar }
  }
  userProfileUserQuestionProgressV2(userSlug: $u) { numFailedQuestions { count } }
}`;

const byDifficulty = (list = []) =>
  Object.fromEntries(list.map((x) => [x.difficulty.toLowerCase(), x.count]));

export default async function handler(req, res) {
  try {
    const r = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query: QUERY, variables: { u: USER } }),
    });
    if (!r.ok) throw new Error('leetcode ' + r.status);
    const { data } = await r.json();
    const u = data?.matchedUser;
    if (!u) throw new Error('no user');

    // calendar keys are UTC-midnight unix seconds; send plain YYYY-MM-DD dates
    const cal = JSON.parse(u.userCalendar?.submissionCalendar || '{}');
    const days = {};
    for (const [ts, n] of Object.entries(cal)) days[new Date(ts * 1000).toISOString().slice(0, 10)] = n;

    const badges = (u.badges || [])
      .map((b) => ({ name: b.displayName, icon: b.icon.startsWith('http') ? b.icon : 'https://leetcode.com' + b.icon, date: b.creationDate }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      username: USER,
      solved: byDifficulty(u.submitStatsGlobal?.acSubmissionNum),
      total: byDifficulty(data.allQuestionsCount),
      attempting: (data.userProfileUserQuestionProgressV2?.numFailedQuestions || []).reduce((s, x) => s + x.count, 0),
      ranking: u.profile?.ranking ?? null,
      badges,
      calendar: { days, activeDays: u.userCalendar?.totalActiveDays ?? 0, maxStreak: u.userCalendar?.streak ?? 0 },
    });
  } catch {
    return res.status(502).json({ error: 'Could not reach LeetCode right now.' });
  }
}
