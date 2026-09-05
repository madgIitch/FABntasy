const CACHE="fabntasy-shell-v1",PUBLIC_ASSETS=["/offline","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_ASSETS))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).catch(()=>caches.match("/offline")));return}if(PUBLIC_ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request))) });
