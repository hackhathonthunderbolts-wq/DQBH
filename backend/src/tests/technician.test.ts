import assert from 'assert';
import { MemoryStore } from '../db/memoryStore';
import { haversineKm, skillMatch } from '../services/technicianService';

const store=MemoryStore.getInstance();

const distance=haversineKm({latitude:29.7700,longitude:-95.3800},{latitude:29.7604,longitude:-95.3698});
assert(distance>1 && distance<2,'Haversine distance should be approximately 1-2 km');

const match=skillMatch('tech-sarah-01',['TURBINE_LVL3','VIBRATION_ANALYSIS']);
assert.strictEqual(match.rate,100,'Sarah should fully match turbine/vibration requirements');
assert.strictEqual(match.matched.length,2);

const pending=Array.from(store.assignments.values()).find(a=>a.id==='asg-tech-sarah-pending');
assert(pending && pending.status==='PENDING','Seed should include a pending technician assignment');

const certs=Array.from(store.certifications.values()).filter(c=>c.technicianId==='tech-sarah-01');
assert(certs.length>=2,'Seed should include technician certifications');

console.log('Technician Step 1 tests passed.');
