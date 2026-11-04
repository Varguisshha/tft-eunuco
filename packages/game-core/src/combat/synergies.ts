import { CARRASCO_POLICY, HORTALEZA_CONTRIBUTIONS, SHISHEROS_POLICY } from '@tft/game-data';
import {
  SYNERGY_RULES,
  type CombatInput,
  type CombatState,
  type CombatUnit,
  type CombatStatus,
} from '@tft/shared';
import { effectiveStat, isAlive } from './math';
/** P13S only. Team membership and contribution stars are frozen from the original input. */
export function carrascoScaling(starSum: number, count: number) {
  if (!Number.isInteger(count) || count < 1 || starSum < count || starSum > count * 3)
    throw Error('Invalid UPM stars');
  const bonus = (n: number) => 1000 + Math.floor((n * (starSum - count)) / count);
  return {
    maxHp: bonus(CARRASCO_POLICY.scaling.maxHp),
    attack: bonus(CARRASCO_POLICY.scaling.attack),
    armor: bonus(CARRASCO_POLICY.scaling.armor),
    magicResist: bonus(CARRASCO_POLICY.scaling.magicResist),
  };
}
export function neighborhoodModifiers(input: CombatInput, units: CombatInput['units']) {
  const modifiers: { unitId: string; status: CombatStatus }[] = [];
  if (![SYNERGY_RULES, 'f0p13-1'].includes(input.rulesVersion)) return modifiers;
  for (const side of ['south', 'north'] as const) {
    const team = units.filter((u) => u.owner === side);
    const members = [
      ...new Set(
        team.filter((u) => u.profile.traits?.includes('hortaleza')).map((u) => u.definitionId),
      ),
    ].sort();
    if (members.length < 2) continue;
    const multiplier = 1000 + 200 * (Math.min(6, members.length) - 2);
    for (const member of members) {
      const c = HORTALEZA_CONTRIBUTIONS[member];
      if (!c) throw Error(`Unassigned Hortaleza member: ${member}`);
      for (const u of team)
        modifiers.push({
          unitId: u.id,
          status: {
            id: `p13s-h-${modifiers.length}`,
            sourceId: 'hortaleza',
            key: c.stat === 'supportPowerMilli' ? 'p13s-support' : `p13s-${member}`,
            kind: 'modifier',
            stat: c.stat === 'supportPowerMilli' ? null : c.stat,
            amount: Math.floor((c.amount * multiplier) / 1000),
            mode: c.mode,
            origin: 'trait',
            expiresTick: null,
          },
        });
    }
  }
  return modifiers;
}
export class SynergyCombat {
  readonly channels = new Map<
    string,
    { end: number; power: number; speed: number; completed: boolean }
  >();
  constructor(
    readonly input: CombatInput,
    readonly state: CombatState,
    readonly status: (u: CombatUnit, s: CombatStatus) => void,
  ) {
    if (![SYNERGY_RULES, 'f0p13-1'].includes(input.rulesVersion)) return;
    state.synergies = { version: SYNERGY_RULES, teams: [] };
    for (const side of ['south', 'north'] as const) {
      const team = state.units.filter((u) => u.owner === side),
        upm = team.filter((u) => u.profile.traits?.includes('upm'));
      const count = new Set(upm.map((u) => u.definitionId)).size,
        level = CARRASCO_POLICY.counts.filter((n) => n <= count).length;
      if (level)
        state.synergies.teams.push({
          side,
          memberIds: upm.map((u) => u.id),
          scaling: carrascoScaling(
            upm.reduce((n, u) => n + (u.profile.starLevel ?? 1), 0),
            upm.length,
          ),
          activationTick: null,
          starSum: upm.reduce((n, u) => n + (u.profile.starLevel ?? 1), 0),
          count: upm.length,
          baseHp: upm.reduce((n, u) => n + effectiveStat(u, 'maxHp'), 0),
          lostHp: 0,
          thresholdMilli: CARRASCO_POLICY.lostHpMilli[level - 1]!,
          level: level as 1 | 2 | 3 | 4,
          triggered: false,
          blocked: 'missing-carrasco-base-profile',
        });
      const shisha = team.filter((u) => u.profile.traits?.includes('shisheros'));
      const tier =
        SHISHEROS_POLICY.counts.filter((n) => n <= new Set(shisha.map((u) => u.definitionId)).size)
          .length - 1;
      if (tier >= 0)
        for (const u of shisha) {
          const end = SHISHEROS_POLICY.channelTicks[tier]!;
          this.channels.set(u.id, {
            end,
            power: SHISHEROS_POLICY.powerMilli[tier]!,
            speed: SHISHEROS_POLICY.speedMilli[tier]!,
            completed: false,
          });
          status(u, {
            id: `p13s-channel-${state.units.indexOf(u)}`,
            sourceId: 'shisheros',
            key: 'p13s-channel',
            kind: 'modifier',
            stat: null,
            amount: 300,
            origin: 'trait',
            mode: 'flat',
            expiresTick: end,
          });
        }
    }
  }
  channeling(u: CombatUnit) {
    const c = this.channels.get(u.id);
    return !!c && !c.completed && this.state.tick < c.end;
  }
  damageMilli(u: CombatUnit) {
    return this.channeling(u) ? 700 : 1000;
  }
  supportMilli(u: CombatUnit) {
    return (
      1000 + u.statuses.filter((s) => s.key === 'p13s-support').reduce((n, s) => n + s.amount, 0)
    );
  }
  lost(u: CombatUnit, amount: number) {
    const team = this.state.synergies?.teams.find(
      (t) => t.side === u.owner && t.memberIds.includes(u.id),
    );
    if (team) {
      team.lostHp += amount;
      if (!team.triggered && team.lostHp * 1000 >= team.baseHp * team.thresholdMilli) {
        team.triggered = true;
        team.activationTick = this.state.tick;
      }
    }
  }
  tick() {
    for (const [id, c] of this.channels) {
      if (c.completed || this.state.tick < c.end) continue;
      c.completed = true;
      const u = this.state.units.find((u) => u.id === id)!;
      if (!isAlive(u)) continue;
      for (const [stat, amount] of [
        ['attack', c.power],
        ['abilityPower', c.power],
        ['attackSpeedMilli', c.speed],
      ] as const)
        if (amount)
          this.status(u, {
            id: `p13s-shisha-${stat}-${this.state.units.indexOf(u)}`,
            sourceId: 'shisheros',
            key: `p13s-shisha-${stat}`,
            kind: 'modifier',
            stat,
            amount,
            mode: 'percent_milli',
            origin: 'trait',
            expiresTick: null,
          });
    }
  }
}
