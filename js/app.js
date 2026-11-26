(async()=>{'use strict';
let P;try{P=await(await fetch('./data/project.json')).json()}catch(e){document.querySelector('main').innerHTML='<p>Could not load project data. Open the guide once while online.</p>';return}
const KP=P.projectId+'_';
const PH=P.phases.map(p=>[p.title,p.steps]),CK=Object.fromEntries(P.checklists.map(c=>[c.group,c.items.map(i=>[i.item,i.accept])])),RF=P.runbook.map(r=>[r.title,r.rows]);
document.querySelector('.top h1').textContent=P.shortTitle;document.querySelector('.pheader h1').textContent=P.client+', '+P.location+': '+P.title+' - commissioning checklist';
const $=s=>document.querySelector(s),L=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},S=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const FA=[
{id:'cpu0',n:'CPU-0 rack failure',hit:['cpu0'],lines:[],why:'CPU-1 takes over as master with no process upset.',st:['Pull power on rack 0 or set CPU-0 to STOP','Confirm CPU-1 LED shows master and REDF is off','Check outputs held steady and OB72/OB82 entries logged','Restore rack 0; run resync and confirm return to redundant mode']},
{id:'cpu1',n:'CPU-1 rack failure',hit:['cpu1'],lines:[],why:'Rack 0 path (Line A) stays master; Line B has no controller driving it.',st:['Pull power on rack 1 or set CPU-1 to STOP','Confirm CPU-0 stays master and the outputs hold steady','Check OB72 entries and REDF on the surviving CPU','Restore rack 1; run resync and confirm redundant mode']},{id:'pbA',n:'PROFIBUS line A break',hit:[],lines:['la'],why:'Traffic continues on line B; diagnostic alarm raised.',st:['Disconnect line A at an OLM or Y-Link','Confirm OB86 and OB122 diagnostics are raised','Confirm all slaves stay in data exchange on line B','Reconnect and verify redundancy restored with no stale values']},
{id:'pbB',n:'PROFIBUS line B break',hit:[],lines:['lb'],why:'Line A carries all traffic; diagnostic alarm raised and redundancy reported lost.',st:['Disconnect line B at an OLM or Y-Link','Confirm OB86/OB70 diagnostics are raised','Confirm all slaves stay in data exchange on line A','Reconnect and verify redundancy restored']},{id:'osA',n:'OS Server A offline',hit:['osa'],lines:[],why:'Clients switch to OS_SRV_B; archive gap is backfilled on return.',st:['Stop the WinCC runtime or power off OS_SRV_A','Confirm clients reconnect to OS_SRV_B','Check alarms still arrive and tag values update','Restart A; confirm archive synchronization completes']},
{id:'osB',n:'OS Server B offline',hit:['osb'],lines:[],why:'Clients stay on OS_SRV_A; archive gap on B is backfilled on return.',st:['Stop WinCC runtime or power off OS_SRV_B','Confirm clients and alarms stay on OS_SRV_A','Restart B; confirm archive synchronization completes']},{id:'ring',n:'SCALANCE ring port break',hit:['sw'],lines:['lr'],why:'MRP closes the ring within the configured recovery time.',st:['Unplug one ring cable between two SCALANCE switches','Confirm MRP manager reports ring open and recovery in SINEC NMS','Verify no OS client or AS packet loss during recovery','Reconnect; confirm ring is closed and the trap clears']}];
const ND={cpu0:[20,20,"S7-410H Rack 0"],cpu1:[20,120,"S7-410H Rack 1"],ylk:[250,70,"Y-Link"],rio:[480,70,"Remote I/O"],sw:[250,250,"SCALANCE ring"],osa:[15,215,"OS_SRV_A"],osb:[15,285,"OS_SRV_B"],cli:[480,215,"OS clients"],nms:[480,285,"SINEC NMS"]};
// tabs
const tabs=[...document.querySelectorAll('[role=tab]')];
function show(t){if(!document.getElementById(t))t='phases';tabs.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==t)}
tabs.forEach(b=>b.onclick=()=>{location.hash=b.dataset.t;show(b.dataset.t)});window.onhashchange=()=>show(location.hash.slice(1));show(location.hash.slice(1)||'phases');
let runP=()=>{},runR=()=>{};
// phases
let done=L(KP+'steps',{});
function drawPh(){let tot=0,d=0;$('#phaseList').innerHTML=PH.map((p,i)=>`<details><summary>Phase ${i+1}: ${esc(p[0])}</summary>${p[1].map((s,j)=>{const k=i+'.'+j;tot++;if(done[k])d++;return`<label class="step"><input type="checkbox" data-k="${k}"${done[k]?' checked':''}><span><b>${i+1}.${j+1}</b> ${esc(s)}</span></label>`}).join('')}</details>`).join('');$('#prog').textContent=`${d} of ${tot} steps done (${Math.round(100*d/tot)}%)`;runP()}
$('#phaseList').onchange=e=>{const k=e.target.dataset.k;if(!k)return;const o=[...document.querySelectorAll('#phaseList details')].map(x=>x.open);done[k]=e.target.checked;S(KP+'steps',done);drawPh();document.querySelectorAll('#phaseList details').forEach((x,i)=>x.open=o[i])};drawPh();
// sim
const act=new Set(),fa=id=>FA.find(f=>f.id===id);
function status(){const p0=!act.has('cpu0')&&!act.has('pbA'),p1=!act.has('cpu1')&&!act.has('pbB'),n=act.size,d=[];
if(!p0&&!p1)d.push('Loss of I/O: neither Rack 0 (Line A) nor Rack 1 (Line B) can reach the field bus.');
if(act.has('osA')&&act.has('osB'))d.push('Loss of view: both OS servers are offline, so no operator view or archiving.');
const o={p0,p1,d};
if(!n)return{...o,c:'ok',t:'NORMAL - FULL REDUNDANCY',d:['All paths healthy.']};
if(d.length)return{...o,c:'bad',t:'CRITICAL - LOSS OF I/O OR VIEW'};
return n===1?{...o,c:'ok',t:'BUMPLESS - REDUNDANT PATH CARRIES 100% LOAD',d:['Single fault. No process disturbance expected; redundancy is reduced.']}:{...o,c:'warn',t:'DEGRADED - SINGLE PATH',d:['Service intact but there is no margin for another fault.']}}
function drawDia(s){const hit=[...act].flatMap(id=>fa(id).hit),ln=[...act].flatMap(id=>fa(id).lines),A=ln.includes('la'),B=ln.includes('lb');
const pl=(p,c,bad,live)=>`<polyline points="${p}" class="pl ${c}${bad?' fail':''}${live?' live':''}"/>`;
const la=s.p0&&!s.p1,lb=s.p1&&!s.p0;
const eth=[[85,164,270,250],[145,237,250,264],[145,307,250,280],[380,264,480,237],[380,280,480,307,'lr']];
const ls=eth.map(([a,b,c,d,k])=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" class="${k&&ln.includes(k)?'fail':''}"/>`).join('')+pl('150,42 200,42 200,78 250,78','pa',A,la)+pl('380,78 480,78','pa',A,la)+pl('150,142 200,142 200,104 250,104','pb',B,lb)+pl('380,104 480,104','pb',B,lb);
const nd=Object.entries(ND).map(([k,[x,y,t]])=>`<rect class="nd${hit.includes(k)?' fail':''}" x="${x}" y="${y}" width="130" height="44" rx="4"/><text x="${x+65}" y="${y+26}">${t}</text>`).join('');
const sA=A?'Line A BREAK':!s.p0?'Line A idle (Rack 0 down)':la?'Line A carries 100%':'Line A',sB=B?'Line B BREAK':!s.p1?'Line B idle (Rack 1 down)':lb?'Line B carries 100%':'Line B';
$('#dia').innerHTML=ls+nd+`<text class="ta" x="430" y="68">${sA}</text><text class="tb" x="430" y="128">${sB}</text><text class="lg" x="15" y="345">Green: PROFIBUS Line A. Orange: PROFIBUS Line B. Teal: Ethernet. Red dashed: fault.</text>`}
function render(){const s=status();document.querySelectorAll('#faults [data-f]').forEach(b=>b.setAttribute('aria-pressed',act.has(b.dataset.f)));
const b=$('#bnr');b.className='bnr '+s.c;b.innerHTML=`<span>${s.t}</span><ul>${s.d.map(x=>`<li>${x}</li>`).join('')}</ul>`;
$('#faultInfo').innerHTML=act.size?(act.size>1?'<p><b>Combined test note:</b> inject faults one at a time, confirm the status after each, and restore in reverse order.</p>':'')+[...act].map(id=>{const f=fa(id);return`<h3>${f.n}</h3><p><b>Expected:</b> ${f.why}</p><ol>${f.st.map(x=>`<li>${x}</li>`).join('')}</ol>`}).join(''):'<p class="muted">No fault selected. Toggle one or more faults.</p>';drawDia(s)}
$('#faults').innerHTML=FA.map(f=>`<button class="btn" aria-pressed="false" data-f="${f.id}">${f.n}</button>`).join('')+'<button class="btn" id="fclr">Clear faults</button>';
$('#faults').onclick=e=>{const id=e.target.dataset.f;if(e.target.id==='fclr')act.clear();else if(id)act.has(id)?act.delete(id):act.add(id);else return;render()};render();
// checklists
let ck=L(KP+'checks',{});const flt=$('#flt');Object.keys(CK).forEach(g=>flt.add(new Option(g,g)));const ST=['Pass','Fail','N/A'];
function drawCk(){$('#chkList').innerHTML=Object.entries(CK).filter(([g])=>flt.value==='all'||flt.value===g).map(([g,a])=>`<details open><summary>${esc(g)}</summary>${a.map(([t,c],i)=>{const k=g+'|'+i,v=ck[k]||{s:'',n:''};return`<div class="item"><div class="t"><b>${i+1}. ${esc(t)}</b><br><span class="muted">Accept: ${esc(c)}</span></div><div class="pills" role="group" aria-label="Status: ${esc(t)}">${ST.map(o=>`<button class="btn pill2" data-k="${esc(k)}" data-v="${o}" aria-pressed="${v.s===o}">${o}</button>`).join('')}</div><textarea data-n="${esc(k)}" rows="2" placeholder="Engineer note" aria-label="Note: ${esc(t)}">${esc(v.n)}</textarea><div class="po"><b>${esc(v.s||'Not set')}</b> ${esc(v.n)}</div></div>`}).join('')}</details>`).join('')}
$('#chkList').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k;ck[k]=ck[k]||{s:'',n:''};ck[k].s=ck[k].s===b.dataset.v?'':b.dataset.v;S(KP+'checks',ck);b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',ck[k].s===x.dataset.v))};
$('#chkList').oninput=e=>{const k=e.target.dataset.n;if(!k)return;ck[k]=ck[k]||{s:'',n:''};ck[k].n=e.target.value;S(KP+'checks',ck)};flt.onchange=drawCk;drawCk();
const rows=()=>Object.entries(CK).flatMap(([g,a])=>a.map(([t,c],i)=>({group:g,item:t,acceptance:c,status:(ck[g+'|'+i]||{}).s||'',note:(ck[g+'|'+i]||{}).n||''})));
const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
$('#expJ').onclick=()=>dl(P.projectId+'-backup.json',JSON.stringify({app:'pcs7-guide',projectId:P.projectId,version:1,exported:new Date().toISOString(),steps:done,checks:ck,rows:rows()},null,2),'application/json');
function say(t){const m=$('#msg');m.textContent=t;m.hidden=false;clearTimeout(say.t);say.t=setTimeout(()=>{m.hidden=true},5000)}
function restore(d){const steps={},checks={};let bad=0;
if(Array.isArray(d)){d.forEach(r=>{const i=r&&CK[r.group]?CK[r.group].findIndex(x=>x[0]===r.item):-1;if(i<0||!ST.concat('').includes(r.status))return bad++;checks[r.group+'|'+i]={s:r.status,n:String(r.note||'').slice(0,2000)}})}
else{if(!d||typeof d!=='object'||d.projectId!==P.projectId)throw Error('this backup is not for project '+P.projectId);
if(typeof d.steps!=='object'||typeof d.checks!=='object'||!d.steps||!d.checks)throw Error('steps or checks missing');
for(const[k,v]of Object.entries(d.steps)){const m=/^(\d+)\.(\d+)$/.exec(k);if(m&&PH[+m[1]]&&PH[+m[1]][1][+m[2]]!==undefined&&v===true)steps[k]=true;else bad++}
for(const[k,v]of Object.entries(d.checks)){const[g,i]=k.split('|');if(v&&CK[g]&&CK[g][+i]&&ST.concat('').includes(v.s)&&typeof v.n==='string')checks[k]={s:v.s,n:v.n.slice(0,2000)};else bad++}}
const ns=Object.keys(steps).length,nc=Object.keys(checks).length;if(!ns&&!nc)throw Error('no valid entries found');
if(!confirm('Replace current progress with '+ns+' steps and '+nc+' checklist entries?'))return null;
done=steps;ck=checks;S(KP+'steps',done);S(KP+'checks',ck);drawPh();drawCk();return{ns,nc,bad}}
$('#impB').onclick=()=>$('#impF').click();
$('#impF').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>2e6)throw Error('file too large');const r=restore(JSON.parse(await f.text()));say(r?'Restored '+r.ns+' steps and '+r.nc+' checklist entries'+(r.bad?' ('+r.bad+' invalid skipped)':'')+'.':'Import cancelled.')}catch(x){say('Import failed: '+x.message)}};
$('#expC').onclick=()=>dl('aradet-checklists.csv','group,item,acceptance,status,note\n'+rows().map(r=>[r.group,r.item,r.acceptance,r.status,r.note].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');
$('#prt').onclick=()=>{document.body.dataset.print='checks';drawCk();window.print()};addEventListener('beforeprint',drawCk);addEventListener('afterprint',()=>{delete document.body.dataset.print});
$('#rst').onclick=()=>{if(confirm('Clear all checklist results?')){ck={};S(KP+'checks',ck);drawCk()}};
// reference
$('#refList').innerHTML=RF.map(([t,r])=>`<details><summary>${esc(t)}</summary><div class="scroll"><table><tbody>${r.map(x=>`<tr><th scope="row">${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
const filt=(root,q,item)=>{q=q.trim().toLowerCase();let n=0;root.querySelectorAll('details').forEach(d=>{const tm=d.querySelector('summary').textContent.toLowerCase().includes(q);let v=0;d.querySelectorAll(item).forEach(el=>{const sh=!q||tm||el.textContent.toLowerCase().includes(q);el.hidden=!sh;if(sh)v++});d.hidden=!!q&&!v;if(q&&v)d.open=true;n+=q?v:0});return n};
const wireS=(id,root,item,cnt)=>{const i=$('#'+id),run=()=>{const n=filt($(root),i.value,item);$(cnt).textContent=i.value.trim()?n+(n===1?' match':' matches'):''};i.oninput=run;document.querySelector('[data-clr='+id+']').onclick=()=>{i.value='';run();i.focus()};return run};
runP=wireS('qp','#phaseList','.step','#cp');runR=wireS('qr','#refList','tr','#cr');runP();runR();
// theme, net, install, sw
const root=document.documentElement,tm=$('meta[name=theme-color]');
function theme(t){root.dataset.theme=t;tm.content=t==='light'?'#f3f5f7':'#14181d'}theme(L(KP+'theme','dark'));$('#theme').onclick=()=>{const t=root.dataset.theme==='light'?'dark':'light';S(KP+'theme',t);theme(t)};
const net=()=>{$('#net').textContent=navigator.onLine?'Online':'Offline';$('#net').classList.toggle('off',!navigator.onLine)};addEventListener('online',net);addEventListener('offline',net);net();
let dp;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('#install').hidden=false});
if(/iphone|ipad/i.test(navigator.userAgent)&&!navigator.standalone)$('#install').hidden=false;
$('#install').onclick=async()=>{if(dp){dp.prompt();await dp.userChoice;dp=null;$('#install').hidden=true}else $('#ios').showModal()};
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(r=>{const w=r.waiting;if(w&&navigator.serviceWorker.controller)ask(w);r.onupdatefound=()=>{const n=r.installing;n.onstatechange=()=>{if(n.state==='installed'&&navigator.serviceWorker.controller)ask(n)}}}).catch(()=>{}));
function ask(w){$('#toast').hidden=false;$('#reload').onclick=()=>{w.postMessage('SKIP_WAITING');navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload())}}
})();
