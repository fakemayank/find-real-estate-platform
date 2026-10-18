
// ============================================================================
// CUSTOM CONFIRMATION DIALOG
// ============================================================================
function findConfirm( {
    title='Confirm action',message='',confirmText='Confirm',danger=false
}
= {
}
) {
    return new Promise(resolve=> {
        const previous=document.getElementById('findConfirmOverlay'); if(previous)previous.remove(); const overlay=document.createElement('div'); overlay.id='findConfirmOverlay'; overlay.className='find-confirm-overlay'; overlay.innerHTML=`<section class="find-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="findConfirmTitle" aria-describedby="findConfirmMessage"><div class="find-confirm-icon ${danger?'danger':''
    }
    "><i class="fa-solid ${danger?'fa-triangle-exclamation':'fa-circle-question'
}
"></i></div><h2 id="findConfirmTitle">${esc(title)
}
</h2><p id="findConfirmMessage">${esc(message)
}
</p><div class="find-confirm-actions"><button type="button" class="btn secondary" data-answer="cancel"><i class="fa-solid fa-xmark"></i> Cancel</button><button type="button" class="btn ${danger?'danger':''
}
" data-answer="confirm"><i class="fa-solid ${danger?'fa-trash-can':'fa-check'
}
"></i> ${esc(confirmText)
}
</button></div></section>`; document.body.append(overlay); const oldFocus=document.activeElement; const finish=value=> {
    document.removeEventListener('keydown',keyHandler,true); overlay.remove(); oldFocus?.focus?.(); resolve(value)
}
; const keyHandler=e=> {
    if(e.key==='Escape') {
        e.preventDefault(); finish(false)
    }
    if(e.key==='Tab') {
        const buttons=[...overlay.querySelectorAll('button')]; const first=buttons[0],last=buttons.at(-1); if(e.shiftKey&&document.activeElement===first) {
            e.preventDefault(); last.focus()
        }
        else if(!e.shiftKey&&document.activeElement===last) {
            e.preventDefault(); first.focus()
        }
    }
}
; document.addEventListener('keydown',keyHandler,true); overlay.addEventListener('click',e=> {
    if(e.target===overlay)finish(false); const button=e.target.closest('[data-answer]'); if(button)finish(button.dataset.answer==='confirm')
}
); overlay.querySelector('[data-answer="cancel"]').focus();
}
);
}

// ============================================================================
// APPLICATION STATE AND COMMON HELPERS
// ============================================================================
let me=null,csrf='';
const app=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>( {
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
const money=v=>'₹'+Number(v).toLocaleString('en-IN');

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================
const notice=(t,kind='success')=> {
    let stack=document.querySelector('#findToastStack');
    if(!stack) {
        stack=document.createElement('div');
        stack.id='findToastStack';
        stack.setAttribute('aria-live','polite');
        document.body.appendChild(stack)
    }
    const el=document.createElement('div');
    el.className='find-toast '+kind;
    const icon=document.createElement('i');
    icon.className='fa-solid '+(kind==='error'?'fa-circle-exclamation':'fa-circle-check');
    const msg=document.createElement('span');
    msg.textContent=t;
    const close=document.createElement('button');
    close.type='button';
    close.setAttribute('aria-label','Dismiss notification');
    close.innerHTML='<i class="fa-solid fa-xmark"></i>';
    close.onclick=()=>el.remove();
    el.append(icon,msg,close);
    stack.append(el);
    setTimeout(()=>el.remove(),4800)
}
;

// ============================================================================
// API CLIENT
// ============================================================================
async function api(url,opts= {
}
) {
    const headers= {
        ...opts.headers
    }
    ;
    if(!(opts.body instanceof FormData)&&opts.body) {
        headers['Content-Type']='application/json';
        opts.body=JSON.stringify(opts.body)
    }
    if(opts.method&&opts.method!=='GET')headers['x-csrf-token']=csrf;
    const r=await fetch('/api'+url, {
        credentials:'same-origin',...opts,headers
    }
    );
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'Request failed');
    return d
}
const roleLabel= {
    root:'Administrator',admin:'Administrator',owner:'Property Owner',customer:'Customer'
}
;
function initials(name) {
    return String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()
}
async function loadUser() {
    const d=await api('/auth/me');
    me=d.user;
    csrf=d.csrf;
    const bar=document.querySelector('#authbar');
    document.querySelectorAll('.top nav a[href="#register"]').forEach(x=>x.classList.toggle('hidden',!!me));
    bar.innerHTML=me?`<div class="account-wrap"><button id="accountButton" class="account-button" aria-expanded="false" aria-haspopup="true"><span class="account-avatar">${esc(initials(me.role==='root'?'Administrator':me.name))
}
</span><span class="account-details"><strong>${esc(me.role==='root'?'Administrator':me.name)
}
</strong><small>${esc(roleLabel[me.role]||'Member')
}
</small></span><i class="fa-solid fa-chevron-down account-chevron"></i></button><div id="accountMenu" class="account-menu hidden"><div class="account-menu-head"><span class="account-avatar large">${esc(initials(me.role==='root'?'Administrator':me.name))
}
</span><div><strong>${esc(me.role==='root'?'Administrator':me.name)
}
</strong><small>${esc(me.email||roleLabel[me.role])
}
</small></div></div><div class="account-menu-links"><a href="#explore"><i class="fa-solid fa-compass menu-icon-explore"></i> Explore properties</a>${['owner','root'].includes(me.role)?'<a href="#owner"><i class="fa-solid fa-building-circle-check menu-icon-owner"></i> My listings</a>':''
}
${['admin','root'].includes(me.role)?'<a href="#admin"><i class="fa-solid fa-clipboard-check menu-icon-admin"></i> Review & enquiries</a><a href="#enquiry-history"><i class="fa-solid fa-clock-rotate-left menu-icon-admin"></i> Enquiry history</a>':''
}
${me.role==='root'?'<a href="#root"><i class="fa-solid fa-user-shield menu-icon-root"></i> Root control center</a>':''
}
<button id="logout" type="button"><i class="fa-solid fa-right-from-bracket menu-icon-signout"></i> Sign out</button></div></div></div>`:'<button class="nav-signin" id="openSignin"><i class="fa-regular fa-user"></i> Sign in</button>';
document.querySelectorAll('.ownerlink').forEach(x=>x.classList.toggle('hidden',!['owner','root'].includes(me?.role)));
document.querySelectorAll('.adminlink').forEach(x=>x.classList.toggle('hidden',!['admin','root'].includes(me?.role)));
document.querySelectorAll('.historylink').forEach(x=>x.classList.toggle('hidden',!['admin','root'].includes(me?.role)));
document.querySelectorAll('.rootlink').forEach(x=>x.classList.toggle('hidden',me?.role!=='root'));
document.querySelector('#openSignin')?.addEventListener('click',()=>openAuth(false));
const btn=document.querySelector('#accountButton'),menu=document.querySelector('#accountMenu');
btn?.addEventListener('click',e=> {
    e.stopPropagation(); menu.classList.toggle('hidden'); btn.setAttribute('aria-expanded',String(!menu.classList.contains('hidden')))
}
);
menu?.addEventListener('click',e=> {
    if(e.target.closest('a'))menu.classList.add('hidden')
}
);
document.querySelector('#logout')?.addEventListener('click',async()=> {
    try {
        await api('/auth/logout', {
            method:'POST'
        }
        ); await loadUser(); closeAuth(); location.hash='#home'; route()
    }
    catch(e) {
        notice(e.message)
    }
}
)
}
document.addEventListener('click',e=> {
    if(!e.target.closest('.account-wrap')) {
        document.querySelector('#accountMenu')?.classList.add('hidden'); document.querySelector('#accountButton')?.setAttribute('aria-expanded','false')
    }
}
);
function openPhotoViewer(urls,start=0,title='Property photos') {
    const pictures=(urls||[]).filter(u=> {
        try {
            const x=new URL(u,location.href); return x.protocol==='https:'||x.origin===location.origin
        }
        catch {
            return false
        }
    }
    );
    if(!pictures.length)return;
    document.querySelector('#findPhotoViewer')?.remove();
    let index=Math.max(0,Math.min(start,pictures.length-1));
    const layer=document.createElement('div');
    layer.id='findPhotoViewer';
    layer.className='find-photo-overlay';
    layer.setAttribute('role','dialog');
    layer.setAttribute('aria-modal','true');
    layer.setAttribute('aria-label',title);
    layer.innerHTML=`<div class="find-photo-dialog"><div class="find-photo-top"><div><strong class="find-photo-title"></strong><span class="find-photo-counter" aria-live="polite"></span></div><button type="button" class="find-photo-close" aria-label="Close photo viewer"><i class="fa-solid fa-xmark"></i></button></div><div class="find-photo-stage"><button type="button" class="find-photo-arrow prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left"></i></button><img alt="Property image" class="find-photo-large"><button type="button" class="find-photo-arrow next" aria-label="Next image"><i class="fa-solid fa-chevron-right"></i></button></div><div class="find-photo-thumbs"></div></div>`;
    document.body.append(layer);
    document.body.classList.add('photo-viewer-open');
    const oldFocus=document.activeElement;
    const update=()=> {
        layer.querySelector('.find-photo-title').textContent=title;
        layer.querySelector('.find-photo-counter').textContent=`${index+1
    }
    / ${pictures.length
}
`;
const large=layer.querySelector('.find-photo-large');
large.src=pictures[index];
large.alt=`${title
}
— image ${index+1
}
`;
layer.querySelectorAll('.find-photo-arrow').forEach(b=>b.hidden=pictures.length<2);
layer.querySelector('.find-photo-thumbs').innerHTML=pictures.map((u,i)=>`<button type="button" data-photo-index="${i
}
" class="${i===index?'active':''
}
" aria-label="View image ${i+1
}
" aria-pressed="${i===index
}
"><img src="${esc(u)
}
" alt=""></button>`).join('');
layer.querySelector('.find-photo-thumbs .active')?.scrollIntoView( {
    block:'nearest',inline:'nearest'
}
)
}
;
const close=()=> {
    document.removeEventListener('keydown',key,true);
    layer.remove();
    document.body.classList.remove('photo-viewer-open');
    oldFocus?.focus?.()
}
;
const move=delta=> {
    index=(index+delta+pictures.length)%pictures.length;
    update()
}
;
const key=e=> {
    if(e.key==='Escape') {
        e.preventDefault();
        close()
    }
    else if(e.key==='ArrowLeft') {
        e.preventDefault();
        move(-1)
    }
    else if(e.key==='ArrowRight') {
        e.preventDefault();
        move(1)
    }
    else if(e.key==='Tab') {
        const controls=[...layer.querySelectorAll('button:not([hidden])')];
        let pos=controls.indexOf(document.activeElement);
        if(e.shiftKey&&pos<=0) {
            e.preventDefault();
            controls.at(-1)?.focus()
        }
        else if(!e.shiftKey&&pos===controls.length-1) {
            e.preventDefault();
            controls[0]?.focus()
        }
    }
}
;
document.addEventListener('keydown',key,true);
layer.addEventListener('click',e=> {
    if(e.target===layer||e.target.closest('.find-photo-close'))close(); else if(e.target.closest('.find-photo-arrow.prev'))move(-1); else if(e.target.closest('.find-photo-arrow.next'))move(1); else if(e.target.closest('[data-photo-index]')) {
        index=Number(e.target.closest('[data-photo-index]').dataset.photoIndex); update()
    }
}
);
update();
layer.querySelector('.find-photo-close').focus();
}
function photoStrip(p) {
    const urls=p.photos||[];
    return urls.length?`<div class="admin-photo-gallery">${urls.map((url,i)=>`<button type="button" class="admin-photo-trigger" data-gallery-property="${p.id
}
" data-gallery-index="${i
}
" aria-label="View ${esc(p.title)
}
photo ${i+1
}
of ${urls.length
}
"><img src="${esc(url)
}
" alt="${esc(p.title)
}
photo ${i+1
}
" loading="lazy"><span><i class="fa-solid fa-up-right-and-down-left-from-center"></i></span></button>`).join('')
}
</div>`:'<div class="admin-photo-empty"><i class="fa-regular fa-image"></i> No photos uploaded</div>'
}
const img=p=>p.photos?.[0]?`<img src="${esc(p.photos[0])
}
" alt="Property photo" loading="lazy">`:'<div class="placeholder"><i class="fa-regular fa-image" aria-hidden="true"></i><span>Photo coming soon</span></div>';
const card=p=>`<a class="property" href="#property/${p.id
}
"><div class="property-media">${img(p)
}
<span class="listing-chip">${p.listing_type==='rent'?'For rent':'For sale'
}
</span></div><div class="body"><div class="property-type">${esc(p.property_type)
}
</div><h3>${esc(p.title)
}
</h3><p class="muted property-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(p.area)
}
, ${esc(p.city)
}
</p><div class="property-bottom"><div class="price">${money(p.price)
}
${p.listing_type==='rent'?'<span class="muted"> / month</span>':''
}
</div><span class="property-arrow" aria-label="View details"><i class="fa-solid fa-arrow-up-right-from-square"></i></span></div></div></a>`;
function error(e) {
    notice(e.message)
}
async function home(initialFilters= {
}
) {
    app.innerHTML=`<section class="hero find-hero"><div class="hero-photo"></div><div class="hero-copy"><h1>Find What <strong>Moves You</strong></h1><p>Expert agents. <b>Real guidance.</b> A clear path to find what’s next.</p><a class="hero-cta" href="#explore">Find Properties <i class="fa-solid fa-arrow-right"></i></a></div><div class="hero-bottom-note">DISCOVER MORE <span></span> GUJARAT, INDIA</div></section><section class="discover" id="listings"><div class="container"><div class="discover-intro"><div><span class="eyebrow">THE FIND COLLECTION</span><h2>A place for every <em>possibility.</em></h2></div><p>Discover beautiful spaces designed for the life you’re building.</p></div><form class="searchbar" id="search"><label><span>KEYWORD</span><input name="search" placeholder="Area, address or keyword"></label><label><span>LOCATION</span><input name="city" placeholder="City in Gujarat"></label><label><span>LOOKING TO</span><select name="listing"><option value="">Buy or rent</option><option value="sale">Buy</option><option value="rent">Rent</option></select></label><label><span>PROPERTY TYPE</span><select name="type"><option value="">All types</option><option value="apartment">Apartment</option><option value="house">House</option><option value="villa">Villa</option><option value="plot">Plot</option><option value="commercial">Commercial</option></select></label><label><span>MIN PRICE</span><input type="number" name="minPrice" min="0" placeholder="₹ Minimum"></label><label><span>MAX PRICE</span><input type="number" name="maxPrice" min="0" placeholder="₹ Maximum"></label><button class="btn search-action"><i class="fa-solid fa-magnifying-glass"></i> Search</button></form><div class="sectionhead"><div><span class="eyebrow">CURATED FOR YOU</span><h2>Explore exceptional spaces.</h2></div><span class="muted" id="count">Loading...</span></div><div class="grid" id="properties"></div></div></section><section class="architecture-story" aria-label="Discover the architecture of home"><div class="architecture-story-copy"><span class="eyebrow">SPACE TO IMAGINE</span><h2>Perspective changes<br><em>everything.</em></h2><p>Discover places with room for what comes next.</p><a href="#explore" class="architecture-story-link">Explore the collection <i class="fa-solid fa-arrow-right"></i></a></div><div class="architecture-stage"><img class="architecture-building" src="/architecture-building.png" alt="Architectural illustration of a modern residential tower" loading="lazy"></div></section><section class="editorial-band"><div class="editorial-inner"><div><span class="eyebrow">MORE THAN A LISTING</span><h2>Home is where<br><em>everything begins.</em></h2></div><p>Finding property should feel inspiring, straightforward, and entirely yours. Take the next step with confidence.</p><a href="#register" class="editorial-link">Get started <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div></section>`;
    const render=async(params= {
    }
    )=> {
        try {
            const items=await api('/properties?'+new URLSearchParams(params));
            document.querySelector('#count').textContent=`${items.length
        }
        properties`;
        document.querySelector('#properties').innerHTML=items.map(card).join('')||'<div class="empty-state"><h3>Nothing here just yet.</h3><p>Try adjusting your filters.</p></div>';
        activateTilt()
    }
    catch(e) {
        error(e)
    }
}
;
document.querySelector('#search').onsubmit=e=> {
    e.preventDefault();
    render(Object.fromEntries(new FormData(e.target)))
}
;
for(const [key,value] of Object.entries(initialFilters)) {
    const field=document.querySelector(`#search [name="${key
}
"]`);
if(field)field.value=value
}
await render(initialFilters);
initHeroMotion();
initArchitectureMotion()
}
function activateTilt() {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(pointer: coarse)').matches)return;
    document.querySelectorAll('.property').forEach(card=> {
        card.addEventListener('pointermove',e=> {
            const r=card.getBoundingClientRect(); card.style.setProperty('--rx',(-((e.clientY-r.top)/r.height-.5)*5)+'deg'); card.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*6)+'deg')
        }
        ); card.addEventListener('pointerleave',()=> {
            card.style.setProperty('--rx','0deg'); card.style.setProperty('--ry','0deg')
        }
        )
    }
    )
}
function initHeroMotion() {
    const hero=document.querySelector('.find-hero');
    if(!hero||matchMedia('(prefers-reduced-motion: reduce)').matches||matchMedia('(pointer: coarse)').matches)return;
    hero.addEventListener('pointermove',e=> {
        const r=hero.getBoundingClientRect(); hero.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5)*14+'px'); hero.style.setProperty('--my',((e.clientY-r.top)/r.height-.5)*9+'px')
    }
    );
    hero.addEventListener('pointerleave',()=> {
        hero.style.setProperty('--mx','0px'); hero.style.setProperty('--my','0px')
    }
    )
}
async function detail(id) {
    const p=await api('/properties/'+id);
    app.innerHTML=`<div class="container"><a href="#home" class="muted back-link"><i class="fa-solid fa-arrow-left"></i> Back to properties</a><div class="sectionhead"><div><div class="eyebrow">${esc(p.listing_type)
}
· ${esc(p.property_type)
}
</div><h2>${esc(p.title)
}
</h2><p class="muted">${esc(p.address)
}
, ${esc(p.area)
}
, ${esc(p.city)
}
</p></div><strong class="price">${money(p.price)
}
</strong></div><div class="gallery public-photo-gallery">${p.photos.map((url,i)=>`<button type="button" class="public-photo-trigger" data-public-photo="${i
}
" aria-label="Enlarge property photo ${i+1
}
"><img src="${esc(url)
}
" alt="${esc(p.title)
}
photo ${i+1
}
" loading="lazy"><span><i class="fa-solid fa-expand"></i></span></button>`).join('')
}
</div><div class="detail"><div class="panel"><h2>About this property</h2><p class="muted">${esc(p.description)
}
</p></div><div class="panel"><h2>Enquire now</h2><p class="muted">Your message goes to the company team, not directly to the owner.</p><form class="stack" id="enquire"><input name="name" placeholder="Full name" required minlength="2"><input type="email" name="email" placeholder="Email address" required><input name="phone" placeholder="Contact number" required minlength="8"><textarea name="message" placeholder="I'm interested in this property..." required minlength="10"></textarea><button class="btn"><i class="fa-regular fa-paper-plane"></i> Send enquiry</button></form></div></div></div>`;
document.querySelector('.public-photo-gallery')?.addEventListener('click',e=> {
    const button=e.target.closest('[data-public-photo]'); if(button)openPhotoViewer(p.photos,Number(button.dataset.publicPhoto),p.title)
}
);
document.querySelector('#enquire').onsubmit=async e=> {
    e.preventDefault();
    try {
        await api('/enquiries', {
            method:'POST',body: {
                ...Object.fromEntries(new FormData(e.target)),property_id:Number(id)
            }
        }
        );
        notice('Enquiry sent! Our team will contact you.');
        e.target.reset()
    }
    catch(e) {
        error(e)
    }
}
}
function closeAuth() {
    const overlay=document.querySelector('#authOverlay');
    if(overlay) {
        overlay.remove();
        document.body.classList.remove('modal-open')
    }
}
function openAuth(startRegister=false) {
    closeAuth();
    const overlay=document.createElement('div');
    overlay.id='authOverlay';
    overlay.className='auth-overlay';
    overlay.innerHTML=`<div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle"><button type="button" class="auth-close" id="closeAuth" aria-label="Close dialog"><i class="fa-solid fa-xmark"></i></button><div class="auth-art"><div class="auth-art-copy"><span>FIND REAL ESTATE</span><h2>Make room for<br>what's next.</h2><p>Your next address starts here.</p></div></div><div class="auth-content"><div class="auth-brand">FIND<span>.</span> <small>MEMBER ACCESS</small></div><form id="authform" class="modal-form"><h2 id="authTitle">Welcome back</h2><p id="authMessage">Sign in to your FIND account.</p><div id="registerfields" class="auth-fields hidden"><div class="auth-name-row"><label>First name<input name="firstName" type="text" placeholder="e.g. Aarav" autocomplete="given-name" maxlength="70"></label><label>Last name<input name="lastName" type="text" placeholder="e.g. Shah" autocomplete="family-name" maxlength="70"></label></div><label>Account type<select name="role"><option value="customer">Customer</option><option value="owner">Property owner</option></select></label></div><label>Email address<input name="email" type="email" placeholder="you@example.com" autocomplete="email" required></label><label>Password<input name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required minlength="10"></label><label id="confirmField" class="hidden">Confirm password<input name="confirmPassword" type="password" placeholder="Re-enter your password" autocomplete="new-password"></label><div id="authError" class="auth-error hidden" role="alert" aria-live="assertive"></div><button class="modal-submit" id="authSubmit" type="submit">Sign in <i class="fa-solid fa-arrow-right"></i></button><p class="auth-switch" id="authSwitch"></p></form><div class="modal-trust"><i class="fa-solid fa-lock"></i> Secure account access</div></div></div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    let reg=false;
    const form=overlay.querySelector('#authform');
    function setMode(v) {
        reg=v;
        const errorBox=overlay.querySelector('#authError');
        errorBox.textContent='';
        errorBox.classList.add('hidden');
        overlay.querySelector('#registerfields').classList.toggle('hidden',!v);
        overlay.querySelector('#confirmField').classList.toggle('hidden',!v);
        overlay.querySelector('#authTitle').textContent=v?'Create your account':'Welcome back';
        overlay.querySelector('#authMessage').textContent=v?'Join FIND to explore or list properties.':'Sign in to your FIND account.';
        overlay.querySelector('#authSubmit').innerHTML=v?'Create account <i class="fa-solid fa-arrow-right"></i>':'Sign in <i class="fa-solid fa-arrow-right"></i>';
        overlay.querySelector('#authSwitch').innerHTML=v?'Already have an account? <button type="button" id="toggleAuth">Sign in</button>':'New to FIND? <button type="button" id="toggleAuth">Create an account</button>';
        overlay.querySelector('#toggleAuth').onclick=()=>setMode(!reg);
        form.elements.firstName.required=v;
        form.elements.lastName.required=v;
        form.elements.confirmPassword.required=v;
        form.elements.password.autocomplete=v?'new-password':'current-password'
    }
    function showAuthError(message) {
        const box=overlay.querySelector('#authError');
        box.textContent=message;
        box.classList.remove('hidden');
    }
    form.addEventListener('input',()=> {
        const box=overlay.querySelector('#authError'); box.textContent=''; box.classList.add('hidden')
    }
    );
    setMode(startRegister);
    overlay.querySelector('#closeAuth').onclick=closeAuth;
    overlay.addEventListener('click',e=> {
        if(e.target===overlay)closeAuth()
    }
    );
    overlay.querySelector('input[name=email]').focus();
    form.onsubmit=async e=> {
        e.preventDefault();
        const errorBox=overlay.querySelector('#authError');
        errorBox.textContent='';
        errorBox.classList.add('hidden');
        const data=Object.fromEntries(new FormData(form));
        if(reg) {
            if(data.password!==data.confirmPassword)return showAuthError('Passwords do not match. Please try again.');
            data.name=(data.firstName+' '+data.lastName).trim();
            if(data.name.length<2)return showAuthError('Please enter your full name.')
        }
        delete data.firstName;
        delete data.lastName;
        delete data.confirmPassword;
        const button=overlay.querySelector('#authSubmit');
        button.disabled=true;
        try {
            await api(reg?'/auth/register':'/auth/login', {
                method:'POST',body:data
            }
            );
            await loadUser();
            closeAuth();
            location.hash=me.role==='owner'?'#owner':['admin','root'].includes(me.role)?'#admin':'#home';
            route();
            notice('Welcome to FIND')
        }
        catch(err) {
            const msg=String(err.message||'');
            showAuthError(/Invalid credentials/i.test(msg)?'Email or password is incorrect. Please try again.':/Email already registered/i.test(msg)?'This email is already registered. Please sign in instead.':/Invalid registration details/i.test(msg)?'Please check your details. Password must be at least 10 characters.':/Too many requests|rate limit/i.test(msg)?'Too many attempts. Please try again in 15 minutes.':/Failed to fetch|NetworkError/i.test(msg)?'Connection failed. Please check your internet and try again.':msg||'Something went wrong. Please try again.')
        }
        finally {
            button.disabled=false
        }
    }
}
window.addEventListener('keydown',e=> {
    if(e.key==='Escape')closeAuth()
}
);

function editPhotosMarkup(p) {
    return `<section class="edit-photo-section wide"><div class="edit-photo-heading"><div><h3><i class="fa-regular fa-images"></i> Property photos</h3><p>Manage images while editing this property. Photo changes send approved listings back to draft.</p></div><span id="editPhotoCount">${p.photos.length
}
/ 8</span></div><div class="edit-photo-grid" id="editPhotoGrid">${p.photos.map(url=>`<div class="edit-photo-tile"><img src="${esc(url)
}
" alt="Property image"><button type="button" data-edit-remove="${esc(url)
}
" aria-label="Remove this photo"><i class="fa-solid fa-trash-can"></i></button></div>`).join('')
}
</div><label class="edit-photo-upload"><i class="fa-solid fa-cloud-arrow-up"></i><span>Add property images</span><small>JPG, PNG or WebP · up to 8 photos · 8 MB each</small><input id="editPhotoInput" type="file" multiple accept="image/jpeg,image/png,image/webp"></label><p id="editPhotoFeedback" class="edit-photo-feedback" role="status" aria-live="polite"></p></section>`
}
function bindEditPhotos(p,form) {
    const feedback=form.querySelector('#editPhotoFeedback');
    let urls=[...p.photos];
    form._previewExistingPhotos=()=>[...urls];
    let busy=false;
    const refresh=()=> {
        form.querySelector('#editPhotoCount').textContent=`${urls.length
    }
    / 8`;
    form.querySelector('#editPhotoGrid').innerHTML=urls.map(url=>`<div class="edit-photo-tile"><img src="${esc(url)
}
" alt="Property image"><button type="button" data-edit-remove="${esc(url)
}
" aria-label="Remove this photo"><i class="fa-solid fa-trash-can"></i></button></div>`).join('');
}
;
form.querySelector('#editPhotoInput').addEventListener('change',async e=> {
    if(busy)return; const files=[...e.target.files]; if(!files.length)return; if(urls.length+files.length>8) {
        feedback.textContent='Maximum 8 photos per property.'; e.target.value=''; return;
    }
    busy=true; for(let i=0; i<files.length; i++) {
        const file=files[i]; if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024) {
            feedback.textContent='Only JPG, PNG or WebP under 8 MB allowed.'; break;
        }
        feedback.textContent=`Uploading photo ${i+1
    }
    of ${files.length
}
…`; const fd=new FormData(); fd.append('photo',file); try {
    const result=await api('/owner/properties/'+p.id+'/photos', {
        method:'POST',body:fd
    }
    ); urls=result.photos||urls; refresh(); feedback.textContent=`${i+1
}
of ${files.length
}
uploaded successfully.`;
}
catch(err) {
    feedback.textContent=err.message; break;
}
}
busy=false; e.target.value='';
}
);
form.querySelector('#editPhotoGrid').addEventListener('click',async e=> {
    const b=e.target.closest('[data-edit-remove]'); if(!b||busy)return; const url=b.dataset.editRemove; if(!await findConfirm( {
        title:'Remove property photo?',message:'Remove this photo? Your property will return to draft and require approval again.',confirmText:'Remove photo',danger:true
    }
    ))return; busy=true; b.disabled=true; try {
        const result=await api('/owner/properties/'+p.id+'/photos', {
            method:'DELETE',body: {
                url
            }
        }
        ); urls=result.photos||urls.filter(x=>x!==url); refresh(); feedback.textContent='Photo removed successfully.';
    }
    catch(err) {
        feedback.textContent=err.message; b.disabled=false;
    }
    finally {
        busy=false
    }
}
);
}

const propertyFields=p=>`<div class="formgrid"><label>Property title<input placeholder="e.g. Spacious 3 BHK in Satellite" name="title" required minlength="2" value="${esc(p?.title||'')
}
"></label><label>Listing type<select name="listing_type"><option value="sale" ${p?.listing_type==='sale'?'selected':''
}
>For sale</option><option value="rent" ${p?.listing_type==='rent'?'selected':''
}
>For rent</option></select></label><label>Property type<select name="property_type">${['apartment','house','villa','plot','commercial'].map(t=>`<option ${p?.property_type===t?'selected':''
}
>${t
}
</option>`).join('')
}
</select></label><label>Price (INR)<input placeholder="Enter amount in ₹" type="number" min="1" name="price" required value="${esc(p?.price||'')
}
"></label><label>City<input placeholder="e.g. Ahmedabad" name="city" required value="${esc(p?.city||'')
}
"></label><label>Area<input placeholder="e.g. Satellite" name="area" required value="${esc(p?.area||'')
}
"></label><label class="wide">Full address<input placeholder="Building, street and locality" name="address" required value="${esc(p?.address||'')
}
"></label><label class="wide">Description<textarea placeholder="Describe the property, its highlights and amenities" name="description" required minlength="20">${esc(p?.description||'')
}
</textarea></label></div>`;
async function owner() {
    if(!['owner','root'].includes(me?.role)) {
        if(!me)return openAuth(false);
        notice('Only property owners can manage listings');
        location.hash='#home';
        return
    }
    const items=await api('/owner/properties');
    app.innerHTML=`<div class="container owner-studio"><header class="owner-studio-header"><div><div class="owner-studio-kicker"><span class="studio-pulse"></span> YOUR PROPERTY STUDIO</div><h1>Spaces worth <em>sharing.</em></h1><p>Create, refine and submit your properties for review — all in one place.</p></div><div class="studio-count"><strong>${items.length}</strong><span>${items.length===1?'LISTING':'LISTINGS'} IN YOUR SPACE</span></div></header><div class="dashgrid owner-studio-grid"><div class="panel studio-editor"><div class="studio-card-heading"><div class="studio-card-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div><div><div class="studio-step">01 / PROPERTY DETAILS</div><h2 id="formtitle">Create property</h2><p>Make your listing stand out with the right details.</p></div></div><form id="propform" class="stack">${propertyFields()
}
<div class="owner-create-media"><div class="studio-media-heading"><div><div class="studio-step">02 / THE VISUAL STORY</div><h3>Property gallery</h3><p>Add up to 8 images. Each image can be up to 8 MB.</p></div><span class="studio-media-count"><i class="fa-regular fa-images"></i> JPG · PNG · WEBP</span></div><label class="studio-upload-zone" for="createPhotos"><input type="file" id="createPhotos" accept="image/jpeg,image/png,image/webp" multiple><span class="studio-upload-symbol"><i class="fa-solid fa-arrow-up-from-bracket"></i></span><strong>Choose your best angles</strong><span>Click to browse photos from your device</span><span class="studio-upload-action">Select photos <i class="fa-solid fa-arrow-right"></i></span></label><div id="createPhotoPreview" class="edit-photo-grid" aria-live="polite"></div></div><div class="owner-form-actions"><button type="button" class="btn secondary" id="previewProperty"><i class="fa-regular fa-eye"></i> Preview listing</button><button class="btn"><i class="fa-regular fa-floppy-disk"></i> Save draft & photos</button></div></form><div class="studio-editor-foot"><i class="fa-solid fa-shield-halved"></i> Drafts are private until approved by an administrator.</div></div><div class="panel studio-library"><div class="studio-library-header"><div><div class="studio-step">YOUR COLLECTION</div><h2>Your properties</h2><p>Track every listing from draft to approval.</p></div><span class="studio-library-total">${items.length.toString().padStart(2,'0')}</span></div><div id="myitems">${items.map(p=>`<div class="item"><div class="row between"><h3>${esc(p.title)
}
</h3><span class="status-pill status-${esc(p.status)
}
">${esc(p.status)
}
</span></div><p class="muted">${esc(p.city)
}
· ${money(p.price)
}
· ${p.photos.length
}
/8 photos</p>${p.photos.length?`<div class="owner-photos">${p.photos.map(url=>`<div class="owner-photo-tile"><img src="${esc(url)
}
" alt="Uploaded property photo" loading="lazy"></div>`).join('')
}
</div>`:''
}
<div class="upload-status" id="upload-status-${p.id
}
" aria-live="polite"></div>${p.rejection_reason?`<p class="muted">Review note: ${esc(p.rejection_reason)
}
</p>`:''
}
${['draft','rejected','approved'].includes(p.status)?`<button class="btn small secondary" data-edit="${p.id
}
">Edit</button>${p.status!=='approved'?`<button class="btn small" data-submit="${p.id
}
">Submit for review</button>`:''
}
`:''
}
</div>`).join('')||'<div class="studio-empty"><div class="studio-empty-art"><i class="fa-solid fa-building-circle-check"></i><span class="studio-empty-orbit"></span></div><strong>A blank canvas, for now.</strong><p>Your first property will appear here once you save it.</p><span><i class="fa-solid fa-arrow-left"></i> Start with the details on the left</span></div>'
}
</div></div></div></div>`;
let editId=null;
const form=document.querySelector('#propform');
let selectedPhotos=[];
const photosInput=form.querySelector('#createPhotos');
const updateSelectedPhotos=()=> {
    const holder=form.querySelector('#createPhotoPreview');
    if(!holder)return;
    holder.replaceChildren();
    for(const [i,file] of selectedPhotos.entries()) {
        const tile=document.createElement('div');
        tile.className='edit-photo-tile';
        const picture=document.createElement('img');
        picture.alt=`Selected photo ${i+1
    }
    `;
    const objectUrl=URL.createObjectURL(file);
    picture.src=objectUrl;
    picture.onload=()=>URL.revokeObjectURL(objectUrl);
    const remove=document.createElement('button');
    remove.type='button';
    remove.setAttribute('aria-label',`Remove selected photo ${i+1
}
`);
remove.innerHTML='<i class="fa-solid fa-xmark"></i>';
remove.onclick=()=> {
    selectedPhotos.splice(i,1);
    updateSelectedPhotos()
}
;
tile.append(picture,remove);
holder.append(tile)
}
}
;
photosInput?.addEventListener('change',e=> {
    const incoming=[...e.target.files]; if(selectedPhotos.length+incoming.length>8) {
        notice('Maximum 8 photos per listing','error'); e.target.value=''; return
    }
    for(const f of incoming) {
        if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024) {
            notice('Photos must be JPG, PNG or WebP under 8 MB','error'); e.target.value=''; return
        }
    }
    selectedPhotos.push(...incoming); updateSelectedPhotos(); e.target.value=''
}
);
const showOwnerPreview=()=> {
    // Use the current editor state, not just the last saved database snapshot.
    const values=Object.fromEntries(new FormData(form));
    const current=editId?items.find(p=>p.id===editId):null;
    const existing=form._previewExistingPhotos?.() ?? current?.photos ?? [];
    const overlay=document.createElement('div');
    overlay.className='find-confirm-overlay';
    overlay.id='ownerPreviewOverlay';
    overlay.innerHTML=`<section class="owner-preview-dialog" role="dialog" aria-modal="true" aria-label="Property preview">
      <div class="row between"><h2>Customer listing preview</h2><button type="button" class="btn secondary small" data-close-preview aria-label="Close preview"><i class="fa-solid fa-xmark"></i> Close</button></div>
      <div class="owner-preview-gallery" id="ownerPreviewGallery" aria-label="Property images"></div>
      <p class="eyebrow">${esc(values.listing_type||'sale')} · ${esc(values.property_type||'house')}</p>
      <h2>${esc(values.title||'Untitled property')}</h2>
      <strong>${values.price?money(values.price):'Price not set'}</strong>
      <p>${esc(values.area||'')}, ${esc(values.city||'')}</p>
      <p>${esc(values.description||'Description will appear here.')}</p>
      <p class="muted">Preview only — not publicly listed until approved.</p>
    </section>`;
    document.body.append(overlay);
    const gallery=overlay.querySelector('#ownerPreviewGallery');
    const temporaryUrls=[];
    const sources=[...existing.map(src=>({src})), ...selectedPhotos.map(file=>{
        const src=URL.createObjectURL(file);
        temporaryUrls.push(src);
        return {src};
    })];
    if(sources.length) {
        const main=document.createElement('img');
        main.className='owner-preview-main-image';
        main.alt='Property preview photo';
        main.src=sources[0].src;
        gallery.append(main);
        if(sources.length>1) {
            const strip=document.createElement('div');
            strip.className='owner-preview-thumbnails';
            sources.forEach(({src},i)=>{
                const thumb=document.createElement('button');
                thumb.type='button';
                thumb.className='owner-preview-thumb'+(i===0?' active':'');
                thumb.setAttribute('aria-label',`Show photo ${i+1}`);
                const img=document.createElement('img');
                img.src=src;
                img.alt=`Property photo ${i+1}`;
                thumb.append(img);
                thumb.onclick=()=>{
                    main.src=src;
                    strip.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
                    thumb.classList.add('active');
                };
                strip.append(thumb);
            });
            gallery.append(strip);
        }
    } else {
        gallery.innerHTML='<div class="owner-preview-empty"><i class="fa-regular fa-image"></i><span>Choose property photos to preview them here</span></div>';
    }
    const close=()=>{
        document.removeEventListener('keydown',onKey);
        temporaryUrls.forEach(url=>URL.revokeObjectURL(url));
        overlay.remove();
    };
    const onKey=e=>{if(e.key==='Escape')close()};
    document.addEventListener('keydown',onKey);
    overlay.onclick=e=>{if(e.target===overlay||e.target.closest('[data-close-preview]'))close()};
    overlay.querySelector('[data-close-preview]').focus();
};
form.querySelector('#previewProperty')?.addEventListener('click',showOwnerPreview);
document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=> {
    const p=items.find(x=>x.id===Number(b.dataset.edit)); editId=p.id; form.innerHTML=propertyFields(p)+editPhotosMarkup(p)+'<div class="owner-form-actions"><button type="button" class="btn secondary" id="previewProperty"><i class="fa-regular fa-eye"></i> Preview listing</button><button class="btn"><i class="fa-solid fa-floppy-disk"></i> Save changes</button></div>'; form.querySelector('#previewProperty')?.addEventListener('click',showOwnerPreview); bindEditPhotos(p,form); document.querySelector('#formtitle').textContent='Edit property'; window.scrollTo( {
        top:0,behavior:'smooth'
    }
    )
}
);
form.onsubmit=async e=> {
    e.preventDefault();
    const submit=form.querySelector('button[type="submit"],button.btn:not([type])');
    if(submit)submit.disabled=true;
    try {
        const fields=Object.fromEntries(new FormData(form));
        delete fields.photo;
        delete fields.createPhotos;
        const saved=await api(editId?'/owner/properties/'+editId:'/owner/properties', {
            method:editId?'PATCH':'POST',body:fields
        }
        );
        let failures=0;
        for(const file of selectedPhotos) {
            const data=new FormData();
            data.append('photo',file);
            try {
                await api('/owner/properties/'+saved.id+'/photos', {
                    method:'POST',body:data
                }
                )
            }
            catch(err) {
                failures++;
                notice(`Photo upload failed: ${err.message
            }
            `,'error')
        }
    }
    notice(failures?'Draft saved, but some photos failed. Edit the listing to retry.':'Draft and photos saved');
    await owner();
}
catch(err) {
    error(err);
    if(submit)submit.disabled=false
}
}
;
document.querySelectorAll('[data-upload]').forEach(el=>el.onchange=async()=> {
    const files=Array.from(el.files||[]); if(!files.length)return; const status=document.getElementById('upload-status-'+el.dataset.upload); const parent=el.closest('.item'); let uploaded=0; const existing=items.find(p=>p.id===Number(el.dataset.upload))?.photos.length||0; if(files.length+existing>8) {
        notice('Maximum 8 photos per property'); el.value=''; return
    }
    for(let i=0; i<files.length; i++) {
        const file=files[i]; if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024) {
            notice('Only JPG, PNG or WebP files under 8 MB'); break
        }
        status.textContent=`Uploading ${i+1
    }
    of ${files.length
}
: ${file.name
}
`; parent.classList.add('uploading'); const data=new FormData(); data.append('photo',file); try {
    await api('/owner/properties/'+el.dataset.upload+'/photos', {
        method:'POST',body:data
    }
    ); uploaded++
}
catch(e) {
    status.textContent='Upload failed: '+e.message; notice(e.message); break
}
}
parent.classList.remove('uploading'); el.value=''; if(uploaded) {
    notice(`${uploaded
}
photo${uploaded>1?'s':''
}
uploaded successfully`); owner()
}
}
);
document.querySelectorAll('[data-remove-photo]').forEach(b=>b.onclick=async()=> {
    if(!await findConfirm( {
        title:'Remove property photo?',message:'This image will be removed and the listing will return to draft for another review.',confirmText:'Remove photo',danger:true
    }
    ))return; b.disabled=true; try {
        await api('/owner/properties/'+b.dataset.removePhoto+'/photos', {
            method:'DELETE',body: {
                url:b.dataset.photoUrl
            }
        }
        ); notice('Photo removed from listing'); await owner()
    }
    catch(e) {
        b.disabled=false; error(e)
    }
}
);
document.querySelectorAll('[data-submit]').forEach(b=>b.onclick=async()=> {
    try {
        await api('/owner/properties/'+b.dataset.submit+'/submit', {
            method:'POST'
        }
        ); notice('Submitted for review'); owner()
    }
    catch(e) {
        error(e)
    }
}
)
}
async function admin() {
    if(!['admin','root'].includes(me?.role)) {
        notice('Administrator access required');
        location.hash='#home';
        return
    }
    const [props,enquiries]=await Promise.all([api('/admin/properties'),api('/admin/enquiries')]);
    const statusTag=(status)=>`<span class="status-pill status-${esc(status)
}
"><i class="fa-solid fa-circle" aria-hidden="true"></i>${esc(status)
}
</span>`;
app.innerHTML=`<div class="container admin-workspace"><div class="admin-heading"><div><div class="eyebrow">ADMINISTRATION / WORKSPACE</div><h2>Review & enquiries</h2><p class="muted">Review submissions, protect listing quality and manage customer conversations.</p></div>${me.role==='root'?'<a class="btn secondary small" href="#root"><i class="fa-solid fa-shield-halved"></i> Root control center</a>':''
}
</div><div class="admin-toolbar"><a href="#enquiry-history" class="btn secondary"><i class="fa-solid fa-clock-rotate-left"></i> Saved enquiry logs</a></div><div class="admin-overview"><div><span>Awaiting review</span><strong>${props.filter(p=>p.status==='pending').length
}
</strong></div><div><span>Approved listings</span><strong>${props.filter(p=>p.status==='approved').length
}
</strong></div><div><span>New enquiries</span><strong>${enquiries.filter(e=>e.status==='new').length
}
</strong></div></div><div class="admin-columns"><section class="panel admin-section"><div class="admin-section-heading"><div><span class="eyebrow">LISTING MODERATION</span><h2>Property review</h2></div><span class="admin-count">${props.length
}
listings</span></div><div class="admin-list">${props.map(p=>`<article class="admin-card"><div class="admin-card-title"><h3>${esc(p.title)
}
</h3>${statusTag(p.status)
}
</div><p class="admin-meta"><i class="fa-regular fa-user"></i> ${esc(p.owner_name)
}
<span>·</span> ${esc(p.city)
}
<span>·</span> ${money(p.price)
}
<span>·</span> ${p.photos.length
}
photos</p>${photoStrip(p)
}
<p class="admin-description">${esc(p.description)
}
</p>${p.rejection_reason?`<p class="review-reason"><i class="fa-solid fa-circle-info"></i> ${esc(p.rejection_reason)
}
</p>`:''
}
${p.status==='pending'?`<label class="admin-field-label" for="reason${p.id
}
">Review note (required for rejection)</label><textarea class="admin-review-note" id="reason${p.id
}
" rows="2" maxlength="1000" placeholder="Explain the reason if rejecting"></textarea><div class="admin-actions"><button class="btn small" data-review="${p.id
}
" data-status="approved"><i class="fa-solid fa-check"></i> Approve</button><button class="btn small secondary" data-review="${p.id
}
" data-status="rejected"><i class="fa-solid fa-xmark"></i> Reject</button></div>`:''
}
<div class="admin-card-footer"><button type="button" class="btn small danger admin-delete" data-delete-property="${p.id
}
"><i class="fa-regular fa-trash-can"></i> Delete listing</button></div></article>`).join('')||'<div class="admin-empty">No listings to review yet.</div>'
}
</div></section><section class="panel admin-section"><div class="admin-section-heading"><div><span class="eyebrow">CUSTOMER RELATIONS</span><h2>Customer enquiries</h2></div><span class="admin-count">${enquiries.filter(e=>e.status==='new').length
}
new enquiries</span></div><div class="admin-list">${enquiries.filter(e=>e.status==='new').map(e=>`<article class="admin-card enquiry-card"><div class="admin-card-title"><h3>${esc(e.property_title)
}
</h3>${statusTag(e.status)
}
</div><p class="admin-meta"><i class="fa-solid fa-location-dot"></i> Property #${e.property_id
}
· ${esc(e.property_area)
}
, ${esc(e.property_city)
}
· ${esc(e.property_listing_type)
}
</p><div class="enquiry-contact"><strong>${esc(e.name)
}
</strong><a href="mailto:${encodeURIComponent(e.email)
}
">${esc(e.email)
}
</a><a href="tel:${esc(e.phone)
}
">${esc(e.phone)
}
</a></div><p class="enquiry-message">${esc(e.message)
}
</p><div class="admin-form"><label for="status${e.id
}
">Enquiry status</label><select id="status${e.id
}
">${['contacted','closed'].map(status=>`<option value="${status
}
" ${(e.status==='new'?status==='contacted':e.status===status)?'selected':''
}
>${status==='new'?'New enquiry':status==='contacted'?'Contacted':'Closed'
}
</option>`).join('')
}
</select><label for="notes${e.id
}
">Internal notes <small>(admin only)</small></label><textarea id="notes${e.id
}
" rows="3" maxlength="3000" placeholder="Add a follow-up note for your team">${esc(e.internal_notes||'')
}
</textarea><button class="btn small" data-enquiry="${e.id
}
"><i class="fa-regular fa-floppy-disk"></i> Save enquiry</button></div></article>`).join('')||'<div class="admin-empty">No customer enquiries yet.</div>'
}
</div></section></div></div>`;
document.querySelectorAll('[data-review]').forEach(b=>b.onclick=async()=> {
    const id=b.dataset.review,status=b.dataset.status,reason=document.getElementById('reason'+id)?.value.trim()||''; if(status==='rejected'&&!reason) {
        notice('Please enter a reason before rejecting this property'); document.getElementById('reason'+id)?.focus(); return
    }
    b.disabled=true; try {
        await api('/admin/properties/'+id+'/review', {
            method:'PATCH',body: {
                status,reason
            }
        }
        ); notice(`Property ${status
    }
    `); await admin()
}
catch(e) {
    b.disabled=false; error(e)
}
}
);
document.querySelectorAll('[data-delete-property]').forEach(b=>b.onclick=async()=> {
    const id=Number(b.dataset.deleteProperty),property=props.find(p=>p.id===id); if(!property)return; if(!await findConfirm( {
        title:"Delete property listing?",message:`Permanently delete "${property.title
    }
    " and its related enquiries? This cannot be undone.`,confirmText:"Delete listing",danger:true
}
))return; b.disabled=true; try {
    const result=await api('/admin/properties/'+id, {
        method:'DELETE'
    }
    ); notice(`Listing deleted (${result.deletedEnquiries
}
related enquiries removed)`); await admin()
}
catch(e) {
    b.disabled=false; error(e)
}
}
);
document.querySelectorAll('[data-enquiry]').forEach(button => {
    button.addEventListener('click', async () => {
        // Scope inputs to the clicked card. Formatted HTML may contain whitespace
        // in generated IDs, so global getElementById() is unreliable here.
        const card = button.closest('.enquiry-card');
        const statusField = card?.querySelector('.admin-form select');
        const notesField = card?.querySelector('.admin-form textarea');
        const id = button.dataset.enquiry?.trim();
        const status = statusField?.value?.trim().toLowerCase();
        const notes = notesField?.value ?? '';

        if (!id || !statusField || !notesField) {
            error(new Error('Enquiry form could not be read. Refresh and try again.'));
            return;
        }
        if (!['contacted', 'closed'].includes(status)) {
            error(new Error('Choose Contacted or Closed before saving.'));
            statusField.focus();
            return;
        }
        if (notes.length > 3000) {
            error(new Error('Internal notes cannot exceed 3000 characters.'));
            notesField.focus();
            return;
        }

        button.disabled = true;
        try {
            await api('/admin/enquiries/' + encodeURIComponent(id), {
                method: 'PATCH',
                body: { status, notes }
            });
            // The server stores status + notes and writes an activity record.
            // Reloading admin() removes this item from the 'new' inbox.
            await admin();
            notice('Enquiry saved. View it in Enquiry logs.');
        } catch (err) {
            button.disabled = false;
            error(err);
        }
    });
});
}

async function enquiryHistory() {
    if(!['admin','root'].includes(me?.role)) {
        location.hash='#home';
        return
    }
    const [enquiries,logs]=await Promise.all([api('/admin/enquiries'),api('/admin/enquiry-history')]);
    const archived=enquiries.filter(e=>e.status!=='new');
    const pill=status=>`<span class="status-pill status-${esc(status)
}
">${esc(status)
}
</span>`;
const date=value=> {
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'—':esc(d.toLocaleString('en-IN', {
        day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'
    }
    ))
}
;
const groups=archived.map(e=>( {
    e,events:logs.filter(l=>String(l.enquiry_id)===String(e.id))
}
));
const folders=groups.map(( {
    e,events
}
)=>`<details class="enquiry-folder"><summary class="enquiry-folder-summary"><span class="enquiry-folder-icon"><i class="fa-regular fa-folder-closed"></i></span><span class="enquiry-folder-label"><strong>${esc(e.property_title)
}
</strong><small>${esc(e.name)
}
· Enquiry #${esc(e.id)
}
</small></span>${pill(e.status)
}
<span class="enquiry-folder-count">${events.length
}
updates</span><i class="fa-solid fa-chevron-down enquiry-folder-chevron"></i></summary><div class="enquiry-folder-body"><div class="enquiry-folder-details"><div><span>Customer</span><strong>${esc(e.name)
}
</strong></div><div><span>Email</span><a href="mailto:${esc(e.email)
}
">${esc(e.email)
}
</a></div><div><span>Phone</span><a href="tel:${esc(e.phone)
}
">${esc(e.phone)
}
</a></div></div><div class="enquiry-folder-message"><span>Enquiry message</span><p>${esc(e.message)
}
</p></div>${e.internal_notes?`<div class="enquiry-folder-message"><span>Internal notes</span><p>${esc(e.internal_notes)
}
</p></div>`:''
}
<div class="enquiry-folder-timeline"><span class="enquiry-folder-timeline-title">Activity history</span>${events.map(l=>`<div class="enquiry-folder-event"><i class="fa-solid fa-circle-check"></i><div><strong>${esc(l.previous_status||'new')
}
→ ${esc(l.status)
}
</strong><small>${esc(l.actor_name||'Administrator')
}
· ${date(l.created_at)
}
</small>${l.notes?`<p>${esc(l.notes)
}
</p>`:''
}
</div></div>`).join('')||'<p class="enquiry-folder-empty">No recorded changes for this enquiry.</p>'
}
</div></div></details>`).join('');
app.innerHTML=`<div class="container admin-workspace enquiry-folder-workspace"><div class="admin-heading"><div><div class="eyebrow">ADMINISTRATION / CUSTOMER RELATIONS</div><h2>Enquiry logs</h2><p class="muted">Saved enquiries organised by property. Select a folder to view details and activity.</p></div><a href="#admin" class="btn secondary small"><i class="fa-solid fa-arrow-left"></i> Active enquiries</a></div><section class="enquiry-folder-panel"><div class="enquiry-folder-panel-heading"><h3><i class="fa-regular fa-folder-open"></i> Saved enquiries</h3><span>${archived.length
}
${archived.length===1?'folder':'folders'
}
</span></div><div class="enquiry-folder-list">${folders||'<div class="enquiry-folder-empty">No saved enquiries yet.</div>'
}
</div></section></div>`;
}
async function rootPanel() {
    if(me?.role!=='root') {
        notice('Administrator access required');
        return home()
    }
    const [users,stats]=await Promise.all([api('/root/users'),api('/root/stats')]);
    const roles= {
        customer:'Customer',owner:'Property owner',admin:'Administrator',root:'Administrator'
    }
    ;
    app.innerHTML=`<div class="container access-workspace"><div class="eyebrow">ADMINISTRATION / ACCESS</div><div class="access-heading"><div><h2>User access management</h2><p class="muted">Manage permissions and accounts across the platform.</p></div><a href="#admin" class="btn secondary small"><i class="fa-solid fa-clipboard-check"></i> Review & enquiries</a></div><div class="statrow"><div class="stat"><b>${stats.users
}
</b><span>Registered users</span></div><div class="stat"><b>${stats.properties.reduce((n,x)=>n+x.n,0)
}
</b><span>Properties</span></div><div class="stat"><b>${stats.enquiries
}
</b><span>Enquiries</span></div></div><section class="panel access-panel access-directory-v2"><div class="access-list-heading"><div><span class="eyebrow">ACCOUNT DIRECTORY</span><h3>People & permissions</h3><p class="access-directory-subtitle">Manage who can access your workspace.</p></div><span class="access-count">${users.length
}
accounts</span></div><div class="access-list">${users.map(u=>`<article class="access-user access-member-row"><div class="access-person"><span class="access-avatar">${esc(initials(u.name))
}
</span><div class="access-identity"><strong>${esc(u.role==='root'?'Administrator':u.name)
}
</strong><span>${esc(u.email)
}
</span><small>Member #${u.id
}
</small></div></div><div class="access-actions access-member-actions"><span class="access-role access-role-${esc(u.role)
}
"><i class="fa-solid ${u.role==='root'?'fa-shield-halved':u.role==='admin'?'fa-user-shield':u.role==='owner'?'fa-building': 'fa-user'
}
"></i> ${roles[u.role]||esc(u.role)
}
</span>${u.role==='root'?'<span class="access-protected"><i class="fa-solid fa-lock"></i> Protected</span>':`<button type="button" class="btn small access-edit" title="Edit account permissions" aria-label="Edit account permissions" data-edit-access="${u.id
}
"><i class="fa-solid fa-pen"></i><span>Edit</span></button><button type="button" class="btn small access-delete" title="Delete account" aria-label="Delete account" data-delete-access="${u.id
}
"><i class="fa-solid fa-trash-can"></i><span>Delete</span></button>`
}
</div></article>`).join('')
}
</div></section></div><div id="accessModal" class="access-modal-backdrop hidden" role="presentation"></div>`;
document.querySelectorAll('[data-edit-access]').forEach(btn=>btn.onclick=()=> {
    const u=users.find(x=>x.id===Number(btn.dataset.editAccess)); if(!u)return; const overlay=document.querySelector('#accessModal'); overlay.classList.remove('hidden'); overlay.innerHTML=`<section class="access-modal" role="dialog" aria-modal="true" aria-labelledby="accessModalTitle"><button class="access-modal-close" type="button" data-close-access aria-label="Close"><i class="fa-solid fa-xmark"></i></button><span class="eyebrow">PERMISSIONS</span><h2 id="accessModalTitle">Edit account access</h2><p class="muted">Change the role for <strong>${esc(u.name)
}
</strong>. This updates their platform permissions.</p><form id="accessRoleForm"><label for="accessRoleSelect">Account role</label><select id="accessRoleSelect" required>${['customer','owner','admin'].map(r=>`<option value="${r
}
" ${u.role===r?'selected':''
}
>${roles[r]
}
</option>`).join('')
}
</select><p id="accessFormError" class="access-error" role="alert" hidden></p><div class="access-modal-actions"><button type="button" class="btn secondary" data-close-access>Cancel</button><button type="submit" class="btn access-save"><i class="fa-solid fa-check"></i> Update access</button></div></form></section>`; const close=()=> {
    overlay.classList.add('hidden'); overlay.innerHTML=''
}
; overlay.onclick=e=> {
    if(e.target===overlay||e.target.closest('[data-close-access]'))close()
}
; overlay.querySelector('#accessRoleForm').onsubmit=async e=> {
    e.preventDefault(); const submit=e.target.querySelector('[type="submit"]'); submit.disabled=true; try {
        await api('/root/users/'+u.id+'/role', {
            method:'PATCH',body: {
                role:overlay.querySelector('#accessRoleSelect').value
            }
        }
        ); close(); notice('Account access updated'); await rootPanel()
    }
    catch(err) {
        overlay.querySelector('#accessFormError').hidden=false; overlay.querySelector('#accessFormError').textContent=err.message; submit.disabled=false
    }
}
; overlay.querySelector('select').focus()
}
);
document.querySelectorAll('[data-delete-access]').forEach(btn=>btn.onclick=async()=> {
    const u=users.find(x=>x.id===Number(btn.dataset.deleteAccess)); if(!u)return; if(!await findConfirm( {
        title:"Delete user access?",message:`Permanently delete ${u.name
    }
    (${u.email
}
) and their listings and related enquiries? This cannot be undone.`,confirmText:"Delete access",danger:true
}
))return; btn.disabled=true; try {
    await api('/root/users/'+u.id, {
        method:'DELETE'
    }
    ); notice('Account and associated records deleted'); await rootPanel()
}
catch(err) {
    btn.disabled=false; error(err)
}
}
);
}
async function route() {
    try {
        const hash=location.hash.slice(1)||'home';
        if(hash==='home')await home();
        else if(hash==='buy') {
            await home( {
                listing:'sale'
            }
            );
            requestAnimationFrame(()=>document.querySelector('#listings')?.scrollIntoView( {
                behavior:'smooth'
            }
            ))
        }
        else if(hash==='rent') {
            await home( {
                listing:'rent'
            }
            );
            requestAnimationFrame(()=>document.querySelector('#listings')?.scrollIntoView( {
                behavior:'smooth'
            }
            ))
        }
        else if(hash==='explore'||hash==='search'||hash==='listings') {
            await home();
            requestAnimationFrame(()=> {
                document.querySelector('#listings')?.scrollIntoView( {
                    behavior:'smooth',block:'start'
                }
                ); if(hash==='search')setTimeout(()=>document.querySelector('#search input[name="search"]')?.focus( {
                    preventScroll:true
                }
                ),350)
            }
            )
        }
        else if(hash==='login'||hash==='register') {
            await home();
            openAuth(hash==='register')
        }
        else if(hash==='owner') {
            if(!me) {
                await home();
                openAuth(false)
            }
            else await owner();
        }
        else if(hash==='admin') {
            if(!me) {
                await home();
                openAuth(false)
            }
            else await admin();
        }
        else if(hash==='enquiry-history') {
            if(!me) {
                await home();
                openAuth(false)
            }
            else await enquiryHistory()
        }
        else if(hash==='root') {
            if(!me) {
                await home();
                openAuth(false)
            }
            else await rootPanel();
        }
        else if(hash.startsWith('property/'))await detail(hash.split('/')[1]);
        else {
            location.hash='#home';
            await home()
        }
    }
    catch(e) {
        app.innerHTML='<div class="container"><p class="muted">Unable to load page.</p></div>';
        error(e)
    }
}
window.addEventListener('hashchange',route);
loadUser().then(route).catch(error);

// Open account access as an overlay without navigating away from the current page.
document.addEventListener('click',e=> {
    const a=e.target.closest('a[href="#login"],a[href="#register"]'); if(!a)return; e.preventDefault(); openAuth(a.getAttribute('href')==='#register')
}
);

function initArchitectureMotion() {
    const section=document.querySelector('.architecture-story');
    if(!section)return;
    const image=section.querySelector('.architecture-building');
    if(!image)return;
    let ticking=false;
    function update() {
        ticking=false;
        if(!image.isConnected)return;
        const rect=section.getBoundingClientRect();
        const viewport=window.innerHeight||800;
        const progress=Math.max(0,Math.min(1,(viewport-rect.top)/(viewport+rect.height)));
        image.style.setProperty('--building-progress',progress.toFixed(3));
    }
    const onScroll=()=> {
        if(!ticking) {
            ticking=true;
            requestAnimationFrame(update)
        }
    }
    ;
    window.removeEventListener('scroll',window.__findArchitectureScroll);
    window.__findArchitectureScroll=onScroll;
    window.addEventListener('scroll',onScroll, {
        passive:true
    }
    );
    update()
}
document.addEventListener('click',e=> {
    const a=e.target.closest('a[href^="#"]'); if(!a)return; const target=a.getAttribute('href').slice(1); if(target===location.hash.slice(1)&&['search','explore','listings','buy','rent'].includes(target)) {
        e.preventDefault(); if(target==='search'||target==='explore'||target==='listings') {
            document.querySelector('#listings')?.scrollIntoView( {
                behavior:'smooth'
            }
            ); if(target==='search')setTimeout(()=>document.querySelector('#search input[name="search"]')?.focus( {
                preventScroll:true
            }
            ),300)
        }
        else route()
    }
}
);

// Gallery interaction is delegated because the admin view is re-rendered after actions.
document.addEventListener('click',event=> {
    const button=event.target.closest('[data-gallery-property]'); if(!button)return; const card=button.closest('.admin-card'); const buttons=[...(card?.querySelectorAll('[data-gallery-property]')||[])]; const photos=buttons.map(b=>b.querySelector('img')?.getAttribute('src')).filter(Boolean); const heading=card?.querySelector('.admin-card-title h3')?.textContent||'Property photos'; openPhotoViewer(photos,Number(button.dataset.galleryIndex)||0,heading)
}
);
