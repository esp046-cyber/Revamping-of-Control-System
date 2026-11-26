const PREFIX='aradet-pcs7-guide-';const CACHE_NAME=PREFIX+'v1.4.1';
const ASSETS=['./','./index.html','./offline.html','./manifest.webmanifest','./css/styles.css','./js/app.js','./data/project.json','./favicon.svg','./favicon.ico','./apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-192.png','./icons/icon-maskable-512.png','./icons/favicon-16x16.png','./icons/favicon-32x32.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith(PREFIX)&&n!==CACHE_NAME).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(CACHE_NAME).then(h=>h.put(r,c));return x}).catch(()=>caches.match(r).then(m=>m||caches.match('./offline.html'))));return}
 e.respondWith(caches.match(r).then(m=>{const n=fetch(r).then(x=>{const c=x.clone();caches.open(CACHE_NAME).then(h=>h.put(r,c));return x}).catch(()=>m);return m||n}));
});
