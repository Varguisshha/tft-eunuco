/** Reproduce: pnpm --filter @tft/server exec tsx ../../scripts/florin-balance.ts */
import { writeFileSync } from 'node:fs';
import { runCombat, scaledProfile } from '../packages/game-core/src/index';
import { FLORIN_ECONOMY_CONFIG as config, traitsFor } from '../packages/game-data/src/index';
import { CombatInputSchema, type CombatInput } from '../packages/shared/src/index';
const rows = [];
for (const stars of [1, 2, 3] as const)
  for (const opponent of ['dolea', 'vargas', 'jaramillo']) {
    let wins = 0,
      losses = 0,
      draws = 0,
      ticks = 0,
      heal = 0,
      shield = 0;
    for (let seed = 1; seed <= 12; seed++)
      for (const mirror of [false, true]) {
        const units: CombatInput['units'] = [
          {
            id: 'florin',
            definitionId: 'florin',
            owner: mirror ? 'north' : 'south',
            position: mirror ? { q: 1, r: 3 } : { q: 1, r: 4 },
            profile: scaledProfile('florin', stars, config),
          },
          {
            id: 'rival',
            definitionId: opponent,
            owner: mirror ? 'south' : 'north',
            position: mirror ? { q: 1, r: 4 } : { q: 1, r: 3 },
            profile: scaledProfile(opponent, stars, config),
          },
        ];
        const replay = runCombat(
          CombatInputSchema.parse({
            protocolVersion: 3,
            rulesVersion: 'florin-1',
            combatId: 'balance-fixture',
            seed,
            maxTicks: 450,
            obstacles: [],
            traits: traitsFor(config.catalog),
            units,
          }),
        );
        if (replay.result.winner === (mirror ? 'north' : 'south')) wins++;
        else if (replay.result.winner) losses++;
        else draws++;
        ticks += replay.result.tick;
        for (const e of replay.events) {
          if (e.type === 'heal' && e.payload.targetId === 'florin') heal += e.payload.amount;
          if (e.type === 'shield_apply' && e.payload.unitId === 'florin')
            shield += e.payload.status.amount;
        }
      }
    rows.push({
      stars,
      opponent,
      games: 24,
      wins,
      losses,
      draws,
      meanSeconds: +(ticks / 240).toFixed(2),
      meanHealing: +(heal / 24).toFixed(2),
      meanShield: +(shield / 24).toFixed(2),
    });
  }
writeFileSync(
  new URL('../artifacts/florin/balance.json', import.meta.url),
  JSON.stringify(
    {
      description:
        'Synthetic adjacent duels, 12 seeds and both sides, equal stars, no items. Not a complete meta assessment.',
      rows,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(rows));
