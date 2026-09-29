const CACHE='quire-shell-v23';
const SHELL=[
  './','./index.html','./styles.css','./manifest.webmanifest','./quire-icon.svg',
  './data-model.js','./projects.js','./chapter-editor.js','./evidence-writing.js','./thesis-map.js',
  './cloud.js','./pdf-reader.js','./ocr.js','./metadata.js','./copilot.js','./references.js',
  './citations.js','./inline-references.js','./synthesis.js','./methodology.js','./writing-review.js',
  './evidence-check.js','./supervision.js','./thesis-export.js','./progress-intelligence.js',
  './product-polish.js','./app.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('quire-shell-')&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

function trustedStatic(url){
  return ['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname);
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);

  if(url.hostname.endsWith('.supabase.co')||url.hostname==='api.crossref.org')return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
        return response;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(request).then(cached=>{
        const network=fetch(request).then(response=>{
          if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
          return response;
        }).catch(()=>cached);
        return cached||network;
      })
    );
    return;
  }

  if(trustedStatic(url)){
    event.respondWith(
      caches.match(request).then(cached=>cached||fetch(request).then(response=>{
        caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
        return response;
      }))
    );
  }
});
