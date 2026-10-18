import test from 'node:test';
import assert from 'node:assert/strict';
import {
    readFileSync
}
from 'node:fs';
test('Docker Compose defines app and PostgreSQL',()=> {
    const s=readFileSync(new URL('../docker-compose.yml',import.meta.url),'utf8'); assert.match(s,/web:/); assert.match(s,/db:/)
}
);
test('Frontend includes property search and owner dashboard',()=> {
    const s=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'); assert.match(s,/async function home/); assert.match(s,/async function owner/)
}
);
