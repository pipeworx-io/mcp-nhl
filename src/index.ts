interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * NHL MCP — live NHL data via the official NHL API
 *
 * Tools:
 * - get_standings: Get current NHL standings
 * - get_scores: Get today's NHL scores
 * - get_schedule: Get the current schedule
 * - get_player: Get detailed player profile by player ID
 */


const BASE_URL = 'https://api-web.nhle.com/v1';

// --- Raw API types ---

type RawTeamRecord = {
  teamName?: { default?: string } | null;
  teamAbbrev?: { default?: string } | null;
  teamLogo?: string | null;
  divisionName?: string | null;
  conferenceName?: string | null;
  wins?: number | null;
  losses?: number | null;
  otLosses?: number | null;
  points?: number | null;
  gamesPlayed?: number | null;
  goalFor?: number | null;
  goalAgainst?: number | null;
  streakCode?: string | null;
  streakCount?: number | null;
};

type RawStandingsResponse = {
  standings: RawTeamRecord[];
};

type RawGoal = {
  playerId?: number | null;
  name?: { default?: string } | null;
  teamAbbrev?: string | null;
  period?: number | null;
  timeInPeriod?: string | null;
  goalsToDate?: number | null;
};

type RawGame = {
  id?: number | null;
  gameState?: string | null;
  awayTeam?: {
    abbrev?: string | null;
    name?: { default?: string } | null;
    score?: number | null;
    sog?: number | null;
  } | null;
  homeTeam?: {
    abbrev?: string | null;
    name?: { default?: string } | null;
    score?: number | null;
    sog?: number | null;
  } | null;
  startTimeUTC?: string | null;
  period?: number | null;
  periodDescriptor?: { number?: number; periodType?: string } | null;
  goals?: RawGoal[] | null;
};

type RawScoreResponse = {
  currentDate?: string | null;
  games: RawGame[];
};

type RawScheduleGame = {
  id?: number | null;
  gameDate?: string | null;
  startTimeUTC?: string | null;
  gameState?: string | null;
  awayTeam?: { abbrev?: string | null; name?: { default?: string } | null } | null;
  homeTeam?: { abbrev?: string | null; name?: { default?: string } | null } | null;
  venue?: { default?: string } | null;
};

type RawScheduleResponse = {
  currentDate?: string | null;
  gameWeek?: Array<{
    date?: string;
    games?: RawScheduleGame[];
  }> | null;
};

type RawPlayerLanding = {
  playerId?: number | null;
  firstName?: { default?: string } | null;
  lastName?: { default?: string } | null;
  sweaterNumber?: number | null;
  position?: string | null;
  headshot?: string | null;
  birthDate?: string | null;
  birthCity?: { default?: string } | null;
  birthCountry?: string | null;
  heightInInches?: number | null;
  weightInPounds?: number | null;
  currentTeamAbbrev?: string | null;
  currentTeamName?: { default?: string } | null;
  featuredStats?: {
    season?: number | null;
    regularSeason?: {
      subSeason?: {
        gamesPlayed?: number | null;
        goals?: number | null;
        assists?: number | null;
        points?: number | null;
        plusMinus?: number | null;
        pim?: number | null;
      };
    } | null;
  } | null;
};

// --- Formatters ---

function formatTeamRecord(team: RawTeamRecord) {
  return {
    name: team.teamName?.default ?? null,
    abbrev: team.teamAbbrev?.default ?? null,
    division: team.divisionName ?? null,
    conference: team.conferenceName ?? null,
    games_played: team.gamesPlayed ?? null,
    wins: team.wins ?? null,
    losses: team.losses ?? null,
    ot_losses: team.otLosses ?? null,
    points: team.points ?? null,
    goals_for: team.goalFor ?? null,
    goals_against: team.goalAgainst ?? null,
    streak: team.streakCode && team.streakCount != null ? `${team.streakCode}${team.streakCount}` : null,
  };
}

function formatGame(game: RawGame) {
  return {
    id: game.id ?? null,
    state: game.gameState ?? null,
    start_time_utc: game.startTimeUTC ?? null,
    period: game.period ?? null,
    away_team: game.awayTeam?.name?.default ?? game.awayTeam?.abbrev ?? null,
    away_score: game.awayTeam?.score ?? null,
    away_sog: game.awayTeam?.sog ?? null,
    home_team: game.homeTeam?.name?.default ?? game.homeTeam?.abbrev ?? null,
    home_score: game.homeTeam?.score ?? null,
    home_sog: game.homeTeam?.sog ?? null,
  };
}

function formatScheduleGame(game: RawScheduleGame) {
  return {
    id: game.id ?? null,
    date: game.gameDate ?? null,
    start_time_utc: game.startTimeUTC ?? null,
    state: game.gameState ?? null,
    away_team: game.awayTeam?.name?.default ?? game.awayTeam?.abbrev ?? null,
    home_team: game.homeTeam?.name?.default ?? game.homeTeam?.abbrev ?? null,
    venue: game.venue?.default ?? null,
  };
}

function formatPlayer(p: RawPlayerLanding) {
  const stats = p.featuredStats?.regularSeason?.subSeason;
  return {
    player_id: p.playerId ?? null,
    name: [p.firstName?.default, p.lastName?.default].filter(Boolean).join(' ') || null,
    number: p.sweaterNumber ?? null,
    position: p.position ?? null,
    team: p.currentTeamName?.default ?? null,
    team_abbrev: p.currentTeamAbbrev ?? null,
    birth_date: p.birthDate ?? null,
    birth_city: p.birthCity?.default ?? null,
    birth_country: p.birthCountry ?? null,
    height_in: p.heightInInches ?? null,
    weight_lbs: p.weightInPounds ?? null,
    headshot: p.headshot ?? null,
    current_season_stats: stats
      ? {
          season: p.featuredStats?.season ?? null,
          games_played: stats.gamesPlayed ?? null,
          goals: stats.goals ?? null,
          assists: stats.assists ?? null,
          points: stats.points ?? null,
          plus_minus: stats.plusMinus ?? null,
          pim: stats.pim ?? null,
        }
      : null,
  };
}

// --- Tool definitions ---

const tools: McpToolExport['tools'] = [
  {
    name: 'get_standings',
    description:
      'Get current NHL standings for all teams. Returns wins, losses, OT losses, points, goals for/against, and streak.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_scores',
    description:
      "Get today's NHL game scores and states (live, final, scheduled). Returns teams, scores, shots on goal, and period.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_schedule',
    description:
      'Get the current NHL weekly schedule. Returns upcoming and recent games with teams, dates, and venues.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_player',
    description:
      'Get detailed profile and current season stats for an NHL player by their numeric player ID.',
    inputSchema: {
      type: 'object',
      properties: {
        playerId: {
          type: 'number',
          description: 'NHL player ID (e.g., 8478402 for Connor McDavid)',
        },
      },
      required: ['playerId'],
    },
  },
];

// --- callTool dispatcher ---

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_standings':
      return getStandings();
    case 'get_scores':
      return getScores();
    case 'get_schedule':
      return getSchedule();
    case 'get_player':
      return getPlayer(args.playerId as number);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Tool implementations ---

async function getStandings() {
  const res = await fetch(`${BASE_URL}/standings/now`);
  if (!res.ok) throw new Error(`NHL API error: ${res.status}`);

  const data = (await res.json()) as RawStandingsResponse;

  return {
    total: data.standings.length,
    standings: data.standings.map(formatTeamRecord),
  };
}

async function getScores() {
  const res = await fetch(`${BASE_URL}/score/now`);
  if (!res.ok) throw new Error(`NHL API error: ${res.status}`);

  const data = (await res.json()) as RawScoreResponse;

  return {
    date: data.currentDate ?? null,
    total_games: data.games.length,
    games: data.games.map(formatGame),
  };
}

async function getSchedule() {
  const res = await fetch(`${BASE_URL}/schedule/now`);
  if (!res.ok) throw new Error(`NHL API error: ${res.status}`);

  const data = (await res.json()) as RawScheduleResponse;

  const allGames: ReturnType<typeof formatScheduleGame>[] = [];
  for (const week of data.gameWeek ?? []) {
    for (const game of week.games ?? []) {
      allGames.push(formatScheduleGame(game));
    }
  }

  return {
    current_date: data.currentDate ?? null,
    total_games: allGames.length,
    games: allGames,
  };
}

async function getPlayer(playerId: number) {
  const res = await fetch(`${BASE_URL}/player/${playerId}/landing`);
  if (!res.ok) throw new Error(`NHL API error: ${res.status}`);

  const data = (await res.json()) as RawPlayerLanding;
  return formatPlayer(data);
}

export default { tools, callTool } satisfies McpToolExport;
