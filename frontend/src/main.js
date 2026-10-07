let authMode = 'login', initDone=false, rulesWarn=false;
function showErr(msg){
 const el=$('#app'); if(el) el.innerHTML=`<div class="card" style="max-width:560px;margin:40px auto"><h2 style="color:#b23a3a">Unable to start</h2><p class="mu">${msg}</p><button class="g" onclick="location.reload()">Retry</button></div>`;
}
function setRulesBanner(){
 if(rulesWarn)return; rulesWarn=true;
 const b=document.createElement('div'); b.style.cssText='position:sticky;top:0;background:#fff3cd;color:#856404;border-bottom:1px solid #ffeaa7;padding:8px 16px;font-size:13px;z-index:10';
 b.innerHTML='⚠ Firestore permissions denied. Open Firebase Console → Firestore Database → Rules and publish read/write rules (or temporary open rules for testing).';
 document.body.insertBefore(b, document.body.firstChild);
}
async function init(){
 const t=setTimeout(()=>{if(!initDone)showErr('Initialization timed out. Check your network connection and Firebase CDN access (gstatic.com).')},10000);
 try{
  db=await claude.use('db'); auth=await claude.use('auth');
  if(!db||!auth){clearTimeout(t);showErr('Firebase services unavailable. Ensure firebase-app-compat, firestore-compat, and auth-compat scripts are loaded from gstatic.com.');return;}
  initDone=true; clearTimeout(t);
  auth.onAuthStateChanged(user => {
    uid = user ? user.uid : null;
    render();
  });
  ['staff','punches','notes','evals','settings'].forEach(n=>db.collection(n).onSnapshot(
    s=>{data[n]=s.docs.map(d=>({id:d.id,...d.data()}));render()},
    err=>{
      if(err && (err.code==='permission-denied'||err.code==='unauthenticated')) setRulesBanner();
      console.warn('snapshot', n, err);
    }
  ));
  setInterval(()=>{const c=$('#clk');if(c)c.textContent=new Date().toLocaleTimeString()},1000);
 }catch(err){clearTimeout(t);showErr(err.message||String(err));}
}

function render(){
 if(!db)return;
 const w=wkey();$('#wl').textContent='Week of '+w;
 if(!uid) {
   $('#role').textContent=''; $('#nav').innerHTML='';
   const lOut = $('#logoutBtn'); if(lOut) lOut.style.display='none';
   $('#app').innerHTML = `
   <div class="card" style="max-width:400px;margin:40px auto">
     <div class="tabs" style="margin-bottom:20px">
       <button class="${authMode==='login'?'on':'g'}" onclick="authMode='login';render()">Sign In</button>
       <button class="${authMode==='register'?'on':'g'}" onclick="authMode='register';render()">Register</button>
     </div>
     ${authMode==='login'?`
       <h2>Sign In</h2>
       <label>Email</label><input id="le" type="email" value="kidusadugna@iracktech.com">
       <label>Password</label><input id="lp" type="password" value="12345">
       <br><br><div class="row"><button onclick="login()">Sign In</button><span id="am" class="mu" style="margin-left:10px"></span></div>
     `:`
       <h2>Register New User</h2>
       <label>Full Name</label><input id="rn" type="text" placeholder="John Doe">
       <label>Email (@iracktech.com)</label><input id="re" type="email" placeholder="john@iracktech.com">
       <label>Password (min 6 chars)</label><input id="rp" type="password">
       <br><br><div class="row"><button onclick="registerUser()">Register</button><span id="am" class="mu" style="margin-left:10px"></span></div>
     `}
   </div>`;
   return;
 }

 const me = data.staff.find(x=>x.id===uid);
 if(!me){
   // The auth is ready but doc isn't created yet or was deleted. Wait for it or just return.
   $('#app').innerHTML = `<p class="mu">Loading user profile...</p>`;
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

async function login(){
 const e=$('#le').value.trim().toLowerCase(), p=$('#lp').value; const am=$('#am'); if(am) am.textContent='';
 try {
   await auth.signInWithEmailAndPassword(e, p);
 } catch(err) {
   let m = err.message || String(err);
   if (err && err.code === 'auth/configuration-not-found') {
     m = 'Firebase Auth setup incomplete. Go to Firebase Console → Authentication → Sign-in method and enable Email/Password. Also add "' +
         (location && location.hostname ? location.hostname : 'office-erp-frontend.vercel.app') +
         '" to Authentication → Settings → Authorized domains if missing.';
   }
   if(am) am.textContent = m;
   else alert(m);
 }
}

async function registerUser(){
 const n=$('#rn').value.trim(), e=$('#re').value.trim().toLowerCase(), p=$('#rp').value; const am=$('#am');
 if(!n || !p || !okMail(e)){if(am)am.textContent='Invalid input or must use @iracktech.com';return;}
 if(data.staff.some(x=>x.email===e)){if(am)am.textContent='Email already registered';return;}
 try {
   const res = await auth.createUserWithEmailAndPassword(e, p);
   await db.collection('staff').doc(res.user.uid).set({name:n, email:e, dept:'Employee', badge:'', days:5, active:true, mgr:data.staff.length===0});
 } catch(err) {
   let m = err.message || String(err);
   if (err && err.code === 'auth/configuration-not-found') {
     m = 'Firebase Auth setup incomplete. Enable Email/Password in Firebase Console → Authentication → Sign-in method.';
   }
   if(am) am.textContent = m;
   else alert(m);
 }
}

function logout(){
 auth.signOut();
}

init();

