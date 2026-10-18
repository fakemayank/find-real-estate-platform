// Run against a disposable test deployment: BASE_URL=http://localhost:8080 node scripts/live-smoke.mjs
// Read-only checks: does not create accounts, properties or enquiries.
import assert from 'node:assert/strict';
const base=(process.env.BASE_URL||'http://localhost:8080').replace(/\/$/,'');
async function check(path,expected) {
    const r=await fetch(base+path, {
        redirect:'manual'
    }
    );
    assert.equal(r.status,expected,`${path
}
: expected ${expected
}
, received ${r.status
}
`);
return r
}
await check('/api/health',200);
const listings=await (await check('/api/properties',200)).json();
assert.ok(Array.isArray(listings),'public property listing must be an array');
for(const p of listings) {
    assert.ok(!('owner_email' in p)&&!('owner_phone' in p)&&!('phone' in p),'public listing must not reveal owner contact');
    const d=await(await check(`/api/properties/${p.id
}
`,200)).json();
assert.ok(!('owner_email' in d)&&!('owner_phone' in d)&&!('phone' in d),'public details must not reveal owner contact')
}
for(const route of ['/api/owner/properties','/api/admin/properties','/api/admin/enquiries','/api/admin/enquiry-history','/api/root/users'])await check(route,401);
await check('/api/properties/not-a-number',400);
await check('/api/properties/999999999',404);
const auth=await(await check('/api/auth/me',200)).json();
assert.ok(auth.csrf,'CSRF token should be returned');
console.log(`PASS: public health, ${listings.length
}
approved listing(s), owner privacy, authentication restrictions, invalid IDs, CSRF bootstrap`);
