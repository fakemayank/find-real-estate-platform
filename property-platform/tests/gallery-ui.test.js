import test from 'node:test';
import assert from 'node:assert/strict';
import {
    readFileSync
}
from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('public and admin gallery launch shared lightbox',()=> {
    assert.match(app,/openPhotoViewer/); assert.match(app,/data-gallery-property/); assert.match(app,/data-public-photo/)
}
);
test('viewer supports keyboard close and navigation',()=> {
    assert.match(app,/ArrowLeft/); assert.match(app,/ArrowRight/); assert.match(app,/Escape/)
}
)
