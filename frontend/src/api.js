async function punch(src='web',u=uid,ts=Date.now(),type){
 const ps=data.punches.filter(p=>p.uid===u&&dk(new Date(p.ts))===dk(new Date(ts))).sort((a,b)=>a.ts-b.ts),l=ps[ps.length-1];
 if(l&&Math.abs(ts-l.ts)<5000)return;await db.collection('punches').doc(u+'_'+ts).set({uid:u,ts,type:type||(l&&l.type==='in'?'out':'in'),src})}
async function saveNote(kind,key,id){
 const el=$('#'+id); if(!el)return;
 const t=el.value;
 const b=$('#'+id+'b');
 if(b){b.disabled=true;b.textContent='Saving…';}
 try {
  const at=Date.now();
  await db.collection('notes').doc(`${uid}_${kind}_${key}`).set({uid,kind,key,text:t,at});
  const docId=`${uid}_${kind}_${key}`;
  const ex=data.notes.find(x=>x.id===docId||(x.uid===uid&&x.kind===kind&&x.key===key));
  if(ex){ex.text=t;ex.at=at;}else{data.notes.push({id:docId,uid,kind,key,text:t,at});}
  if(b){b.disabled=false;b.textContent='Saved ✓';setTimeout(()=>{if(b)b.textContent='Save'},2200);}
  const tm=$('#'+id+'t');if(tm)tm.textContent='Updated just now';
 }catch(err){
  console.error('saveNote error',err);
  if(b){b.disabled=false;b.textContent='Error saving';setTimeout(()=>{if(b)b.textContent='Save'},2500);}
 }
}
function copyPlanToReport(planId, reportId){
 const p=$('#'+planId), r=$('#'+reportId);
 if(!p||!r)return;
 const v=(p.value||'').trim();
 if(!v){alert('Daily plan is empty. Write your plan first.');return;}
 const cur=(r.value||'').trim();
 r.value=cur?(cur+'\n\nCompleted / Progress on planned items:\n'+v):('Completed / Progress on planned items:\n'+v);
 r.focus();
}
function copyTextToField(targetId, text){
 const el=$('#'+targetId); if(!el)return;
 const cur=(el.value||'').trim();
 el.value=cur?(cur+'\n\n'+text):text;
 el.focus();
}
function toast(id){const b=$('#'+id+'b');if(b){b.textContent='Saved ✓'}}
async function register(){await db.collection('staff').doc(uid).set({name:$('#rn').value.trim()||'Employee',dept:$('#rd').value,days:+$('#rdy').value||5,badge:$('#rb').value.trim(),mgr})}
function noteBox(kind,key,label,ph){
 const safeKey=key.replace(/[^a-zA-Z0-9]/g,'_');
 const id='n_'+kind.replace(/[^a-zA-Z0-9]/g,'_')+'_'+safeKey;
 const n=data.notes.find(x=>x.uid===uid&&x.kind===kind&&x.key===key);
 return`<div class="card"><h2>${label}</h2><textarea id="${id}" placeholder="${ph}">${esc(n?.text||'')}</textarea><div class="row" style="margin-top:8px"><button id="${id}b" onclick="saveNote('${kind}','${key}','${id}')">Save</button><span class="mu" id="${id}t">${n?'Updated '+new Date(n.at).toLocaleString():'Not submitted'}</span></div></div>`}
async function saveShift(){await db.collection('settings').doc('shift').set({start:$('#sst').value||'08:10',end:$('#sen').value||'17:30'});$('#shm').textContent='Saved ✓'}
