import fs from 'node:fs';
import assert from 'node:assert/strict';

const catalog=JSON.parse(fs.readFileSync(new URL('./service-catalog.json',import.meta.url),'utf8'));
const services=catalog.services||[];
assert.equal(services.length,21,'v4.3 public service catalogue must retain 21 approved services');
const ids=services.map(x=>x.id);
assert.equal(new Set(ids).size,ids.length,'Service catalogue IDs must be unique');
for(const service of services){
  assert.match(service.id,/^[a-z][a-z0-9_]*$/,'Service ID must be a stable backend-safe code: '+service.id);
  assert.equal(service.sellable,true,'Approved service must remain sellable: '+service.id);
  assert.ok(Number.isInteger(service.price)&&service.price>=6000000,'Service price must respect the approved specialist pricing floor: '+service.id);
  assert.equal(service.currency||catalog.currency,'IRT','Service currency must remain IRT: '+service.id);
  assert.ok(service.fit_fa&&service.outcome_fa&&service.boundary_fa,'Premium scope architecture missing: '+service.id);
}
const migration=fs.readFileSync(new URL('./db/migrations/030_service_catalog_intake_alignment.sql',import.meta.url),'utf8');
assert.match(migration,/service_definition_id/);
assert.match(migration,/public_catalog_code/);
assert.match(migration,/service_type DROP NOT NULL/);
console.log('Service catalogue intake alignment passed:',services.length,'stable v4.3 service codes validated.');
