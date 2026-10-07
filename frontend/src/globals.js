const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let myEmail='',myName='',claiming=0,editId=null,pq='',rmArm=null,asEmp=false,F={q:'',d:'',f:'',s:'score'},db,auth,uid,mgr=false,wk=0,dOffset=0,view='team',sel=null,data={staff:[],punches:[],notes:[],evals:[],settings:[]},ev={q:[3,3,3]};
