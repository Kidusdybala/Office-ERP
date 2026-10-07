// Local stand-in for the Claude Artifact runtime (db + user). Data lives in localStorage.
// Open index.html?as=manager  (manager)   or   ?as=emp&email=sara@company.com&name=Sara  (employee)
(function(){
  const q=new URLSearchParams(location.search),mgr=q.get('as')!=='emp',email=q.get('email')||(mgr?'boss@company.com':'emp@company.com'),
        uid=q.get('uid')||(mgr?'manager1':'u_'+email.replace(/\W/g,'')),name=q.get('name')||(mgr?'Manager':'Employee');
  const load=()=>JSON.parse(localStorage.getItem('erp_mock')||'{}'),save=d=>localStorage.setItem('erp_mock',JSON.stringify(d)),subs={};
  const emit=c=>(subs[c]||[]).forEach(f=>f(snap(c)));
  const snap=c=>({docs:Object.entries(load()[c]||{}).map(([id,d])=>({id,data:()=>d}))});
  window.addEventListener('storage',()=>Object.keys(subs).forEach(emit));
  const db={collection:c=>({
    onSnapshot(cb){(subs[c]??=[]).push(cb);setTimeout(()=>cb(snap(c)));return()=>{}},
    doc:id=>({
      async set(d){const a=load();(a[c]??={})[id]=d;save(a);Object.keys(subs).forEach(emit)},
      async update(d){const a=load();a[c][id]={...a[c][id],...d};save(a);Object.keys(subs).forEach(emit)},
      async delete(){const a=load();delete (a[c]||{})[id];save(a);Object.keys(subs).forEach(emit)},
      async get(){const d=(load()[c]||{})[id];return{id,exists:!!d,data:()=>d}}})})};
  const user={isOwner:()=>mgr,canEdit:()=>mgr,id:async()=>uid,me:async()=>({id:uid,email,name})};
  window.claude={use:async n=>n==='db'?db:n==='user'?user:null};
})();
