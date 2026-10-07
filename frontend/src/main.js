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
  auth.onAuthStateChanged(user => {
    uid = user ? user.uid : null;
    if(!uid){ clearRulesBanner(); detachDataSubs(); }
    else{ attachDataSubs(uid); }
    render();
  });
  setInterval(()=>{const c=$('#clk');if(c)c.textContent=new Date().toLocaleTimeString()},1000);
 }catch(err){clearTimeout(t);showErr(err.message||String(err));}
}

function authShell(formHTML, subHTML){
 document.body.classList.add('authView');
 return `<div class="authShell">
  <div class="brandRow"><div class="logo">⏱</div><div><div style="font-weight:700;font-size:15px">WorkTime ERP</div><div class="mu" style="font-size:12px">Attendance & workforce dashboard</div></div></div>
  <h2>${authMode==='login'?'Welcome back':'Create your account'}</h2>
  <p class="sub">${authMode==='login'?'Sign in to continue to your dashboard.':'Use your @iracktech.com email to get started.'}</p>
  ${formHTML}
  <div class="amWrap" id="am"></div>
  ${subHTML}
  <div class="footNote">${new Date().getFullYear()} WorkTime ERP · iRackTech</div>
 </div>`;
}

function render(){
 if(!db)return;
 const w=wkey();$('#wl').textContent='Week of '+w;
 if(!uid) {
   $('#role').textContent=''; $('#nav').innerHTML='';
   const lOut = $('#logoutBtn'); if(lOut) lOut.style.display='none';
   const topRow = $('#topRow'); if(topRow) topRow.style.display='none';
   const host=location&&location.hostname?location.hostname:'office-erp-frontend.vercel.app';
   const cfgNote=`Firebase Auth setup incomplete. Enable <b>Email/Password</b> in Firebase Console → Authentication → Sign-in method. Also add <b>${host}</b> to Authentication → Settings → Authorized domains if missing.`;
   const form = authMode==='login'
    ? `<form onsubmit="event.preventDefault();login()">
        <div class="authField"><input autocomplete="username" id="le" type="email" placeholder="you@iracktech.com" value="kidusadugna@iracktech.com"><label for="le">Email address</label></div>
        <div class="authField"><input autocomplete="current-password" id="lp" type="password" placeholder="Enter your password" value="12345"><button type="button" class="pwToggle" id="lpT" onclick="togglePw('lp')">Show</button><label for="lp">Password</label></div>
        <button type="submit" class="authBtn" id="liBtn">Sign In</button>
       </form>`
    : `<form onsubmit="event.preventDefault();registerUser()">
        <div class="authField"><input autocomplete="name" id="rn" type="text" placeholder="Full name"><label for="rn">Full Name</label></div>
        <div class="authField"><input autocomplete="email" id="re" type="email" placeholder="you@iracktech.com"><label for="re">Email (@iracktech.com)</label></div>
        <div class="authField"><input autocomplete="new-password" id="rp" type="password" placeholder="Min. 6 characters"><button type="button" class="pwToggle" id="rpT" onclick="togglePw('rp')">Show</button><label for="rp">Password</label></div>
        <button type="submit" class="authBtn" id="rgBtn">Create account</button>
       </form>`;
   const sub = authMode==='login'
    ? `<div class="authSubRow"><span>No account?</span><button class="link" onclick="setAuthMode('register')">Create account</button></div>`
    : `<div class="authSubRow"><span>Already have an account?</span><button class="link" onclick="setAuthMode('login')">Sign in</button></div>`;
   $('#app').innerHTML = authShell(form, sub);
   if (location.hash !== '#'+authMode) history.replaceState(null,'','#'+authMode);
   window.__fbCfgNote = cfgNote;
   return;
 }
 document.body.classList.remove('authView');
 const topRow = $('#topRow'); if(topRow) topRow.style.display='';

 const me = data.staff.find(x=>x.id===uid);
 if(!me){
   $('#app').innerHTML = `<div class="card" style="max-width:480px;margin:40px auto"><p class="mu">Loading user profile…</p></div>`;
   return;
 }
 mgr=me.mgr; myEmail=me.email; myName=me.name;
 $('#role').textContent=mgr?'Manager':'Employee';
 const lOut = $('#logoutBtn'); if(lOut) lOut.style.display='block';

 if(document.activeElement?.id==='fq'){dash();return}
 if(document.activeElement?.id==='pq'){plist();return}
 if(document.activeElement&&/TEXTAREA|INPUT/.test(document.activeElement.tagName))return;

 $('#nav').innerHTML=mgr?`<button class="${asEmp?'g':'on'}" onclick="asEmp=false;render()">Manager dashboard</button><button class="${asEmp?'on':'g'}" onclick="asEmp=true;render()">Employee page</button>`:'';
 $('#app').innerHTML=mgr&&!asEmp?manager(w):employee(w);
}

function setBusy(id, busy){
 const b=document.getElementById(id); if(!b)return; if(busy){b.disabled=true; b.dataset.old=b.textContent; b.textContent=busy;}
 else{b.disabled=false; if(b.dataset.old){b.textContent=b.dataset.old; delete b.dataset.old;}}
}

async function login(){
 const e=$('#le').value.trim().toLowerCase(), p=$('#lp').value;
 const am=$('#am'); if(am) am.innerHTML='';
 setBusy('liBtn','Signing in…');
 try {
   await auth.signInWithEmailAndPassword(e, p);
 } catch(err) {
   let m = err.message || String(err);
   if (err && err.code === 'auth/configuration-not-found' && window.__fbCfgNote) m = window.__fbCfgNote;
   if(am) am.innerHTML = m;
   else alert(m);
 } finally { setBusy('liBtn', false); }
}

async function registerUser(){
 const n=$('#rn').value.trim(), e=$('#re').value.trim().toLowerCase(), p=$('#rp').value;
 const am=$('#am');
 if(!n || !p || !okMail(e)){if(am)am.innerHTML='Enter a full name, valid @iracktech.com email, and a password (min 6 chars).';return;}
 if(data.staff.some(x=>x.email===e)){if(am)am.innerHTML='This email is already registered. Sign in instead.';return;}
 setBusy('rgBtn','Creating account…');
 try {
   const res = await auth.createUserWithEmailAndPassword(e, p);
   await db.collection('staff').doc(res.user.uid).set({name:n, email:e, dept:'Employee', badge:'', days:5, active:true, mgr:data.staff.length===0});
 } catch(err) {
   let m = err.message || String(err);
   if (err && err.code === 'auth/configuration-not-found' && window.__fbCfgNote) m = window.__fbCfgNote;
   if(am) am.innerHTML = m;
   else alert(m);
 } finally { setBusy('rgBtn', false); }
}

function logout(){
 auth.signOut().then(()=>{ location.hash='#login'; render(); }).catch(()=>{ location.hash='#login'; render(); });
}

init();

