import assert from 'node:assert/strict';
import console from 'node:console';
import { createRailwayContext, project } from 'railway/iac';
import definition from '../../.railway/railway.ts';
const intent = await definition(
  createRailwayContext({ environment: 'private', command: 'local-review' }),
  project,
);
assert.equal(intent.resources.length, 1);
const service = intent.resources[0];
assert.equal(service.type, 'service');
assert.equal(service.deploy.numReplicas, 1);
assert.equal(service.deploy.healthcheckPath, '/readyz');
assert.equal(service.deploy.startCommand, 'node apps/server/dist/main.js');
assert.equal(service.deploy.sleepApplication, false);
assert.equal(service.deploy.limitOverride.containers.memoryBytes, 2 ** 31);
assert.equal(service.build.builder, 'RAILPACK');
assert.equal(service.source.rootDirectory, '/');
assert.equal(service.variables.SUPABASE_SERVICE_ROLE_KEY.type, 'preserve');
console.log('Railway intent checked locally: one service, no provisioning or network calls.');
