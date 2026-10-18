import test from 'node:test';
import assert from 'node:assert/strict';
import {
    readFileSync
}
from 'node:fs';
const server=readFileSync(new URL('../server.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const checks=[ ['public property list filters on approval',/WHERE p\.status='approved'/], ['public property detail filters on approval',/AND status='approved'/], ['public properties do not select owner phone or email',/SELECT p\.id,p\.title,p\.description,p\.listing_type,p\.property_type,p\.city,p\.area,p\.address,p\.price,p\.photos,p\.created_at/], ['passwords are hashed',/bcrypt\.hash\(password,12\)/], ['CSRF checks exist',/const csrf=/], ['session is stored in PostgreSQL',/pgSession\(session\)/], ['role checked from database for every protected request',/SELECT id,name,email,role FROM users WHERE id=\$1/], ['owner can create properties',/app\.post\('\/api\/owner\/properties',auth\('owner'\)/], ['owner edits only their own properties',/WHERE id=\$9 AND owner_id=\$10/], ['owner can submit property for review',/\/api\/owner\/properties\/:id\/submit/], ['photo upload validates MIME, size and signature',/fileSize:8\*1024\*1024/], ['admin approves or rejects',/status:z\.enum\(\['approved','rejected'\]\)/], ['admin enquiry notes and status',/internal_notes=\$2/], ['enquiry activity audit log',/INSERT INTO enquiry_activity/], ['customer enquiry validates contact info',/const enquirySchema=/], ['root can manage user access',/\/api\/root\/users\/:id\/role/] ];
for(const [name,pattern] of checks)test(name,()=>assert.match(server,pattern));
for(const [name,pattern] of [ ['customer-facing details and enquiry form',/async function detail\(id\)/], ['owner workspace',/async function owner\(/], ['admin workspace',/async function admin\(/], ['enquiry folders',/enquiry-folder-summary/], ['photo gallery viewer',/function openPhotoViewer\(/], ['auth modal',/function openAuth\(/], ['property preview',/Preview listing/i], ['themed confirmation',/function findConfirm\(/] ])test(name,()=>assert.match(ui,pattern));
test('responsive viewport',()=>assert.match(page,/name="viewport"/));
