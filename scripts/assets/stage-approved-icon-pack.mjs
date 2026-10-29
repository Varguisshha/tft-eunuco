import console from 'node:console';
import process from 'node:process';
import { stageApprovedIconPack } from './item-icon-pack.mjs';
const [id, source, destination, ...rest] = process.argv.slice(2);
if (!id || !source || !destination || rest.length)
  throw Error(
    'Usage: node scripts/assets/stage-approved-icon-pack.mjs PACK_ID SOURCE_ROOT NEW_DESTINATION',
  );
console.log(JSON.stringify(await stageApprovedIconPack(id, source, destination)));
