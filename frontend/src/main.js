let authMode = 'login';
async function init(){
 db=await claude.use('db');
 if(!db) return;
 uid = localStorage.getItem('erp_uid') || null;
 ['staff','punches','notes','evals','settings'].forEach(n=>db.collection(n).onSnapshot(s=>{data[n]=s.docs.map(d=>({id:d.id,...d.data()}));if(n==='staff'){const m=data.staff.find(x=>x.id==='manager1');if(m&&m.name==='Manager'){db.collection('staff').doc('manager1').update({name:'System Admin'})}};render()}));
 setInterval(()=>{const c=$('#clk');if(c)c.textContent=new Date().toLocaleTimeString()},1000);
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
       <label>Password</label><input id="rp" type="password">
       <br><br><div class="row"><button onclick="registerUser()">Register</button><span id="am" class="mu" style="margin-left:10px"></span></div>
     `}
   </div>`;
   return;
 }

 const me = data.staff.find(x=>x.id===uid);
 if(!me){
   uid=null; localStorage.removeItem('erp_uid'); render(); return;
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
 const e=$('#le').value.trim().toLowerCase(), p=$('#lp').value;
 const user=data.staff.find(x=>x.email===e && x.code===p);
 if(!user){$('#am').textContent='Invalid email or password';return;}
 uid=user.id; localStorage.setItem('erp_uid',uid); render();
}

async function registerUser(){
 const n=$('#rn').value.trim(), e=$('#re').value.trim().toLowerCase(), p=$('#rp').value;
 if(!n || !p || !okMail(e)){$('#am').textContent='Invalid input or must use @iracktech.com';return;}
 if(data.staff.some(x=>x.email===e)){$('#am').textContent='Email already registered';return;}
 const newId = 'u_'+Date.now();
 await db.collection('staff').doc(newId).set({name:n, email:e, code:p, dept:'Employee', badge:'', days:5, active:true, mgr:data.staff.length===0});
 uid=newId; localStorage.setItem('erp_uid',uid); render();
}

function logout(){
 uid=null; localStorage.removeItem('erp_uid'); render();
}

init();

