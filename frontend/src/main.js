let authMode = 'login', initDone=false, rulesWarn=false, dataSubs=null, dataSubsUid=null;
function authModeFromHash(){
 const h=(location.hash||'').replace(/^#\/?/,'').toLowerCase();
 return h==='register'?'register':'login';
}
function setAuthMode(m){ authMode=m; location.hash = (m==='register'?'#register':'#login'); }
window.addEventListener('hashchange', ()=>{ const m=authModeFromHash(); if(m!==authMode){authMode=m; render();} });
function togglePw(id){
 const el=document.getElementById(id); if(!el)return; el.type=el.type==='password'?'text':'password';
 const t=document.getElementById(id+'T'); if(t)t.textContent=el.type==='password'?'Show':'Hide';
}
function showErr(msg){
 const el=$('#app'); if(el) el.innerHTML=`<div class="card" style="max-width:560px;margin:40px auto"><h2 style="color:#b23a3a">Unable to start</h2><p class="mu">${msg}</p><button class="g" onclick="location.reload()">Retry</button></div>`;
}
function setRulesBanner(){
 if(rulesWarn)return; rulesWarn=true;
 const b=document.createElement('div'); b.id='rulesBanner'; b.style.cssText='position:sticky;top:0;background:#fff3cd;color:#856404;border-bottom:1px solid #ffeaa7;padding:8px 16px;font-size:13px;z-index:10;display:flex;align-items:center;justify-content:space-between';
 b.innerHTML='<span>⚠ Firestore permissions denied. Open Firebase Console → Firestore Database → Rules and publish read/write rules (or temporary open rules for testing).</span><button class="g" style="padding:2px 10px;font-size:12px" onclick="document.getElementById(\'rulesBanner\')&&document.getElementById(\'rulesBanner\').remove()">Dismiss</button>';
 document.body.insertBefore(b, document.body.firstChild);
}
function clearRulesBanner(){ rulesWarn=false; const b=document.getElementById('rulesBanner'); if(b)b.remove(); }
function detachDataSubs(){
 if(dataSubs){ dataSubs.forEach(u=>{try{u()}catch(e){}}); dataSubs=null; }
 dataSubsUid=null;
}
function attachDataSubs(userUid){
 if(dataSubsUid===userUid)return;
 detachDataSubs();
 dataSubsUid=userUid;
 dataSubs=['staff','punches','notes','evals','settings'].map(n=>db.collection(n).onSnapshot(
   s=>{data[n]=s.docs.map(d=>({id:d.id,...d.data()}));render()},
   err=>{
     if(err && (err.code==='permission-denied'||err.code==='unauthenticated') && !!uid) setRulesBanner();
     console.warn('snapshot', n, err);
   }
 ));
}
async function init(){
 authMode = authModeFromHash();
 const t=setTimeout(()=>{if(!initDone)showErr('Initialization timed out. Check your network connection and Firebase CDN access (gstatic.com).')},10000);
 try{
  db=await claude.use('db'); auth=await claude.use('auth');
  if(!db||!auth){clearTimeout(t);showErr('Firebase services unavailable. Ensure firebase-app-compat, firestore-compat, and auth-compat scripts are loaded from gstatic.com.');return;}
  initDone=true; clearTimeout(t);
  auth.onAuthStateChanged(async user => {
    uid = user ? user.uid : null;
    if(!uid){ clearRulesBanner(); detachDataSubs(); }
    else{ attachDataSubs(uid); }
    await render();
  });
  setInterval(()=>{const c=$('#clk');if(c)c.textContent=new Date().toLocaleTimeString()},1000);
 }catch(err){clearTimeout(t);showErr(err.message||String(err));}
}

function authShell(formHTML, subHTML){
 document.body.classList.add('authView');
 return `<div class="authShell">
  <div class="brandRow"><img class="brandLogo" src="src/logo-circle.png" alt="IRack IT Solution logo"><div><div style="font-weight:700;font-size:15px">IRack IT Solution</div><div class="mu" style="font-size:12px">WorkTime ERP · Attendance & workforce dashboard</div></div></div>
  <h2>${authMode==='login'?'Welcome back':'Create your account'}</h2>
  <p class="sub">${authMode==='login'?'Sign in to continue to your dashboard.':'Use your @iracktech.com email to get started.'}</p>
  ${formHTML}
  <div class="amWrap" id="am" role="alert" aria-live="polite"></div>
  ${subHTML}
  <div class="footNote">${new Date().getFullYear()} IRack IT Solution</div>
 </div>`;
}

async function render(){
 if(!db)return;
 const w=wkey();$('#wl').textContent='Week of '+w;
 if(!uid) {
   $('#role').textContent=''; $('#nav').innerHTML='';
   const lOut = $('#logoutBtn'); if(lOut) lOut.style.display='none';
   const topRow = $('#topRow'); if(topRow) topRow.style.display='none';
   const form = authMode==='login'
    ? `<form onsubmit="event.preventDefault();login()" autocomplete="on">
        <div class="authField"><label for="le">Work email</label><input autocomplete="username" name="username" id="le" type="email" placeholder="name@iracktech.com" required></div>
        <div class="authField"><label for="lp">Password</label><input autocomplete="current-password" name="password" id="lp" type="password" placeholder="Enter your password" required><button type="button" class="pwToggle" id="lpT" onclick="togglePw('lp')">Show</button></div>
        <button type="submit" class="authBtn" id="liBtn">Sign In</button>
       </form>`
    : `<form onsubmit="event.preventDefault();registerUser()" autocomplete="on">
        <div class="authField"><label for="rn">Full name</label><input autocomplete="name" name="name" id="rn" type="text" placeholder="e.g. Kidus Adugna" autocapitalize="words" required></div>
        <div class="authField"><label for="re">Work email (@iracktech.com)</label><input autocomplete="email" name="email" id="re" type="email" placeholder="name@iracktech.com" required></div>
        <div class="authField"><label for="rp">Create a password</label><input autocomplete="new-password" name="new-password" id="rp" type="password" placeholder="At least 6 characters" minlength="6" required><button type="button" class="pwToggle" id="rpT" onclick="togglePw('rp')">Show</button></div>
        <button type="submit" class="authBtn" id="rgBtn">Create account</button>
       </form>`;
   const sub = authMode==='login'
    ? `<div class="authSubRow"><span>No account?</span><button class="link" onclick="setAuthMode('register')">Create account</button></div>`
    : `<div class="authSubRow"><span>Already have an account?</span><button class="link" onclick="setAuthMode('login')">Sign in</button></div>`;
   $('#app').innerHTML = authShell(form, sub);
   if (location.hash !== '#'+authMode) history.replaceState(null,'','#'+authMode);
   return;
 }
 document.body.classList.remove('authView');
 const topRow = $('#topRow'); if(topRow) topRow.style.display='';

 const managerEmail = 'manager@iracktech.com';
 const userEmail = (auth.currentUser?.email || '').toLowerCase();
 mgr = userEmail === managerEmail;
 let my = data.staff.find(x=>x.id===uid);
 if(!my){
   if(uid){
     try {
       const snap = await db.collection('staff').doc(uid).get();
       if(snap?.exists){
         my = {id:snap.id,...snap.data()};
         if(!data.staff.some(s=>s.id===uid)) data.staff.push(my);
       } else {
         await db.collection('staff').doc(uid).set({
           name: auth.currentUser?.displayName || userEmail.split('@')[0],
           email: userEmail,
           dept: mgr ? 'Management' : 'Employee',
           badge:'', days:5, active:true, mgr:mgr
         },{merge:true});
         my = {id:uid,name:auth.currentUser?.displayName||userEmail.split('@')[0],email:userEmail,dept:mgr?'Management':'Employee',active:true,mgr:mgr};
       }
     } catch(e){}
   }
 }
 if(!my){
   $('#app').innerHTML = `<div class="card" style="max-width:480px;margin:40px auto"><p class="mu">Loading user profile…</p></div>`;
   return;
 }
 myEmail=my.email; myName=my.name;
 if(!mgr && !my.mgr){
   try{await db.collection('staff').doc(uid).set({mgr:false},{merge:true});}catch(e){}
 }
 if(mgr){
   try{await db.collection('staff').doc(uid).set({mgr:true, dept:'Management'},{merge:true});}catch(e){}
 }
 const roleEl=$('#role'); roleEl.textContent=mgr?'Manager':''; roleEl.style.display=roleEl.textContent?'':'none';
 const lOut = $('#logoutBtn'); if(lOut) lOut.style.display='block';
 if(!mgr) asEmp=false;

 if(document.activeElement?.id==='fq'){ if(mgr)dash(); return;}
 if(document.activeElement?.id==='pq'){ if(mgr)plist(); return;}
 if(document.activeElement&&/TEXTAREA|INPUT/.test(document.activeElement.tagName))return;

 $('#nav').innerHTML=mgr?`
  <button class="${asEmp?'g':'on'}" onclick="asEmp=false;render()">Manager dashboard</button>
  <button class="${asEmp?'on':'g'}" onclick="asEmp=true;render()">Employee preview</button>`:'';
 if(mgr){
  $('#app').innerHTML=asEmp?employee(w):manager(w);
 } else {
  if(typeof sel==='string')sel=null;
  $('#app').innerHTML=employee(w);
 }
}

function setBusy(id, busy){
 const b=document.getElementById(id); if(!b)return; if(busy){b.disabled=true; b.dataset.old=b.textContent; b.textContent=busy;}
 else{b.disabled=false; if(b.dataset.old){b.textContent=b.dataset.old; delete b.dataset.old;}}
}

function authErrorMessage(err, action){
 const code=err?.code||'';
 const messages={
  'auth/invalid-login-credentials':"We couldn't sign you in with those details. Check your email and password, then try again. If you haven't created an account, choose Create account.",
  'auth/invalid-credential':"We couldn't sign you in with those details. Check your email and password, then try again. If you haven't created an account, choose Create account.",
  'auth/user-not-found':"We couldn't find an account with those details. Check your email, or choose Create account to get started.",
  'auth/wrong-password':"That password doesn't match this account. Check it and try again.",
  'auth/invalid-email':'Enter a valid email address and try again.',
  'auth/missing-email':'Enter your email address to continue.',
  'auth/missing-password':'Enter your password to continue.',
  'auth/weak-password':'Choose a stronger password with at least 6 characters.',
  'auth/email-already-in-use':'An account with this email already exists. Try signing in instead.',
  'auth/too-many-requests':'There have been too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed':'We couldn’t reach the sign-in service. Check your internet connection and try again.',
  'auth/user-disabled':'This account is currently disabled. Please contact your administrator.',
  'auth/operation-not-allowed':'Email and password sign-in isn’t enabled yet. Please contact your administrator.',
  'auth/configuration-not-found':'Sign-in isn’t available right now. Please contact your administrator.'
 };
 return messages[code] || (action==='register'
  ? 'We couldn’t create your account just now. Please try again. If the problem continues, contact your administrator.'
  : 'We couldn’t sign you in just now. Please try again. If the problem continues, contact your administrator.');
}

function showAuthMessage(message){
 const el=$('#am');
 if(el)el.textContent=message||'';
}

async function login(){
 const e=$('#le').value.trim().toLowerCase(), p=$('#lp').value;
 showAuthMessage('');
 if(!e||!p){showAuthMessage(!e?'Enter your email address to continue.':'Enter your password to continue.');return;}
 setBusy('liBtn','Signing in…');
 try {
   await auth.signInWithEmailAndPassword(e, p);
 } catch(err) {
   showAuthMessage(authErrorMessage(err,'login'));
 } finally { setBusy('liBtn', false); }
}

async function registerUser(){
 const n=$('#rn').value.trim().replace(/\s+/g,' '), e=$('#re').value.trim().toLowerCase(), p=$('#rp').value;
 showAuthMessage('');
 if(!n){showAuthMessage('Enter your full name in the Full name field.');$('#rn').focus();return;}
 if(!okMail(e)){showAuthMessage('Enter your work email ending in @iracktech.com in the Work email field.');$('#re').focus();return;}
 if(p.length<6){showAuthMessage('Choose a password with at least 6 characters.');$('#rp').focus();return;}
 if(data.staff.some(x=>x.email===e)){showAuthMessage('An account with this email already exists. Try signing in instead.');return;}
 setBusy('rgBtn','Creating account…');
 try {
   const res = await auth.createUserWithEmailAndPassword(e, p);
   await db.collection('staff').doc(res.user.uid).set({
     name:n, email:e, dept:e==='manager@iracktech.com'?'Management':'Employee',
     badge:'', days:5, active:true, mgr:e==='manager@iracktech.com'
   });
 } catch(err) {
   showAuthMessage(authErrorMessage(err,'register'));
 } finally { setBusy('rgBtn', false); }
}

function logout(){
 auth.signOut().then(()=>{ location.hash='#login'; render(); }).catch(()=>{ location.hash='#login'; render(); });
}

init();

