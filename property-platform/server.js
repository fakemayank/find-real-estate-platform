
// ============================================================================
// DEPENDENCIES AND ENVIRONMENT
// ============================================================================
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
    z
}
from 'zod';
import crypto from 'node:crypto';
import {
    fileURLToPath
}
from 'node:url';
import path from 'node:path';


// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================
const required=['DATABASE_URL','SESSION_SECRET','ZIPLINE_API_KEY','ROOT_EMAIL','ROOT_PASSWORD'];
for(const k of required) if(!process.env[k] || process.env[k].startsWith('CHANGE_ME') || process.env[k].startsWith('PASTE_')) throw Error(`Set ${k
}
in .env`);
const pool=new pg.Pool( {
    connectionString:process.env.DATABASE_URL
}
);
const app=express();
app.disable('x-powered-by');
app.set('trust proxy',1);
app.use(helmet( {
    contentSecurityPolicy:false
}
));
app.use(express.json( {
    limit:'80kb'
}
));
app.use(express.urlencoded( {
    extended:false
}
));
app.use(session( {
    store:new (pgSession(session))( {
        pool,createTableIfMissing:true
    }
    ),name:'property.sid',secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie: {
        httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',maxAge:1000*60*60*24*7
    }
}
));
app.use('/api/auth',rateLimit( {
    windowMs:15*60*1000,limit:25,standardHeaders:'draft-7',legacyHeaders:false
}
));
app.use('/api/enquiries',rateLimit( {
    windowMs:15*60*1000,limit:40,standardHeaders:'draft-7',legacyHeaders:false
}
));
const q=(sql,params=[])=>pool.query(sql,params);
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
// Always check current account permissions against the database. This makes role
// changes and account deletion effective immediately, including old sessions.

// ============================================================================
// AUTHENTICATION AND ROLE ACCESS
// ============================================================================
const auth=(role)=>wrap(async(req,res,next)=> {
    if(!req.session.user)return res.status(401).json( {
        error:'Login required'
    }
    ); const current=await q('SELECT id,name,email,role FROM users WHERE id=$1',[req.session.user.id]); if(!current.rowCount) {
        req.session.destroy(()=> {
        }
        ); return res.status(401).json( {
            error:'Account no longer available. Please sign in again.'
        }
        );
    }
    req.session.user=current.rows[0]; if(role && req.session.user.role!==role && req.session.user.role!=='root')return res.status(403).json( {
        error:'Access denied'
    }
    ); next();
}
);
const csrf=(req,res,next)=> {
    if(['POST','PATCH','PUT','DELETE'].includes(req.method) && req.path!=='/api/auth/login' && req.path!=='/api/auth/register') {
        if(req.get('x-csrf-token')!==req.session.csrf) return res.status(403).json( {
            error:'Invalid CSRF token'
        }
        );
    }
    next();
}
;
app.use(csrf);
app.param('id',(req,res,next,id)=> {
    if(!/^[1-9]\d{0,9}$/.test(id))return res.status(400).json( {
        error:'Invalid ID'
    }
    ); next();
}
);
const text=z.string().trim().min(2).max(300);
const register=z.object( {
    name:text.max(100),email:z.string().email().max(255),password:z.string().min(10).max(100),role:z.enum(['owner','customer'])
}
);

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================
const propertySchema=z.object( {
    title:text.max(150),description:z.string().trim().min(20).max(5000),listing_type:z.enum(['rent','sale']),property_type:z.enum(['apartment','house','villa','plot','commercial']),city:text.max(100),area:text.max(100),address:text.max(255),price:z.coerce.number().positive().max(100000000000)
}
);
const enquirySchema=z.object( {
    property_id:z.coerce.number().int().positive(),name:text.max(100),email:z.string().email().max(255),phone:z.string().trim().min(8).max(20),message:z.string().trim().min(10).max(2000)
}
);
const fail=(res,error)=>res.status(400).json( {
    error
}
);
app.get('/api/auth/me',wrap(async(req,res)=> {
    if(!req.session.csrf)req.session.csrf=crypto.randomBytes(32).toString('hex'); if(req.session.user) {
        const current=await q('SELECT id,name,email,role FROM users WHERE id=$1',[req.session.user.id]); req.session.user=current.rows[0]||null;
    }
    res.json( {
        user:req.session.user||null,csrf:req.session.csrf
    }
    );
}
));

// ============================================================================
// ACCOUNT REGISTRATION AND LOGIN
// ============================================================================
app.post('/api/auth/register',wrap(async(req,res)=> {
    const p=register.safeParse(req.body); if(!p.success)return fail(res,'Invalid registration details (password 10+ characters)'); const {
        name,email,password,role
    }
    =p.data; const hash=await bcrypt.hash(password,12); try {
        const r=await q('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',[name,email.toLowerCase(),hash,role]); req.session.regenerate(e=> {
            if(e)return res.status(500).json( {
                error:'Session failed'
            }
            ); req.session.user=r.rows[0]; req.session.csrf=crypto.randomBytes(32).toString('hex'); res.status(201).json( {
                user:r.rows[0],csrf:req.session.csrf
            }
            );
        }
        );
    }
    catch(e) {
        if(e.code==='23505')return fail(res,'Email already registered'); throw e;
    }
}
));
app.post('/api/auth/login',wrap(async(req,res)=> {
    const email=String(req.body.email||'').trim().toLowerCase(); const r=await q('SELECT * FROM users WHERE email=$1',[email]); const u=r.rows[0]; if(!u||!(await bcrypt.compare(String(req.body.password||''),u.password_hash)))return res.status(401).json( {
        error:'Invalid credentials'
    }
    ); const user= {
        id:u.id,name:u.name,email:u.email,role:u.role
    }
    ; req.session.regenerate(e=> {
        if(e)return res.status(500).json( {
            error:'Session failed'
        }
        ); req.session.user=user; req.session.csrf=crypto.randomBytes(32).toString('hex'); res.json( {
            user,csrf:req.session.csrf
        }
        );
    }
    );
}
));
app.post('/api/auth/logout',auth(),(req,res)=>req.session.destroy(()=> {
    res.clearCookie('property.sid'); res.json( {
        ok:true
    }
    );
}
));

// ============================================================================
// PUBLIC PROPERTY SEARCH AND DETAILS
// ============================================================================
app.get('/api/properties',wrap(async(req,res)=> {
    const {
        city,type,listing,search,minPrice,maxPrice
    }
    =req.query; const args=[]; let where="WHERE p.status='approved'"; for(const [col,v] of [['city',city],['property_type',type],['listing_type',listing]]) {
        if(v) {
            args.push(col==='city'?`%${String(v).slice(0,100)
        }
        %`:String(v).slice(0,100)); where+=` AND p.${col
    }
    ${col==='city'?'ILIKE':'='
}
$${args.length
}
`;
}
}
if(minPrice!==undefined && minPrice!=='') {
    const n=Number(minPrice); if(!Number.isFinite(n)||n<0)return fail(res,'Invalid minimum price'); args.push(n); where+=` AND p.price >= $${args.length
}
`;
}
if(maxPrice!==undefined && maxPrice!=='') {
    const n=Number(maxPrice); if(!Number.isFinite(n)||n<0)return fail(res,'Invalid maximum price'); args.push(n); where+=` AND p.price <= $${args.length
}
`;
}
if(search) {
    args.push(`%${String(search).slice(0,100)
}
%`); where+=` AND (p.title ILIKE $${args.length
}
OR p.area ILIKE $${args.length
}
)`;
}
const r=await q(`SELECT p.id,p.title,p.description,p.listing_type,p.property_type,p.city,p.area,p.address,p.price,p.photos,p.created_at FROM properties p ${where
}
ORDER BY p.created_at DESC LIMIT 100`,args); res.json(r.rows);
}
));
app.get('/api/properties/:id',wrap(async(req,res)=> {
    const r=await q("SELECT id,title,description,listing_type,property_type,city,area,address,price,photos,created_at FROM properties WHERE id=$1 AND status='approved'",[req.params.id]); if(!r.rowCount)return res.status(404).json( {
        error:'Not found'
    }
    ); res.json(r.rows[0]);
}
));
app.get('/api/owner/properties',auth('owner'),wrap(async(req,res)=> {
    const r=await q('SELECT * FROM properties WHERE owner_id=$1 ORDER BY created_at DESC',[req.session.user.id]); res.json(r.rows);
}
));

// ============================================================================
// PROPERTY OWNER: CREATE, EDIT AND SUBMIT
// ============================================================================
app.post('/api/owner/properties',auth('owner'),wrap(async(req,res)=> {
    const p=propertySchema.safeParse(req.body); if(!p.success)return fail(res,'Please complete all property fields'); const d=p.data; const r=await q('INSERT INTO properties(owner_id,title,description,listing_type,property_type,city,area,address,price) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[req.session.user.id,d.title,d.description,d.listing_type,d.property_type,d.city,d.area,d.address,d.price]); res.status(201).json(r.rows[0]);
}
));
app.patch('/api/owner/properties/:id',auth('owner'),wrap(async(req,res)=> {
    const p=propertySchema.safeParse(req.body); if(!p.success)return fail(res,'Invalid property fields'); const d=p.data; const r=await q("UPDATE properties SET title=$1,description=$2,listing_type=$3,property_type=$4,city=$5,area=$6,address=$7,price=$8,status='draft',updated_at=NOW() WHERE id=$9 AND owner_id=$10 AND status IN ('draft','rejected','approved') RETURNING *",[d.title,d.description,d.listing_type,d.property_type,d.city,d.area,d.address,d.price,req.params.id,req.session.user.id]); if(!r.rowCount)return res.status(403).json( {
        error:'Only your editable properties can be changed'
    }
    ); res.json(r.rows[0]);
}
));
app.post('/api/owner/properties/:id/submit',auth('owner'),wrap(async(req,res)=> {
    const r=await q("UPDATE properties SET status='pending',updated_at=NOW() WHERE id=$1 AND owner_id=$2 AND status IN ('draft','rejected') AND jsonb_array_length(photos)>0 RETURNING id,status",[req.params.id,req.session.user.id]); if(!r.rowCount)return fail(res,'Add at least one photo to your draft/rejected listing'); res.json(r.rows[0]);
}
));
// Zipline may return {url}, [{url}], {files:[{url}]}, or nested file objects.
// Never accept arbitrary external image hosts from an upstream response.
function extractZiplineUrl(payload) {
    const candidates=[];
    function collect(value,depth=0) {
        if(depth>5 || value==null)return;
        if(Array.isArray(value)) {
            for(const item of value.slice(0,20))collect(item,depth+1);
            return;
        }
        if(typeof value!=='object')return;
        for(const key of ['url','raw_url','rawUrl','file_url','fileUrl','direct_url','directUrl','link']) {
            if(typeof value[key]==='string')candidates.push(value[key]);
        }
        for(const key of ['files','file','data','result','uploads','upload'])if(value[key])collect(value[key],depth+1);
    }
    collect(payload);
    const origins=[process.env.ZIPLINE_URL,process.env.ZIPLINE_PUBLIC_URL].filter(Boolean).map(v=>new URL(v).origin);
    for(const candidate of candidates) {
        try {
            // Support root-relative links returned by some Zipline installations.
            const u=new URL(candidate,process.env.ZIPLINE_PUBLIC_URL||process.env.ZIPLINE_URL);
            if(u.protocol==='https:' && origins.includes(u.origin) && !u.username && !u.password && !u.searchParams.has('token'))return u.href;
            // localhost development Zipline installations may explicitly use http.
            if(u.protocol==='http:' && origins.includes(u.origin) && ['localhost','127.0.0.1'].includes(u.hostname))return u.href;
        }
        catch {
        }
    }
    return null;
}
const upload=multer( {
    storage:multer.memoryStorage(),limits: {
        fileSize:8*1024*1024,files:1
    }
    ,fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))
}
);
app.post('/api/owner/properties/:id/photos',auth('owner'),upload.single('photo'),wrap(async(req,res)=> {
    if(!req.file)return fail(res,'Choose a JPG, PNG or WebP image under 8 MB'); const own=await q("SELECT photos FROM properties WHERE id=$1 AND owner_id=$2 AND status IN ('draft','rejected','approved')",[req.params.id,req.session.user.id]); if(!own.rowCount)return res.status(403).json( {
        error:'Not editable'
    }
    ); if(own.rows[0].photos.length>=8)return fail(res,'Maximum 8 photos'); const magic=req.file.buffer; const valid=(magic[0]===255&&magic[1]===216)||(magic[0]===137&&magic[1]===80&&magic[2]===78&&magic[3]===71)||(magic.toString('ascii',0,4)==='RIFF'&&magic.toString('ascii',8,12)==='WEBP'); if(!valid)return fail(res,'Invalid image file'); const form=new FormData(); form.append('file',new Blob([req.file.buffer], {
        type:req.file.mimetype
    }
    ),`property-${crypto.randomUUID()
}
.${req.file.mimetype==='image/jpeg'?'jpg':req.file.mimetype.split('/')[1]
}
`); let response; try {
    response=await fetch(new URL('/api/upload',process.env.ZIPLINE_URL), {
        method:'POST',headers: {
            Authorization:process.env.ZIPLINE_API_KEY
        }
        ,body:form,signal:AbortSignal.timeout(30000)
    }
    );
}
catch(e) {
    console.error('Zipline connection failure:',e.message); return res.status(502).json( {
        error:'Image storage is temporarily unreachable. Please try again.'
    }
    );
}
if(!response.ok) {
    console.error('Zipline upload HTTP status:',response.status); return res.status(502).json( {
        error:`Image storage rejected the upload (HTTP ${response.status
    }
    ). Check the Zipline API key and upload permissions.`
}
);
}
let data; try {
    data=await response.json();
}
catch {
    return res.status(502).json( {
        error:'Image storage returned an invalid response.'
    }
    );
}
const url=extractZiplineUrl(data); if(!url) {
    // Log only field names, never credentials or signed image links.
    console.error('Zipline response URL could not be verified; top-level fields:',Array.isArray(data)?'array':Object.keys(data|| {
    }
    )); return res.status(502).json( {
        error:'Zipline uploaded the file but returned an unrecognized image link. Check ZIPLINE_PUBLIC_URL or response format.'
    }
    );
}
const r=await q("UPDATE properties SET photos=photos || $1::jsonb,status='draft',updated_at=NOW() WHERE id=$2 AND owner_id=$3 AND status IN ('draft','rejected','approved') AND jsonb_array_length(photos)<8 RETURNING photos",[JSON.stringify([url]),req.params.id,req.session.user.id]); res.json(r.rows[0]|| {
    photos:[]
}
);
}
));

// ============================================================================
// CUSTOMER ENQUIRIES
// ============================================================================
app.post('/api/enquiries',wrap(async(req,res)=> {
    const p=enquirySchema.safeParse(req.body); if(!p.success)return fail(res,'Invalid enquiry details'); const d=p.data; const r=await q("INSERT INTO enquiries(property_id,name,email,phone,message) SELECT id,$2,$3,$4,$5 FROM properties WHERE id=$1 AND status='approved' RETURNING id",[d.property_id,d.name,d.email,d.phone,d.message]); if(!r.rowCount)return res.status(404).json( {
        error:'Property not available'
    }
    ); res.status(201).json( {
        ok:true,id:r.rows[0].id
    }
    );
}
));
app.get('/api/admin/properties',auth('admin'),wrap(async(req,res)=> {
    const r=await q("SELECT p.*,u.name AS owner_name,u.email AS owner_email FROM properties p JOIN users u ON u.id=p.owner_id ORDER BY CASE WHEN p.status='pending' THEN 0 ELSE 1 END,p.created_at DESC LIMIT 200"); res.json(r.rows);
}
));
app.patch('/api/admin/properties/:id/review',auth('admin'),wrap(async(req,res)=> {
    const p=z.object( {
        status:z.enum(['approved','rejected']),reason:z.string().max(1000).default('')
    }
    ).safeParse(req.body); if(!p.success)return fail(res,'Invalid review'); const r=await q("UPDATE properties SET status=$1,rejection_reason=$2,updated_at=NOW() WHERE id=$3 AND status='pending' RETURNING id,status",[p.data.status,p.data.reason,req.params.id]); if(!r.rowCount)return fail(res,'Only pending listings can be reviewed'); res.json(r.rows[0]);
}
));
// Admin/root can permanently remove any listing, including its associated enquiries.
// A transaction prevents orphaned records or partial deletion.
app.delete('/api/admin/properties/:id',auth('admin'),wrap(async(req,res)=> {
    const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<1)return fail(res,'Invalid property ID'); const client=await pool.connect(); try {
        await client.query('BEGIN'); const found=await client.query('SELECT id,title FROM properties WHERE id=$1 FOR UPDATE',[id]); if(!found.rowCount) {
            await client.query('ROLLBACK'); return res.status(404).json( {
                error:'Listing not found'
            }
            );
        }
        const deletedEnquiries=await client.query('DELETE FROM enquiries WHERE property_id=$1 RETURNING id',[id]); await client.query('DELETE FROM properties WHERE id=$1',[id]); await client.query('COMMIT'); res.json( {
            ok:true,deletedProperty:found.rows[0],deletedEnquiries:deletedEnquiries.rowCount
        }
        );
    }
    catch(e) {
        await client.query('ROLLBACK'); throw e;
    }
    finally {
        client.release();
    }
}
));

// ============================================================================
// ADMIN: ENQUIRIES AND ACTIVITY HISTORY
// ============================================================================
app.get('/api/admin/enquiries',auth('admin'),wrap(async(req,res)=> {
    const r=await q('SELECT e.*,p.title AS property_title,p.city AS property_city,p.area AS property_area,p.listing_type AS property_listing_type FROM enquiries e JOIN properties p ON p.id=e.property_id ORDER BY e.created_at DESC LIMIT 200'); res.json(r.rows);
}
));
app.patch('/api/admin/enquiries/:id',auth('admin'),wrap(async(req,res)=> {
    const p=z.object( {
        status:z.enum(['contacted','closed']),notes:z.string().max(3000)
    }
    ).safeParse(req.body); if(!p.success)return res.status(400).json({error:'Choose Contacted or Closed and keep internal notes under 3000 characters.'}); const client=await pool.connect(); try {
        await client.query('BEGIN'); const before=await client.query('SELECT status FROM enquiries WHERE id=$1 FOR UPDATE',[req.params.id]); if(!before.rowCount) {
            await client.query('ROLLBACK'); return res.status(404).json( {
                error:'Not found'
            }
            )
        }
        const r=await client.query('UPDATE enquiries SET status=$1,internal_notes=$2 WHERE id=$3 RETURNING id,status,internal_notes',[p.data.status,p.data.notes,req.params.id]); await client.query('INSERT INTO enquiry_activity(enquiry_id,previous_status,status,notes,actor_name) VALUES($1,$2,$3,$4,$5)',[req.params.id,before.rows[0].status,p.data.status,p.data.notes,req.session.user.name||'Administrator']); await client.query('COMMIT'); res.json(r.rows[0])
    }
    catch(e) {
        await client.query('ROLLBACK'); throw e
    }
    finally {
        client.release()
    }
}
));
app.get('/api/admin/enquiry-history',auth('admin'),wrap(async(req,res)=> {
    const r=await q(`SELECT l.id,l.enquiry_id,l.previous_status,l.status,l.notes,l.created_at,l.actor_name,e.name AS customer_name,e.email,e.phone,e.message,p.title AS property_title FROM enquiry_activity l LEFT JOIN enquiries e ON e.id=l.enquiry_id LEFT JOIN properties p ON p.id=e.property_id ORDER BY l.created_at DESC LIMIT 300`); res.json(r.rows)
}
));
app.get('/api/root/users',auth('root'),wrap(async(req,res)=> {
    const r=await q("SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 500"); res.json(r.rows);
}
));
app.patch('/api/root/users/:id/role',auth('root'),wrap(async(req,res)=> {
    // Accept a single role value from native or custom form controls.
    // Never trust labels or unknown role values for authorization.
    const rawRole = req.body?.role;
    const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : '';
    const parsed = z.enum(['customer', 'owner', 'admin']).safeParse(role);
    if (!parsed.success) return fail(res, 'Select Customer, Property owner or Administrator'); const r=await q("UPDATE users SET role=$1 WHERE id=$2 AND role<>'root' RETURNING id,name,email,role",[parsed.data,req.params.id]); if(!r.rowCount)return res.status(403).json( {
        error:'Root account cannot be modified'
    }
    ); res.json(r.rows[0]);
}
));
app.delete('/api/root/users/:id',auth('root'),wrap(async(req,res)=> {
    const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<=0)return fail(res,'Invalid user ID'); const client=await pool.connect(); try {
        await client.query('BEGIN'); const found=await client.query('SELECT id,role FROM users WHERE id=$1 FOR UPDATE',[id]); if(!found.rowCount) {
            await client.query('ROLLBACK'); return res.status(404).json( {
                error:'Account not found'
            }
            )
        }
        if(found.rows[0].role==='root'||id===req.session.user.id) {
            await client.query('ROLLBACK'); return res.status(403).json( {
                error:'Administrator account is protected'
            }
            )
        }
        await client.query('DELETE FROM enquiries WHERE property_id IN (SELECT id FROM properties WHERE owner_id=$1)',[id]); await client.query('DELETE FROM properties WHERE owner_id=$1',[id]); await client.query('DELETE FROM users WHERE id=$1',[id]); await client.query('COMMIT'); res.json( {
            deleted:true
        }
        )
    }
    catch(e) {
        await client.query('ROLLBACK'); throw e
    }
    finally {
        client.release()
    }
}
));
app.get('/api/root/stats',auth('root'),wrap(async(req,res)=> {
    const [users,properties,enquiries]=await Promise.all([q('SELECT count(*)::int AS n FROM users'),q('SELECT status,count(*)::int AS n FROM properties GROUP BY status'),q('SELECT count(*)::int AS n FROM enquiries')]); res.json( {
        users:users.rows[0].n,properties:properties.rows,enquiries:enquiries.rows[0].n
    }
    );
}
));
app.delete('/api/owner/properties/:id/photos',auth('owner'),wrap(async(req,res)=> {
    const url=z.string().url().safeParse(req.body?.url); if(!url.success)return fail(res,'Invalid image URL'); const r=await q("UPDATE properties SET photos=(SELECT coalesce(jsonb_agg(value),'[]'::jsonb) FROM jsonb_array_elements(photos) AS value WHERE value #>> '{}' <> $1),status='draft',updated_at=NOW() WHERE id=$2 AND owner_id=$3 AND status IN ('draft','rejected','approved') AND photos ? $1 RETURNING photos",[url.data,req.params.id,req.session.user.id]); if(!r.rowCount)return fail(res,'Photo not found or property cannot be edited'); res.json(r.rows[0]);
}
));
app.get('/api/health',(_req,res)=>res.json( {
    ok:true
}
));
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
app.use(express.static(dir, {
    setHeaders(res,file) {
        if(file.endsWith('index.html'))res.setHeader('Cache-Control','no-store');
    }
}
));
app.get('*',(_req,res)=>res.set('Cache-Control','no-store').sendFile(path.join(dir,'index.html')));
app.use((err,req,res,next)=> {
    console.error(err); res.status(err instanceof multer.MulterError?400:500).json( {
        error:err instanceof multer.MulterError?err.message:'Server error; check logs'
    }
    );
}
);

// ============================================================================
// DATABASE INITIALIZATION AND SERVER STARTUP
// ============================================================================
async function init() {
    await q(`CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(255) UNIQUE NOT NULL,password_hash TEXT NOT NULL,role VARCHAR(20) NOT NULL CHECK(role IN ('customer','owner','admin','root')),created_at TIMESTAMPTZ DEFAULT NOW());CREATE TABLE IF NOT EXISTS properties(id SERIAL PRIMARY KEY,owner_id INT NOT NULL REFERENCES users(id),title VARCHAR(150) NOT NULL,description TEXT NOT NULL,listing_type VARCHAR(10) NOT NULL,property_type VARCHAR(30) NOT NULL,city VARCHAR(100) NOT NULL,area VARCHAR(100) NOT NULL,address VARCHAR(255) NOT NULL,price NUMERIC(14,2) NOT NULL,photos JSONB NOT NULL DEFAULT '[]'::jsonb,status VARCHAR(20) NOT NULL DEFAULT 'draft',rejection_reason TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());CREATE TABLE IF NOT EXISTS enquiries(id SERIAL PRIMARY KEY,property_id INT NOT NULL REFERENCES properties(id),name VARCHAR(100) NOT NULL,email VARCHAR(255) NOT NULL,phone VARCHAR(20) NOT NULL,message TEXT NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'new',internal_notes TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ DEFAULT NOW());`);
    await q(`CREATE TABLE IF NOT EXISTS enquiry_activity(id BIGSERIAL PRIMARY KEY,enquiry_id INT REFERENCES enquiries(id) ON DELETE SET NULL,previous_status VARCHAR(20),status VARCHAR(20) NOT NULL,notes TEXT NOT NULL DEFAULT '',actor_name VARCHAR(100) NOT NULL DEFAULT 'Administrator',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
    if(process.env.ROOT_EMAIL&&process.env.ROOT_PASSWORD) {
        if(process.env.ROOT_PASSWORD.length<12)throw Error('ROOT_PASSWORD must have 12+ characters');
        const hash=await bcrypt.hash(process.env.ROOT_PASSWORD,12);
        await q("INSERT INTO users(name,email,password_hash,role) VALUES('Administrator',$1,$2,'root') ON CONFLICT(email) DO NOTHING",[process.env.ROOT_EMAIL.toLowerCase(),hash]);
        await q("UPDATE users SET name='Administrator' WHERE role='root' AND name='Root Administrator' AND email=$1",[process.env.ROOT_EMAIL.toLowerCase()]);
    }
}
init().then(()=>app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Property platform listening'))).catch(e=> {
    console.error(e); process.exit(1)
}
);
