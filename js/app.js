(async()=>{'use strict';
let P;try{P=await(await fetch('./data/project.json')).json()}catch(e){document.querySelector('main').innerHTML='<p>Could not load project data. Open the guide once while online.</p>';return}
const KP=P.projectId+'_';
const PH=P.phases.map(p=>[p.title,p.steps]),CK=Object.fromEntries(P.checklists.map(c=>[c.group,c.items.map(i=>[i.item,i.accept])])),RF=P.runbook.map(r=>[r.title,r.rows]);
document.querySelector('.top h1').textContent=P.shortTitle;document.title=P.docTitle||P.shortTitle;[['meta[name=description]',P.description],['meta[name=apple-mobile-web-app-title]',P.appName]].forEach(([s,v])=>{const m=document.querySelector(s);if(m&&v)m.content=v});document.querySelector('.pheader h1').textContent=P.client+', '+P.location+': '+P.title+' - commissioning checklist';
const $=s=>document.querySelector(s),L=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},S=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// tabs
const tabs=[...document.querySelectorAll('[role=tab]')];
function show(t){if(!document.getElementById(t))t='phases';tabs.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===t));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==t)}
tabs.forEach(b=>b.onclick=()=>{location.hash=b.dataset.t;show(b.dataset.t)});window.onhashchange=()=>show(location.hash.slice(1));show(location.hash.slice(1)||'phases');
let runP=()=>{},runR=()=>{};
// phases
let done=L(KP+'steps',{});
function drawPh(){let tot=0,d=0;$('#phaseList').innerHTML=PH.map((p,i)=>`<details><summary>Phase ${i+1}: ${esc(p[0])}</summary>${p[1].map((s,j)=>{const k=i+'.'+j;tot++;if(done[k])d++;return`<label class="step"><input type="checkbox" data-k="${k}"${done[k]?' checked':''}><span><b>${i+1}.${j+1}</b> ${esc(s)}</span></label>`}).join('')}</details>`).join('');$('#prog').textContent=`${d} of ${tot} steps done (${Math.round(100*d/tot)}%)`;runP()}
$('#phaseList').onchange=e=>{const k=e.target.dataset.k;if(!k)return;const o=[...document.querySelectorAll('#phaseList details')].map(x=>x.open);done[k]=e.target.checked;S(KP+'steps',done);touch();drawPh();document.querySelectorAll('#phaseList details').forEach((x,i)=>x.open=o[i])};drawPh();
// sim
const T=P.topology,act=new Set(),fa=id=>T.faults.find(f=>f.id===id),pth=id=>T.paths.find(p=>p.id===id);
$('#dia').setAttribute('viewBox',T.viewBox);
function status(){const n=act.size,d=[],pa={};T.paths.forEach(p=>{pa[p.id]=!p.blockedBy.some(x=>act.has(x))});
T.services.forEach(s=>{if(!T.paths.filter(p=>p.service===s.id).some(p=>pa[p.id]))d.push(s.lossText)});const o={pa,d};
if(!n)return{...o,c:'ok',t:'NORMAL - FULL REDUNDANCY',d:['All paths healthy.']};
if(d.length)return{...o,c:'bad',t:'CRITICAL - LOSS OF I/O OR VIEW'};
return n===1?{...o,c:'ok',t:'BUMPLESS - REDUNDANT PATH CARRIES 100% LOAD',d:['Single fault. No process disturbance expected; redundancy is reduced.']}:{...o,c:'warn',t:'DEGRADED - SINGLE PATH',d:['Service intact but there is no margin for another fault.']}}
function drawDia(s){const hit=[...act].flatMap(id=>fa(id).hit);
const live=id=>{const q=pth(id),sib=T.paths.filter(x=>x.service===q.service&&x.id!==id);return s.pa[id]&&sib.length>0&&sib.every(x=>!s.pa[x.id])};
const ls=T.links.map(l=>`<polyline points="${l.pts}" class="pl ${l.cls}${l.fault&&act.has(l.fault)?' fail':''}${l.path&&live(l.path)?' live':''}"/>`).join('');
const nd=T.nodes.map(({id,x,y,label})=>{const L2=label.split('|');return`<rect class="nd${hit.includes(id)?' fail':''}" x="${x}" y="${y}" width="${T.nodeW}" height="${T.nodeH}" rx="4"/><text>${L2.map((l,i)=>`<tspan x="${x+T.nodeW/2}" y="${y+(L2.length>1?23+i*18:31)}">${l}</tspan>`).join('')}</text>`}).join('');
const lb=T.labels.map(l=>`<text class="${l.cls}" x="${l.x}" y="${l.y}">${l.fault&&act.has(l.fault)?l.name+' BREAK':!s.pa[l.path]?l.name+' idle ('+l.idle+')':live(l.path)?l.name+' carries 100%':l.name}</text>`).join('');
$('#dia').innerHTML=ls+nd+lb}
function render(){const s=status();document.querySelectorAll('#faults [data-f]').forEach(b=>b.setAttribute('aria-pressed',act.has(b.dataset.f)));
const b=$('#bnr');b.className='bnr '+s.c;b.innerHTML=`<span>${s.t}</span><ul>${s.d.map(x=>`<li>${x}</li>`).join('')}</ul>`;
$('#faultInfo').innerHTML=act.size?(act.size>1?'<p><b>Combined test note:</b> inject faults one at a time, confirm the status after each, and restore in reverse order.</p>':'')+[...act].map(id=>{const f=fa(id);return`<h3>${f.name}</h3><p><b>Expected:</b> ${f.expected}</p><ol>${f.steps.map(x=>`<li>${x}</li>`).join('')}</ol>`}).join(''):'';drawDia(s)}
$('#faults').innerHTML=T.faults.map(f=>`<button class="btn" aria-pressed="false" data-f="${f.id}">${f.name}</button>`).join('')+'<button class="btn" id="fclr">Clear faults</button>';
$('#faults').onclick=e=>{const id=e.target.dataset.f;if(e.target.id==='fclr')act.clear();else if(id)act.has(id)?act.delete(id):act.add(id);else return;render()};render();
// checklists
let ck=L(KP+'checks',{});const flt=$('#flt');Object.keys(CK).forEach(g=>flt.add(new Option(g,g)));const ST=['Pass','Fail','N/A'];
function drawCk(){$('#chkList').innerHTML=Object.entries(CK).filter(([g])=>flt.value==='all'||flt.value===g).map(([g,a])=>`<details open><summary>${esc(g)}</summary>${a.map(([t,c],i)=>{const k=g+'|'+i,v=ck[k]||{s:'',n:''};return`<div class="item"><div class="t"><b>${i+1}. ${esc(t)}</b><br><span class="muted">Accept: ${esc(c)}</span></div><div class="pills" role="group" aria-label="Status: ${esc(t)}">${ST.map(o=>`<button class="btn pill2" data-k="${esc(k)}" data-v="${o}" aria-pressed="${v.s===o}">${o}</button>`).join('')}</div><textarea data-n="${esc(k)}" rows="2" placeholder="Engineer note" aria-label="Note: ${esc(t)}">${esc(v.n)}</textarea><div class="po"><b>${esc(v.s||'Not set')}</b> ${esc(v.n)}</div></div>`}).join('')}</details>`).join('');sum()}
function sum(){let p=0,f=0,n=0,t=0;Object.entries(CK).forEach(([g,a])=>a.forEach((x,i)=>{t++;const s=(ck[g+'|'+i]||{}).s;if(s==='Pass')p++;else if(s==='Fail')f++;else if(s==='N/A')n++}));const d=p+f+n;$('#sumbar').innerHTML=`<div class="cn"><span>Pass ${p}</span><span>Fail ${f}</span><span>N/A ${n}</span><span>Remaining ${t-d}</span></div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${d}" aria-label="Checklist progress"><i style="width:${t?Math.round(100*d/t):0}%"></i></div>`}
$('#chkList').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k;ck[k]=ck[k]||{s:'',n:''};ck[k].s=ck[k].s===b.dataset.v?'':b.dataset.v;S(KP+'checks',ck);touch();b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',ck[k].s===x.dataset.v));sum()};
$('#chkList').oninput=e=>{const k=e.target.dataset.n;if(!k)return;ck[k]=ck[k]||{s:'',n:''};ck[k].n=e.target.value;S(KP+'checks',ck);touch()};flt.onchange=drawCk;drawCk();
const rows=()=>Object.entries(CK).flatMap(([g,a])=>a.map(([t,c],i)=>({group:g,item:t,acceptance:c,status:(ck[g+'|'+i]||{}).s||'',note:(ck[g+'|'+i]||{}).n||''})));
const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:m}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)};
$('#expJ').onclick=()=>shareOut(P.projectId+'-backup.json',JSON.stringify({app:'pcs7-guide',projectId:P.projectId,version:1,exported:new Date().toISOString(),steps:done,checks:ck,loops:lp,ioList:io,rows:rows()},null,2),'application/json');
function say(t){const m=$('#msg');m.textContent=t;m.hidden=false;clearTimeout(say.t);say.t=setTimeout(()=>{m.hidden=true},5000)}
function restore(d){const steps={},checks={};let bad=0,ioNew=null,lpNew=null;
if(Array.isArray(d)){d.forEach(r=>{const i=r&&CK[r.group]?CK[r.group].findIndex(x=>x[0]===r.item):-1;if(i<0||!ST.concat('').includes(r.status))return bad++;checks[r.group+'|'+i]={s:r.status,n:String(r.note||'').slice(0,2000)}})}
else{if(!d||typeof d!=='object'||d.projectId!==P.projectId)throw Error('this backup is not for project '+P.projectId);
if(typeof d.steps!=='object'||typeof d.checks!=='object'||!d.steps||!d.checks)throw Error('steps or checks missing');
for(const[k,v]of Object.entries(d.steps)){const m=/^(\d+)\.(\d+)$/.exec(k);if(m&&PH[+m[1]]&&PH[+m[1]][1][+m[2]]!==undefined&&v===true)steps[k]=true;else bad++}
for(const[k,v]of Object.entries(d.checks)){const[g,i]=k.split('|');if(v&&CK[g]&&CK[g][+i]&&ST.concat('').includes(v.s)&&typeof v.n==='string')checks[k]={s:v.s,n:v.n.slice(0,2000)};else bad++}}
const ns=Object.keys(steps).length,nc=Object.keys(checks).length;if(!Array.isArray(d)){if(Array.isArray(d.ioList))ioNew=d.ioList.filter(x=>x&&typeof x.tag==='string'&&x.tag&&x.tag.length<=40).slice(0,5000).map(x=>({tag:x.tag,desc:String(x.desc||'').slice(0,120),type:IOT.includes(x.type)?x.type:''}));if(d.loops&&typeof d.loops==='object'){lpNew={};for(const[t,v]of Object.entries(d.loops))if(v&&typeof v==='object'&&t.length<=40)lpNew[t]={sig:v.sig===true,fp:v.fp===true,il:v.il===true,n:typeof v.n==='string'?v.n.slice(0,200):''}}}
if(!ns&&!nc&&!(ioNew&&ioNew.length)&&!(lpNew&&Object.keys(lpNew).length))throw Error('no valid entries found');
if(!confirm('Replace current progress with '+ns+' steps and '+nc+' checklist entries?'))return null;
const sn=snap();done=steps;ck=checks;S(KP+'steps',done);S(KP+'checks',ck);if(ioNew&&ioNew.length){io=ioNew;S(KP+'iolist',io)}if(lpNew){lp=lpNew;S(KP+'loops',lp)}drawPh();drawCk();drawIO();return{ns,nc,bad,sn}}
$('#impB').onclick=()=>$('#impF').click();
$('#impF').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>2e6)throw Error('file too large');const r=restore(JSON.parse(await f.text()));r?undoable('Restored '+r.ns+' steps and '+r.nc+' checklist entries'+(r.bad?' ('+r.bad+' invalid skipped)':'')+'.',r.sn):say('Import cancelled.')}catch(x){say('Import failed: '+x.message)}};
$('#expC').onclick=()=>shareOut('aradet-checklists.csv','group,item,acceptance,status,note\n'+rows().map(r=>[r.group,r.item,r.acceptance,r.status,r.note].map(qc).join(',')).join('\n'),'text/csv');
$('#prt').onclick=()=>{document.body.dataset.print='checks';drawCk();window.print()};addEventListener('beforeprint',drawCk);addEventListener('afterprint',()=>{delete document.body.dataset.print});
$('#rst').onclick=()=>{if(confirm('Clear all checklist results?')){const s=snap();ck={};S(KP+'checks',ck);touch();drawCk();undoable('Checklist cleared.',s)}};
// reference
$('#refList').innerHTML=RF.map(([t,r])=>`<details><summary>${esc(t)}</summary><div class="scroll"><table><tbody>${r.map(x=>`<tr><th scope="row">${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
const filt=(root,q,item)=>{q=q.trim().toLowerCase();let n=0;root.querySelectorAll('details').forEach(d=>{const tm=d.querySelector('summary').textContent.toLowerCase().includes(q);let v=0;d.querySelectorAll(item).forEach(el=>{const sh=!q||tm||el.textContent.toLowerCase().includes(q);el.hidden=!sh;if(sh)v++});d.hidden=!!q&&!v;if(q&&v)d.open=true;n+=q?v:0});return n};
const wireS=(id,root,item,cnt)=>{const i=$('#'+id),run=()=>{const n=filt($(root),i.value,item);$(cnt).textContent=i.value.trim()?n+(n===1?' match':' matches'):''};i.oninput=run;document.querySelector('[data-clr='+id+']').onclick=()=>{i.value='';run();i.focus()};return run};
runP=wireS('qp','#phaseList','.step','#cp');runR=wireS('qr','#refList','tr','#cr');runP();runR();
// io loops
const IOT=['AI','AO','DI','DO'],CHK=[['sig','4-20mA / Signal'],['fp','SCADA Faceplate'],['il','Interlock / Alarm']],qc=v=>{let s=String(v);if(/^[=+\-@]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"'};
let io=L(KP+'iolist',null)||P.ioLoops,lp=L(KP+'loops',{});
function parseCSV(t){const r=[];let row=[],f='',q=false;t=t.replace(/^\uFEFF/,'');for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=c}else if(c=='"')q=true;else if(c==','||c==';'||c=='\t'){row.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;row.push(f);r.push(row);row=[];f=''}else f+=c}row.push(f);r.push(row);return r.filter(x=>x.some(v=>v.trim()))}
function ioSum(){let c=0;const k={sig:0,fp:0,il:0};io.forEach(x=>{const v=lp[x.tag]||{};CHK.forEach(([a])=>{if(v[a])k[a]++});if(v.sig&&v.fp&&v.il)c++});const t=io.length;$('#iosum').innerHTML=`<div class="cn"><span>Loops complete ${c} of ${t}</span><span>Signal ${k.sig}</span><span>Faceplate ${k.fp}</span><span>Interlock ${k.il}</span></div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${c}" aria-label="Loop verification progress"><i style="width:${t?Math.round(100*c/t):0}%"></i></div>`}
function drawIO(){const q=$('#qi').value.trim().toLowerCase(),ty=$('#ft').value;let n=0;$('#ioList').innerHTML=io.filter(x=>(ty==='all'||x.type===ty)&&(!q||(x.tag+' '+x.desc+' '+((lp[x.tag]||{}).n||'')).toLowerCase().includes(q))).map(x=>{n++;const v=lp[x.tag]||{};return`<div class="loop"><div><b>${esc(x.tag)}</b> <span class="tp">${esc(x.type||'?')}</span><br><span class="muted">${esc(x.desc)}</span></div><div class="cks">${CHK.map(([a,l])=>`<label class="lc"><input type="checkbox" data-t="${esc(x.tag)}" data-c="${a}"${v[a]?' checked':''}><span>${l}</span></label>`).join('')}</div><input type="text" class="ln" data-nt="${esc(x.tag)}" maxlength="200" placeholder="Loop / terminal note..." aria-label="Note: ${esc(x.tag)}" value="${esc(v.n||'')}"></div>`}).join('')||'<p class="muted">No loops match.</p>';$('#ci').textContent=n+' of '+io.length+' shown';ioSum()}
$('#ioList').onchange=e=>{const t=e.target.dataset.t;if(!t)return;lp[t]=lp[t]||{};lp[t][e.target.dataset.c]=e.target.checked;S(KP+'loops',lp);touch();ioSum()};
$('#ioList').oninput=e=>{const t=e.target.dataset.nt;if(!t)return;lp[t]=lp[t]||{};lp[t].n=e.target.value.slice(0,200);S(KP+'loops',lp);touch()};$('#qi').oninput=drawIO;$('#ft').onchange=drawIO;document.querySelector('[data-clr=qi]').onclick=()=>{$('#qi').value='';drawIO();$('#qi').focus()};
$('#ioImp').onclick=()=>$('#ioF').click();
$('#ioF').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>3e6)throw Error('file too large');const r=parseCSV(await f.text());if(!r.length)throw Error('file is empty');
const h=r[0].map(x=>x.trim().toLowerCase());let ti=h.findIndex(x=>/^(tag|instrument|loop)/.test(x)),di,yi;const hasH=ti>=0;
if(hasH){di=h.findIndex((x,i)=>i!==ti&&/desc|service|name/.test(x));yi=h.findIndex(x=>/^(type|io ?type|signal)/.test(x))}else{ti=0;di=1;yi=2}
const seen=new Set(),res=[];let bad=0;r.slice(hasH?1:0,5001).forEach(c=>{const tag=(c[ti]||'').trim(),ty=(c[yi]||'').trim().toUpperCase();if(!tag||tag.length>40||seen.has(tag)){bad++;return}seen.add(tag);res.push({tag,desc:(c[di]||'').trim().slice(0,120),type:IOT.includes(ty)?ty:''})});
if(!res.length)throw Error('no valid tags found (a Tag column is needed)');
if(!confirm('Replace the I/O list with '+res.length+' loops? Check progress is kept for matching tags.')){say('Import cancelled.');return}
const sn=snap();io=res;S(KP+'iolist',io);touch();drawIO();undoable('Loaded '+res.length+' loops'+(bad?' ('+bad+' rows skipped)':'')+'.',sn)}catch(x){say('CSV import failed: '+x.message)}};
$('#ioExp').onclick=()=>shareOut(P.projectId+'-io-loops.csv','tag,description,type,signal,faceplate,interlock_alarm,note\n'+io.map(x=>{const v=lp[x.tag]||{};return[x.tag,x.desc,x.type,v.sig?'Y':'',v.fp?'Y':'',v.il?'Y':'',v.n||''].map(qc).join(',')}).join('\n'),'text/csv');
$('#ioRst').onclick=()=>{if(confirm('Restore the starter I/O list from project.json? Check progress is kept.')){const sn=snap();io=P.ioLoops;try{localStorage.removeItem(KP+'iolist')}catch{}touch();drawIO();undoable('Starter list restored.',sn)}};
drawIO();
async function shareOut(name,text,mime){const ua=navigator.userAgent,mob=/Android|iPhone|iPad|Mobi/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
if(mob&&navigator.canShare&&navigator.share){try{const f=new File([text],name,{type:mime});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:P.shortTitle,text:name});mark();return}}catch(e){if(e.name==='AbortError')return}}
dl(name,text,mime);mark()}
let wl=null,want=false;const wb=$('#wake');
async function wake(on){want=on;if(!on){try{if(wl)await wl.release()}catch{}wl=null;wb.setAttribute('aria-pressed','false');return}
if(!('wakeLock' in navigator)){want=false;say('Keep-awake is not supported on this browser. Extend Auto-Lock in device settings instead.');return}
try{wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>wb.setAttribute('aria-pressed','false'));wb.setAttribute('aria-pressed','true')}catch(e){want=false;say('Could not keep the screen awake: '+e.message)}}
wb.onclick=()=>wake(wb.getAttribute('aria-pressed')!=='true');
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&want&&(!wl||wl.released))wake(true)});
// backup reminder, undo, punch list
if(!L(KP+'firstRun',0))S(KP+'firstRun',Date.now());let bkOff=false;
function bk(){const d=L(KP+'dirty',0),base=L(KP+'lastExport',0)||L(KP+'firstRun',0)||d;$('#bk').hidden=bkOff||!d||Date.now()-base<=864e5}
function touch(){if(!L(KP+'dirty',0))S(KP+'dirty',Date.now());bk()}
function mark(){S(KP+'lastExport',Date.now());S(KP+'dirty',0);bk()}
$('#bkExp').onclick=()=>$('#expJ').click();$('#bkX').onclick=()=>{bkOff=true;bk()};setInterval(bk,6e5);document.addEventListener('visibilitychange',bk);bk();
const snap=()=>JSON.parse(JSON.stringify({done,ck,lp,io,custom:L(KP+'iolist',null)}));
function setAll(s){done=s.done;ck=s.ck;lp=s.lp;io=s.io;S(KP+'steps',done);S(KP+'checks',ck);S(KP+'loops',lp);try{if(s.custom)S(KP+'iolist',s.custom);else localStorage.removeItem(KP+'iolist')}catch{}touch();drawPh();drawCk();drawIO()}
function undoable(msg,s){const m=$('#msg');m.textContent=msg+' ';const b=document.createElement('button');b.className='btn amber';b.textContent='Undo';b.onclick=()=>{setAll(s);say('Undone.')};m.appendChild(b);m.hidden=false;clearTimeout(say.t);say.t=setTimeout(()=>{m.hidden=true},12000)}
const today=()=>new Date().toISOString().slice(0,10);
function punch(name,hdr,rs){if(!rs.length){say('Nothing to export: no failed or open items.');return}shareOut(P.projectId+'-punchlist-'+name+'-'+today()+'.csv',hdr+'\n'+rs.map(r=>r.map(qc).join(',')).join('\n'),'text/csv')}
$('#pnC').onclick=()=>punch('checklists','Item,Group,Status,Engineer Notes',rows().filter(r=>r.status!=='Pass'&&r.status!=='N/A').map(r=>[r.item,r.group,r.status||'Open',r.note]));
$('#pnI').onclick=()=>punch('io-loops','Tag,Type,Status,Engineer Notes',io.map(x=>{const v=lp[x.tag]||{},m=CHK.filter(([a])=>!v[a]).map(([,l])=>l);return[x.tag,x.type,m.length?'Open':'',m.length?'Missing: '+m.join('; ')+(v.n?' | Note: '+v.n:''):'']}).filter(r=>r[2]));
// field calc
const ci=id=>$('#'+id),num=v=>{const x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:null},f3=x=>String(Math.round(x*1000)/1000);
function calc(src){const lo=num(ci('lrv').value),hi=num(ci('urv').value);ci('ulab').textContent=ci('unit').value||'EU';const r=ci('cres');
if(lo===null||hi===null||lo===hi){r.textContent='Enter different LRV and URV values.';return}
let pc;if(src==='cma'){const m=num(ci('cma').value);if(m===null)return;pc=(m-4)/16*100}else if(src==='ceu'){const e=num(ci('ceu').value);if(e===null)return;pc=(e-lo)/(hi-lo)*100}else{pc=num(ci('cpc').value);if(pc===null)return}
const m=4+pc*.16,e=lo+pc/100*(hi-lo);if(src!=='cma')ci('cma').value=f3(m);if(src!=='cpc')ci('cpc').value=f3(pc);if(src!=='ceu')ci('ceu').value=f3(e);
r.textContent=(m<3.8||m>20.5)?'Outside 3.8 to 20.5 mA: check for a loop fault or over-range.':'Within the normal signal range.'}
['lrv','urv','unit'].forEach(i=>ci(i).oninput=()=>calc('cma'));['cma','cpc','ceu'].forEach(i=>ci(i).oninput=()=>calc(i));
ci('pre').onclick=e=>{const m=e.target.dataset.ma;if(m){ci('cma').value=m;calc('cma')}};calc('cma');
const BD=[['9.6 kbps',1200],['19.2 kbps',1200],['45.45 kbps',1200],['93.75 kbps',1200],['187.5 kbps',1000],['500 kbps',400],['1.5 Mbps',200],['3 Mbps',100],['6 Mbps',100],['12 Mbps',100]];
ci('bd').innerHTML=BD.map((b,i)=>`<option value="${i}">${b[0]}</option>`).join('');ci('bd').value=6;
function pbc(){const i=+ci('bd').value,b=BD[i],len=num(ci('sl').value),st=num(ci('sn').value),m=[`Max copper segment length (cable type A): ${b[1]} m. Max 32 stations per segment; repeaters count as stations.`,i>=7?'No spur lines at 3 Mbps and above.':'Spur lines only within the Siemens-permitted lengths (shorter at higher baud rates); prefer none.'];
if(len!==null&&len>b[1])m.push(`Length ${len} m exceeds ${b[1]} m: add a repeater or OLM, or lower the baud rate.`);
if(st!==null&&st>32)m.push(`${st} stations exceeds 32: add a repeater to split the segment.`);ci('pres').innerHTML=m.map(x=>`<li>${x}</li>`).join('')}
['bd','sl','sn'].forEach(i=>{ci(i).oninput=pbc;ci(i).onchange=pbc});pbc();
// theme, net, install, sw
const root=document.documentElement,tm=$('meta[name=theme-color]');
function theme(t){root.dataset.theme=t;tm.content=t==='light'?'#ffffff':'#14181d'}theme(L(KP+'theme','dark'));$('#theme').onclick=()=>{const t=root.dataset.theme==='light'?'dark':'light';S(KP+'theme',t);theme(t)};
const net=()=>{$('#net').textContent=navigator.onLine?'Online':'Offline';$('#net').classList.toggle('off',!navigator.onLine)};addEventListener('online',net);addEventListener('offline',net);net();
let dp;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('#install').hidden=false});
if(/iphone|ipad/i.test(navigator.userAgent)&&!navigator.standalone)$('#install').hidden=false;
$('#install').onclick=async()=>{if(dp){dp.prompt();await dp.userChoice;dp=null;$('#install').hidden=true}else{$('#iosMsg').textContent=/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)?'You are not in Apple Safari. Copy this page address, open it in Safari, then tap Share, then Add to Home Screen, then Add. The app will open full-screen.':'Open this page in Apple Safari (not Chrome or another iOS browser). Tap Share, then Add to Home Screen, then Add. The app will open full-screen in standalone mode.';$('#ios').showModal()}};
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(r=>{const w=r.waiting;if(w&&navigator.serviceWorker.controller)ask(w);r.onupdatefound=()=>{const n=r.installing;n.onstatechange=()=>{if(n.state==='installed'&&navigator.serviceWorker.controller)ask(n)}}}).catch(()=>{}));
function ask(w){$('#toast').hidden=false;$('#reload').onclick=()=>{w.postMessage('SKIP_WAITING');navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload())}}
})();
