const pad=n=>String(n).padStart(2,'0'),dk=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monday=(d=new Date(),o=0)=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7)+o*7);return x};
const wkey=()=>dk(monday(new Date(),wk)),hm=t=>{const d=new Date(t);return pad(d.getHours())+':'+pad(d.getMinutes())};
const col=p=>p>=90?'var(--ok)':p>=70?'var(--wa)':'var(--er)';
const bar=p=>`<div class="bar"><i style="width:${Math.min(100,p)}%;background:${col(p)}"></i></div>`;
function days(w){const m=new Date(w+'T00:00:00'),r=[];for(let i=0;i<7;i++){const d=new Date(m);d.setDate(m.getDate()+i);r.push(d)}return r}
function elapsed(w){const t=new Date();t.setHours(23,59,59);return days(w).filter((d,i)=>i<5&&d<=t).length}
function punchesOf(u,w){const s=new Date(w+'T00:00:00').getTime(),e=s+7*864e5;return data.punches.filter(p=>p.uid===u&&p.ts>=s&&p.ts<e).sort((a,b)=>a.ts-b.ts)}
function hoursByDay(ps){const o={};let open=null;ps.forEach(p=>{if(p.type==='in')open=p.ts;else if(open){const k=dk(new Date(p.ts));o[k]=(o[k]||0)+(p.ts-open)/36e5;open=null}});return o}
const tm=x=>{const[h,m]=x.split(':');return+h*60+ +m},mn=ts=>{const d=new Date(ts);return d.getHours()*60+d.getMinutes()};
const shift=()=>{const d=data.settings.find(x=>x.id==='shift');return{start:d?.start||'08:10',end:d?.end||'17:30'}};
const fm=m=>{m=Math.abs(m);return m>=60?Math.floor(m/60)+'h '+m%60+'m':m+'m'};
function timeTable(st,w){const sh=shift(),sm=tm(sh.start),em=tm(sh.end),td=dk(new Date()),H=hoursByDay(st.ps),c=(k,t)=>`<span class="chip ${k}">${t}</span>`;
 return`<table><tr><th>Day</th><th>In</th><th>Out</th><th>Hours</th><th>Notes</th></tr>${days(w).slice(0,5).map(d=>{const k=dk(d),r=st.dr[k]||{},a=r.in?mn(r.in):null,b=r.out?mn(r.out):null;
 const n1=a===null?(k<td?c('none','Absent'):''):a<sm?c('full','Arrived '+fm(sm-a)+' early'):a===sm?c('full','On time'):c('none','Late '+fm(a-sm));
 const n2=b===null?(a!==null&&k<td?c('none','No punch out'):''):b>em?c('full','Overtime '+fm(b-em)):b===em?c('full','Out on time'):c('none','Left '+fm(em-b)+' early');
 return`<tr><td>${d.toLocaleDateString([],{weekday:'short',day:'numeric'})}</td><td><b>${r.in?hm(r.in):'—'}</b></td><td><b>${r.out?hm(r.out):'—'}</b></td><td>${H[k]?H[k].toFixed(1)+' h':'—'}</td><td>${n1} ${n2}</td></tr>`}).join('')}</table>`}
function todayStr(r){const x=r.dr[dk(new Date())];return x?.in?`${hm(x.in)}–${x.out?hm(x.out):'…'}`:'—'}
function stats(s,w){const ps=punchesOf(s.id,w),by={};ps.forEach(p=>{(by[dk(new Date(p.ts))]??=[]).push(p.type)});const full=Object.values(by).filter(a=>a.includes('in')&&a.includes('out')).length,td=dk(new Date()),e5=days(w).slice(0,5).filter(d=>dk(d)<td||(dk(d)===td&&by[td])).length,exp=Math.min(s.days||5,e5),att=exp?Math.min(100,full/exp*100):0;
 const sh=shift(),sm=tm(sh.start),em=tm(sh.end),dr={};ps.forEach(p=>{const r=dr[dk(new Date(p.ts))]??={};if(p.type==='in')r.in??=p.ts;else r.out=p.ts});let onT=0;Object.values(dr).forEach(r=>{if(r.in&&r.out&&mn(r.in)<=sm&&mn(r.out)>=em)onT++});
 const nt=data.notes.filter(x=>x.uid===s.id&&(x.key===w||days(w).some(d=>dk(d)===x.key))&&x.text.trim()).length,rexp=2*elapsed(w)+2,rep=Math.min(100,nt/rexp*100);
 const e=data.evals.find(x=>x.id===s.id+'_'+w),rt=e?e.rating:null,pun=full?onT/full*100:0,score=rt?(att*.4+pun*.2+rep*.2+rt/5*100*.2):(att*.4+pun*.2+rep*.2)/.8;
 return{ps,by,dr,pun,onT,full,exp,att,rep,rt,score,e,hrs:Object.values(hoursByDay(ps)).reduce((a,b)=>a+b,0)}}
function chips(st,w){return days(w).slice(0,5).map(d=>{const a=st.by[dk(d)]||[],k=a.includes('in')&&a.includes('out')?'full':a.length?'part':dk(d)<dk(new Date())?'none':'fut';return`<span class="chip ${k}">${d.toLocaleDateString([],{weekday:'short'})} ${k==='full'?'✓':k==='part'?'½':k==='none'?'✗':''}</span>`}).join('')}
function status(u){const ps=punchesOf(u,dk(monday())).filter(p=>dk(new Date(p.ts))===dk(new Date()));return ps.length&&ps[ps.length-1].type==='in'}
function ring(p){const r=42,c=2*Math.PI*r;return`<svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--bd)" stroke-width="10"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="${col(p)}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c*Math.min(p,100)/100} ${c}" transform="rotate(-90 55 55)"/><text x="55" y="61" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${Math.round(p)}%</text></svg>`}
const cd=()=>String(Math.floor(1e5+Math.random()*9e5));
const okMail=m=>/^[^\s@'"<>]+@iracktech\.com$/i.test(m);
