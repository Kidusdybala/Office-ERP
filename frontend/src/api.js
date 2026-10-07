async function punch(src='web',u=uid,ts=Date.now(),type){
 const ps=data.punches.filter(p=>p.uid===u&&dk(new Date(p.ts))===dk(new Date(ts))).sort((a,b)=>a.ts-b.ts),l=ps[ps.length-1];
 if(l&&Math.abs(ts-l.ts)<5000)return;await db.collection('punches').doc(u+'_'+ts).set({uid:u,ts,type:type||(l&&l.type==='in'?'out':'in'),src})}
async function saveNote(kind,key,id){const t=$('#'+id).value;await db.collection('notes').doc(`${uid}_${kind}_${key}`).set({uid,kind,key,text:t,at:Date.now()});toast(id)}
function toast(id){const b=$('#'+id+'b');if(b){b.textContent='Saved ✓'}}
async function register(){await db.collection('staff').doc(uid).set({name:$('#rn').value.trim()||'Employee',dept:$('#rd').value,days:+$('#rdy').value||5,badge:$('#rb').value.trim(),mgr})}
function noteBox(kind,key,label,ph){const n=data.notes.find(x=>x.id===`${uid}_${kind}_${key}`),id='n'+kind.replace('-','')+'';
 return`<div class="card"><h2>${label}</h2><textarea id="${id}" placeholder="${ph}">${esc(n?.text||'')}</textarea><div class="row" style="margin-top:8px"><button id="${id}b" onclick="saveNote('${kind}','${key}','${id}')">Save</button><span class="mu">${n?'Updated '+new Date(n.at).toLocaleString():'Not submitted'}</span></div></div>`}
async function saveShift(){await db.collection('settings').doc('shift').set({start:$('#sst').value||'08:10',end:$('#sen').value||'17:30'});$('#shm').textContent='Saved ✓'}
