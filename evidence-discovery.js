/* Quire evidence discovery — local-first, scholarly web second */
(function(){
  let tab='library';

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function terms(text){
    const stop=new Set('the a an and or of to in for with on from by is are was were be been being that this these those it its as at can may might could would should into about after before between through using use used patient patients study studies research result results'.split(' '));
    return [...new Set(String(text||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stop.has(w)))].slice(0,14);
  }
  function scoreText(text,words){
    const hay=String(text||'').toLowerCase();
    return words.reduce((n,w)=>n+(hay.includes(w)?1:0),0);
  }
  function localMatches(claim){
    const words=terms(claim);
    const state=window.QuireStore.getState();
    const pid=window.QuireStore.getActiveProjectId();
    const articles=(state.articles||[]).filter(a=>a.projectId===pid);
    const highlights=(state.highlights||[]).filter(h=>h.projectId===pid);
    const notes=(state.notes||[]).filter(n=>n.projectId===pid);
    return articles.map(article=>{
      const hs=highlights.filter(h=>h.articleId===article.id);
      const ns=notes.filter(n=>n.articleId===article.id);
      const articleScore=scoreText([article.title,article.abstract,article.journal,article.keywords].filter(Boolean).join(' '),words);
      const bestHighlight=hs.map(h=>({h,score:scoreText(h.exactText||h.text||'',words)})).sort((a,b)=>b.score-a.score)[0];
      const noteScore=Math.max(0,...ns.map(n=>scoreText(n.content||'',words)));
      return {article,score:articleScore+(bestHighlight?.score||0)*2+noteScore,bestHighlight:bestHighlight?.h||null};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,10);
  }
  function authorLine(article){
    return [article.authors,article.year,article.journal].filter(Boolean).join(' · ');
  }
  function renderLocal(claim){
    const mount=document.getElementById('evidenceDiscoveryResults');
    const rows=localMatches(claim);
    if(!rows.length){
      mount.innerHTML='<div class="discovery-empty"><strong>No strong local match yet</strong><p>Try the scholarly web tab to discover candidate papers, or broaden the wording of the claim.</p></div>';
      return;
    }
    mount.innerHTML=rows.map(({article,bestHighlight})=>
      '<article class="discovery-result local">'+
        '<div class="discovery-result-head"><span>IN YOUR LIBRARY</span><strong>'+escapeHtml(article.title||'Untitled paper')+'</strong><small>'+escapeHtml(authorLine(article))+'</small></div>'+
        (bestHighlight?'<blockquote>'+escapeHtml((bestHighlight.exactText||bestHighlight.text||'').slice(0,420))+'</blockquote><small class="discovery-page">'+(bestHighlight.pageNumber?'Page '+bestHighlight.pageNumber:'Saved highlight')+'</small>':
          '<p>'+escapeHtml((article.abstract||'Metadata match. Open the paper and inspect the relevant passage before citing it.').slice(0,420))+'</p>')+
        '<div class="discovery-result-actions"><button type="button" data-discovery-open="'+article.id+'">Read paper</button><button type="button" data-discovery-cite="'+article.id+'">Add reference</button><button type="button" data-discovery-check="'+article.id+'">Check claim</button></div>'+
      '</article>'
    ).join('');
    bindResultButtons();
  }

  async function crossrefSearch(claim){
    const concepts=terms(claim).slice(0,8);
    const q=encodeURIComponent(concepts.join(' '));
    const url='https://api.crossref.org/works?rows=24&select=DOI,title,author,published-print,published-online,container-title,URL,type&query.bibliographic='+q;
    const response=await fetch(url,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Scholarly search returned '+response.status);
    const data=await response.json();
    return data?.message?.items||[];
  }
  function crossrefYear(item){
    const parts=item?.['published-print']?.['date-parts']||item?.['published-online']?.['date-parts'];
    return parts?.[0]?.[0]||'';
  }
  function crossrefAuthors(item){
    return (item.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')).join('; ');
  }
  function renderWeb(rows,claim){
    const claimWords=terms(claim);
    const stomaTerms=['stoma','ostomy','colostomy','ileostomy','enterostomy','urostomy','stomal','peristomal'];
    const claimNeedsStoma=stomaTerms.some(t=>String(claim).toLowerCase().includes(t));
    rows=rows.map(item=>{const title=(Array.isArray(item.title)?item.title[0]:item.title||'').toLowerCase();const journal=(Array.isArray(item['container-title'])?item['container-title'][0]:item['container-title']||'').toLowerCase();const hay=title+' '+journal;const hits=claimWords.filter(w=>hay.includes(w)).length;const stomaHit=stomaTerms.some(t=>hay.includes(t));return {item,score:hits+(stomaHit?5:0),stomaHit};}).filter(x=>(!claimNeedsStoma||x.stomaHit)&&x.score>=2).sort((a,b)=>b.score-a.score).slice(0,10).map(x=>x.item);
    const mount=document.getElementById('evidenceDiscoveryResults');
    if(!rows.length){
      mount.innerHTML='<div class="discovery-empty"><strong>No scholarly candidates found</strong><p>Try a shorter claim containing the main concepts rather than the whole paragraph.</p></div>';
      return;
    }
    mount.innerHTML='<div class="discovery-relevance-note"><strong>Relevance screening on</strong><span>Off-topic metadata matches are hidden. A relevant result is still only a candidate until you inspect the abstract or full paper.</span></div>'+rows.map((item,index)=>{
      const title=Array.isArray(item.title)?item.title[0]:item.title||'Untitled result';
      const journal=Array.isArray(item['container-title'])?item['container-title'][0]:item['container-title']||'';
      const doi=item.DOI||'';
      return '<article class="discovery-result web" data-web-index="'+index+'">'+
        '<div class="discovery-result-head"><span>RELEVANT SCHOLARLY CANDIDATE · NOT YET VERIFIED</span><strong>'+escapeHtml(title)+'</strong><small>'+escapeHtml([crossrefAuthors(item),crossrefYear(item),journal].filter(Boolean).join(' · '))+'</small></div>'+
        '<p>'+(doi?'DOI '+escapeHtml(doi):'No DOI supplied in this search result')+'. Inspect the abstract/full paper before deciding whether it supports your claim.</p>'+
        '<div class="discovery-result-actions">'+
          (doi?'<button type="button" data-web-doi="'+escapeHtml(doi)+'">Import DOI</button>':'')+
          (item.URL?'<button type="button" data-web-open="'+escapeHtml(item.URL)+'">Open record ↗</button>':'')+
        '</div>'+
      '</article>';
    }).join('');
    mount.querySelectorAll('[data-web-open]').forEach(btn=>btn.addEventListener('click',()=>window.open(btn.dataset.webOpen,'_blank','noopener')));
    mount.querySelectorAll('[data-web-doi]').forEach(btn=>btn.addEventListener('click',()=>{
      window.showView?.('library');
      window.dispatchEvent(new CustomEvent('quire:import-doi-request',{detail:{doi:btn.dataset.webDoi}}));
      close();
    }));
  }

  function bindResultButtons(){
    document.querySelectorAll('[data-discovery-open]').forEach(btn=>btn.addEventListener('click',async()=>{
      close();window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(btn.dataset.discoveryOpen);}catch(e){}
    }));
    document.querySelectorAll('[data-discovery-cite]').forEach(btn=>btn.addEventListener('click',()=>{
      window.dispatchEvent(new CustomEvent('quire:cite-article-request',{detail:{articleId:btn.dataset.discoveryCite}}));
      close();
    }));
    document.querySelectorAll('[data-discovery-check]').forEach(btn=>btn.addEventListener('click',()=>{
      const claim=document.getElementById('evidenceDiscoveryClaim').value.trim();
      close();window.showView?.('review');
      window.dispatchEvent(new CustomEvent('quire:evidence-check-request',{detail:{articleId:btn.dataset.discoveryCheck,claim}}));
    }));
  }

  async function run(){
    const claim=document.getElementById('evidenceDiscoveryClaim').value.trim();
    const status=document.getElementById('evidenceDiscoveryStatus');
    if(!claim){status.textContent='Enter or select a claim first.';return;}
    if(tab==='library'){
      status.textContent='Searching your thesis…';
      renderLocal(claim);
      status.textContent='Library search complete';
      return;
    }
    status.textContent='Searching scholarly metadata…';
    document.getElementById('evidenceDiscoveryResults').innerHTML='<div class="discovery-loading">Searching scholarly metadata for candidate papers…</div>';
    try{
      const rows=await crossrefSearch(claim);
      renderWeb(rows,claim);
      status.textContent='Relevance screening complete — weak or off-topic matches are hidden';
    }catch(error){
      status.textContent='Search unavailable';
      document.getElementById('evidenceDiscoveryResults').innerHTML='<div class="discovery-empty"><strong>Scholarly search could not be reached</strong><p>'+escapeHtml(error.message)+'. Your local library remains available.</p></div>';
    }
  }

  function open(claim=''){
    document.getElementById('evidenceDiscoveryClaim').value=claim||'';
    document.getElementById('evidenceDiscoveryResults').innerHTML='';
    document.getElementById('evidenceDiscoveryStatus').textContent='';
    tab='library';
    document.querySelectorAll('[data-discovery-tab]').forEach(b=>b.classList.toggle('active',b.dataset.discoveryTab==='library'));
    document.getElementById('evidenceDiscoveryModal').hidden=false;
    if(claim)run();
    else setTimeout(()=>document.getElementById('evidenceDiscoveryClaim')?.focus(),0);
  }
  function close(){document.getElementById('evidenceDiscoveryModal').hidden=true;}

  function bind(){
    window.addEventListener('quire:discover-evidence',e=>open(e.detail?.claim||''));
    document.getElementById('closeEvidenceDiscovery')?.addEventListener('click',close);
    document.getElementById('evidenceDiscoveryModal')?.addEventListener('click',e=>{if(e.target.id==='evidenceDiscoveryModal')close();});
    document.getElementById('runEvidenceDiscovery')?.addEventListener('click',run);
    document.querySelectorAll('[data-discovery-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      tab=btn.dataset.discoveryTab;
      document.querySelectorAll('[data-discovery-tab]').forEach(b=>b.classList.toggle('active',b===btn));
      document.getElementById('evidenceDiscoveryResults').innerHTML='';
      document.getElementById('evidenceDiscoveryStatus').textContent=tab==='web'?'Candidate discovery only — inspect before citing.':'';
    }));
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireEvidenceDiscovery={open,localMatches};
})();