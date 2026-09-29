/* Quire Scholarly Metadata v1 — DOI/title lookup via Crossref */
(function(){
  let results=[];
  let selectedIndex=0;

  function stripTags(value=''){
    const el=document.createElement('div');
    el.innerHTML=String(value);
    return (el.textContent||el.innerText||'').replace(/\s+/g,' ').trim();
  }

  function normalizeDoi(input=''){
    let value=decodeURIComponent(String(input).trim());
    value=value.replace(/^doi:\s*/i,'');
    value=value.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'');
    const match=value.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
    return match ? match[0].replace(/[\s.,;]+$/,'') : '';
  }

  function yearFrom(message){
    const candidates=[message['published-print'],message['published-online'],message.issued,message.created];
    for(const item of candidates){
      const year=item?.['date-parts']?.[0]?.[0] || item?.['date-time']?.slice?.(0,4);
      if(year) return Number(year);
    }
    return null;
  }

  function authorString(authors=[]){
    if(!Array.isArray(authors)) return '';
    return authors.map(a=>{
      if(a.name) return a.name;
      return [a.given,a.family].filter(Boolean).join(' ');
    }).filter(Boolean).join('; ');
  }

  function toArticle(message={}){
    const doi=message.DOI||'';
    const title=Array.isArray(message.title)?message.title[0]:message.title||'';
    const journal=Array.isArray(message['container-title'])?message['container-title'][0]:message['container-title']||'';
    const issn=Array.isArray(message.ISSN)?message.ISSN:[];
    return {
      title:stripTags(title)||'Untitled article',
      authors:authorString(message.author),
      journal:stripTags(journal),
      year:yearFrom(message),
      doi,
      abstract:stripTags(message.abstract||''),
      sourceUrl:message.URL || (doi?'https://doi.org/'+doi:''),
      readingStatus:'unread',
      citationData:{
        metadataSource:'Crossref',
        metadataFetchedAt:new Date().toISOString(),
        publisher:message.publisher||'',
        volume:message.volume||'',
        issue:message.issue||'',
        page:message.page||'',
        articleNumber:message['article-number']||'',
        type:message.type||'',
        issn,
        referencesCount:message['reference-count']??null,
        citationCount:message['is-referenced-by-count']??null,
        publishedOnline:message['published-online']?.['date-parts']?.[0]||null,
        publishedPrint:message['published-print']?.['date-parts']?.[0]||null
      }
    };
  }

  async function fetchJson(url){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{
        headers:{'Accept':'application/json'},
        signal:controller.signal
      });
      if(!response.ok){
        if(response.status===404) throw new Error('No Crossref record was found for that DOI.');
        throw new Error('Scholarly metadata service returned '+response.status+'.');
      }
      return await response.json();
    }catch(err){
      if(err.name==='AbortError') throw new Error('The metadata lookup timed out. Please try again.');
      throw err;
    }finally{clearTimeout(timeout);}
  }

  async function lookupDoi(doi){
    const json=await fetchJson('https://api.crossref.org/works/'+encodeURIComponent(doi));
    return [toArticle(json.message)];
  }

  async function searchTitle(query){
    const params=new URLSearchParams({
      'query.bibliographic':query,
      rows:'6',
      select:'DOI,title,author,container-title,published-print,published-online,issued,type,URL,abstract,publisher,volume,issue,page,ISSN,reference-count,is-referenced-by-count'
    });
    const json=await fetchJson('https://api.crossref.org/works?'+params.toString());
    return (json.message?.items||[]).map(toArticle);
  }

  async function search(input){
    const raw=String(input||'').trim();
    if(!raw) throw new Error('Enter a DOI, DOI link, or article title.');
    const doi=normalizeDoi(raw);
    return doi ? lookupDoi(doi) : searchTitle(raw);
  }

  function formatAuthors(authors=''){
    const parts=authors.split(';').map(x=>x.trim()).filter(Boolean);
    if(parts.length<=3) return parts.join(', ');
    return parts.slice(0,3).join(', ')+' et al.';
  }

  function citationPreview(item){
    const author=formatAuthors(item.authors)||'Author not available';
    const year=item.year||'n.d.';
    const journal=item.journal ? ' '+item.journal+'.' : '';
    const doi=item.doi ? ' https://doi.org/'+item.doi : '';
    return author+' ('+year+'). '+item.title+'.'+journal+doi;
  }

  function duplicateFor(item){
    if(!item?.doi) return null;
    const needle=item.doi.toLowerCase();
    return (window.QuireStore?.listArticles()||[]).find(a=>(a.doi||'').toLowerCase()===needle)||null;
  }

  function renderResults(items){
    results=items||[];
    selectedIndex=0;
    const target=document.getElementById('metadataResults');
    const preview=document.getElementById('metadataPreview');
    if(!target||!preview) return;
    if(!results.length){
      target.innerHTML='<div class="metadata-empty">No matching scholarly records found.</div>';
      preview.hidden=true;
      return;
    }
    target.innerHTML=results.map((item,index)=>{
      const duplicate=duplicateFor(item);
      return '<button type="button" class="metadata-result'+(index===0?' active':'')+'" data-metadata-index="'+index+'">'+
        '<div><strong>'+escapeHtml(item.title)+'</strong><small>'+escapeHtml([formatAuthors(item.authors),item.journal,item.year].filter(Boolean).join(' · '))+'</small></div>'+
        '<span>'+(duplicate?'Already in library':'Select')+'</span>'+
      '</button>';
    }).join('');
    target.querySelectorAll('[data-metadata-index]').forEach(btn=>btn.addEventListener('click',()=>{
      selectedIndex=Number(btn.dataset.metadataIndex);
      target.querySelectorAll('.metadata-result').forEach(x=>x.classList.toggle('active',x===btn));
      renderPreview(results[selectedIndex]);
    }));
    renderPreview(results[0]);
  }

  function renderPreview(item){
    const preview=document.getElementById('metadataPreview');
    if(!preview||!item) return;
    preview.hidden=false;
    document.getElementById('metadataTitle').textContent=item.title||'Untitled';
    document.getElementById('metadataAuthors').textContent=item.authors||'Authors not available';
    document.getElementById('metadataJournal').textContent=item.journal||'Journal not available';
    document.getElementById('metadataYear').textContent=item.year||'—';
    document.getElementById('metadataDoi').textContent=item.doi||'No DOI';
    document.getElementById('metadataCitation').textContent=citationPreview(item);
    const abstractWrap=document.getElementById('metadataAbstractWrap');
    const abstract=document.getElementById('metadataAbstract');
    if(item.abstract){abstractWrap.hidden=false;abstract.textContent=item.abstract;}
    else abstractWrap.hidden=true;

    const dup=duplicateFor(item);
    const dupNote=document.getElementById('metadataDuplicate');
    if(dup){
      dupNote.hidden=false;
      dupNote.textContent='This DOI is already in the current thesis library. Saving will update that article rather than create a duplicate.';
    }else dupNote.hidden=true;

    const currentId=window.QuirePdfReader?.getCurrentArticleId?.();
    const applyBtn=document.getElementById('applyMetadataToCurrent');
    if(applyBtn) applyBtn.hidden=!currentId;
  }

  function mergedCitation(existing={},incoming={}){
    return {...existing,...incoming,metadataSource:'Crossref',metadataFetchedAt:new Date().toISOString()};
  }

  function saveToLibrary(item){
    if(!item) throw new Error('Select a metadata result first.');
    const duplicate=duplicateFor(item);
    if(duplicate){
      return window.QuireStore.updateArticle(duplicate.id,{
        ...item,
        citationData:mergedCitation(duplicate.citationData,item.citationData)
      });
    }
    return window.QuireStore.addArticle(item);
  }

  function applyToArticle(articleId,item){
    if(!articleId) throw new Error('No PDF article is currently open.');
    const existing=window.QuireStore.getArticle(articleId);
    if(!existing) throw new Error('The open article could not be found.');
    const duplicate=duplicateFor(item);
    if(duplicate && duplicate.id!==articleId){
      throw new Error('That DOI already belongs to another article in this thesis. Open the existing library record instead of creating a duplicate.');
    }
    return window.QuireStore.updateArticle(articleId,{
      ...item,
      citationData:mergedCitation(existing.citationData,item.citationData)
    });
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function open(){
    const modal=document.getElementById('metadataModal');
    if(!modal) return;
    modal.hidden=false;
    document.getElementById('metadataQuery').focus();
    const currentId=window.QuirePdfReader?.getCurrentArticleId?.();
    document.getElementById('applyMetadataToCurrent').hidden=!currentId;
  }

  function close(){
    const modal=document.getElementById('metadataModal');
    if(modal) modal.hidden=true;
  }

  async function runSearch(){
    const button=document.getElementById('metadataSearchBtn');
    const target=document.getElementById('metadataResults');
    const input=document.getElementById('metadataQuery');
    if(!input) return;
    if(button){button.disabled=true;button.textContent='Searching…';}
    if(target) target.innerHTML='<div class="metadata-loading">Searching scholarly metadata…</div>';
    document.getElementById('metadataPreview').hidden=true;
    try{
      renderResults(await search(input.value));
    }catch(err){
      if(target) target.innerHTML='<div class="metadata-error">'+escapeHtml(err.message||'Metadata lookup failed.')+'</div>';
    }finally{
      if(button){button.disabled=false;button.textContent='Find article';}
    }
  }

  function bind(){
    document.getElementById('metadataSearchBtn')?.addEventListener('click',runSearch);
    document.getElementById('metadataQuery')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runSearch();}});
    document.getElementById('closeMetadataModal')?.addEventListener('click',close);
    document.getElementById('metadataModal')?.addEventListener('click',e=>{if(e.target.id==='metadataModal')close();});
    document.getElementById('addMetadataToLibrary')?.addEventListener('click',()=>{
      const item=results[selectedIndex];
      if(!item) return;
      const article=saveToLibrary(item);
      window.dispatchEvent(new CustomEvent('quire:metadata-saved',{detail:{articleId:article.id}}));
      close();
    });
    document.getElementById('applyMetadataToCurrent')?.addEventListener('click',()=>{
      const item=results[selectedIndex];
      if(!item) return;
      try{
        const article=applyToArticle(window.QuirePdfReader?.getCurrentArticleId?.(),item);
        window.dispatchEvent(new CustomEvent('quire:metadata-saved',{detail:{articleId:article.id,applied:true}}));
        close();
      }catch(err){
        const target=document.getElementById('metadataDuplicate');
        if(target){target.hidden=false;target.textContent=err.message;}
      }
    });
  }

  window.QuireMetadata={open,close,search,normalizeDoi,saveToLibrary,applyToArticle};
  document.addEventListener('DOMContentLoaded',bind);
})();