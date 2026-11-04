import { getChampionId, type RawSession } from "./cup";
import type { Player } from "./players";
import { normalizeSession } from "./session";

// The old app ("fut-terca/live") kept one night at a time, with numeric ids and no keepers. This
// turns such a night into a session of this app, so a night played there still reaches the stats.

type Raw = Record<string, unknown>;

export type LegacyPlayer = { legacyId: number; id: string; name: string };

export type LegacyKeepers = {
  // Defends the champion's goal in every match the champion plays, so the final's title is theirs.
  champion: string;
  other: string;
};

export type LegacyImport = {
  session: RawSession;
  championId: string;
  players: LegacyPlayer[];
};

function list(value: unknown): Raw[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).filter((item): item is Raw => Boolean(item) && typeof item === "object");
}

export function legacyPlayerId(legacyId: unknown): string {
  return `p${String(legacyId)}`;
}

function legacyTeamId(legacyId: unknown): string {
  return `t${String(legacyId)}`;
}

export function listLegacyPlayers(night: Raw): LegacyPlayer[] {
  return list(night.teams).flatMap((team) =>
    list(team.players).map((player) => ({
      legacyId: Number(player.id),
      id: legacyPlayerId(player.id),
      name: typeof player.name === "string" ? player.name.trim() : "",
    })),
  );
}

export function missingLegacyPlayers(night: Raw, players: Player[]): LegacyPlayer[] {
  const known = new Set(players.map((player) => player.id));
  return listLegacyPlayers(night).filter((player) => !known.has(player.id));
}

export function convertLegacyNight(night: Raw, date: string, keepers: LegacyKeepers): LegacyImport {
  const teams = Object.fromEntries(
    list(night.teams).map((team) => [
      legacyTeamId(team.id),
      {
        name: String(team.name),
        color: String(team.color),
        playerIds: list(team.players).map((player) => legacyPlayerId(player.id)),
      },
    ]),
  );

  const matches: Record<string, Raw> = Object.fromEntries(
    list(night.matches).map((match) => [
      String(match.id),
      {
        number: Number(match.number),
        stage: match.stage,
        ...(typeof match.label === "string" ? { label: match.label } : {}),
        homeId: legacyTeamId(match.homeId),
        awayId: legacyTeamId(match.awayId),
        status: match.status,
        timer: match.timer,
        events: Object.fromEntries(
          list(match.events).map((event) => [
            String(event.id),
            { type: event.type, playerId: legacyPlayerId(event.playerId), teamId: legacyTeamId(event.teamId), at: Number(event.at) },
          ]),
        ),
      },
    ]),
  );

  const draft: RawSession = { date, createdAt: Number(night.createdAt), status: "finished", teams, keeperIds: [keepers.champion, keepers.other], matches };
  const championId = getChampionId(normalizeSession("legacy", draft));
  if (!championId) {
    throw new Error("A noite do app antigo não tem campeão. Só dá para importar uma copa que terminou.");
  }

  // No one counted saves that night, so the keepers only need sides. Outside the champion's matches
  // they swap sides each match.
  let swap = false;
  const ordered = Object.entries(matches).sort(([, a], [, b]) => Number(a.number) - Number(b.number));
  for (const [, match] of ordered) {
    let homeKeeper: string;
    if (match.homeId === championId) {
      homeKeeper = keepers.champion;
    } else if (match.awayId === championId) {
      homeKeeper = keepers.other;
    } else {
      homeKeeper = swap ? keepers.other : keepers.champion;
      swap = !swap;
    }
    match.keepers = { home: homeKeeper, away: homeKeeper === keepers.champion ? keepers.other : keepers.champion };
  }

  return { session: { ...draft, championId }, championId, players: listLegacyPlayers(night) };
}
