/* Quire Inline References — writing-time citation insertion */
(function(){
  const AUTO_RATIONALE='Auto citation from writing editor';
  let savedRange=null;
  let remoteResults=[];
  let remoteBusy=false;

  function active(){
    return window.QuireChapterEditor?.getActive?.()||{};
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }

  function short(v,n=78){
    const s=String(v||'');
    return s.length>n?s.slice(0,n-1)+'…':s;
  }

  function authorYear(article){
    const first=String(article?.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Unknown author';
    return surname+(article?.year?' · '+article.year:'');
  }

  function saveSelection(){
    const editor=document.getElementById('liveSectionEditor');
    const selection=window.getSelection?.();
    if(!editor||!selection||!selection.rangeCount) return;
    const range=selection.getRangeAt(0);
    if(!editor.contains(range.commonAncestorContainer)) return;
    savedRange=range.cloneRange();
    savedRange.collapse(false);
  }

  function restoreSelection(){
    const editor=document.getElementById('liveSectionEditor');
    if(!editor) return null;
    const selection=window.getSelection?.();
    if(!selection) return null;

    let range=savedRange?.cloneRange?.()||null;
    if(!range || !editor.contains(range.commonAncestorContainer)){
      range=document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    selection.removeAllRanges();
    selection.addRange(range);
    return range;
  }

  function citedArticleIdsFromEditor(editor=document.getElementById('liveSectionEditor')){
    return new Set(
      [...(editor?.querySelectorAll?.('[data-citation-article]')||[])]
        .map(node=>node.dataset.citationArticle)
        .filter(Boolean)
    );
  }

  function autoLinks(sectionId){
    return (window.QuireStore?.listEvidenceForSection?.(sectionId)||[])
      .filter(link=>link.relationship==='cites'&&link.rationale===AUTO_RATIONALE);
  }

  function syncSection(sectionId,editor=document.getElementById('liveSectionEditor')){
    if(!sectionId||!editor||!window.QuireStore) return;
    const articleIds=citedArticleIdsFromEditor(editor);
    const links=autoLinks(sectionId);
    const linkedIds=new Set(links.map(link=>link.articleId).filter(Boolean));
    const chapterId=(window.QuireStore.getState().sections||[]).find(s=>s.id===sectionId)?.chapterId||null;

    for(const articleId of articleIds){
      if(linkedIds.has(articleId)) continue;
      window.QuireStore.addEvidenceLink({
        articleId,sectionId,chapterId,
        relationship:'cites',
        rationale:AUTO_RATIONALE
      });
    }

    for(const link of links){
      if(!articleIds.has(link.articleId)) window.QuireStore.removeEvidenceLink(link.id);
    }
  }

  function ensureCitationLink(articleId){
    const {sectionId,chapterId}=active();
    if(!sectionId||!articleId) return;
    const exists=autoLinks(sectionId).some(link=>link.articleId===articleId);
    if(!exists){
      window.QuireStore.addEvidenceLink({
        articleId,sectionId,chapterId,
        relationship:'cites',
        rationale:AUTO_RATIONALE
      });
    }
  }

  function citationText(article){
    return window.QuireCitations?.citationForArticle?.(article)||'('+authorYear(article).replace(' · ',', ')+')';
  }

  function insertCitation(article){
    const editor=document.getElementById('liveSectionEditor');
    if(!editor||!article) return;

    ensureCitationLink(article.id);
    const text=citationText(article);
    const range=restoreSelection();
    if(!range) return;

    const span=document.createElement('span');
    span.className='inline-citation inserted-reference';
    span.dataset.citationArticle=article.id;
    span.dataset.citationStyle=window.QuireCitations?.getStyle?.()||'harvard';
    span.contentEditable='false';
    span.textContent=text;
    span.title=(article.title||'Reference')+(article.doi?' · DOI '+article.doi:'');

    const spacer=document.createTextNode('\u00a0');
    range.insertNode(spacer);
    range.insertNode(span);
    range.setStartAfter(spacer);
    range.collapse(true);

    const selection=window.getSelection?.();
    selection?.removeAllRanges();
    selection?.addRange(range);
    savedRange=range.cloneRange();

    editor.dispatchEvent(new Event('input',{bubbles:true}));
    close();
    window.dispatchEvent(new CustomEvent('quire:inline-citation-inserted',{detail:{
      articleId:article.id,
      sectionId:active().sectionId,
      citation:text
    }}));
  }

  function matches(article,query){
    if(!query) return true;
    const hay=[article.title,article.authors,article.journal,article.year,article.doi]
      .filter(Boolean).join(' ').toLowerCase();
    return query.split(/\s+/).filter(Boolean).every(term=>hay.includes(term));
  }

  function renderLibrary(){
    const mount=document.getElementById('inlineReferenceLibrary');
    if(!mount)return;
    const query=(document.getElementById('inlineReferenceSearch')?.value||'').trim().toLowerCase();
    const rows=(window.QuireStore?.listArticles?.()||[])
      .filter(article=>matches(article,query))
      .sort((a,b)=>{
        const ar=a.readingStatus==='reviewed'?0:a.readingStatus==='reading'?1:2;
        const br=b.readingStatus==='reviewed'?0:b.readingStatus==='reading'?1:2;
        return ar-br || String(b.year||'').localeCompare(String(a.year||'')) || String(a.title||'').localeCompare(String(b.title||''));
      });

    const count=document.getElementById('inlineReferenceCount');
    if(count)count.textContent=rows.length+' '+(rows.length===1?'reference':'references');

    if(!rows.length){
      mount.innerHTML='<div class="inline-reference-empty"><strong>No library match</strong><small>Search by DOI or title below to add a new scholarly reference without leaving the editor.</small></div>';
      return;
    }

    mount.innerHTML=rows.slice(0,80).map(article=>
      '<button type="button" class="inline-reference-row" data-inline-cite="'+escapeHtml(article.id)+'">'+
        '<div><span>'+escapeHtml(authorYear(article))+'</span><strong>'+escapeHtml(article.title||'Untitled reference')+'</strong>'+
        '<small>'+escapeHtml([article.journal,article.doi?'DOI '+article.doi:''].filter(Boolean).join(' · '))+'</small></div>'+
        '<b>'+escapeHtml(citationText(article))+'</b>'+
      '</button>'
    ).join('');

    mount.querySelectorAll('[data-inline-cite]').forEach(btn=>btn.addEventListener('click',()=>{
      const article=window.QuireStore.getArticle(btn.dataset.inlineCite);
      if(article) insertCitation(article);
    }));
  }

  function renderRemote(){
    const mount=document.getElementById('inlineReferenceRemoteResults');
    if(!mount)return;
    if(remoteBusy){
      mount.innerHTML='<div class="inline-reference-loading">Searching scholarly metadata…</div>';
      return;
    }
    if(!remoteResults.length){
      mount.innerHTML='';
      return;
    }

    mount.innerHTML=remoteResults.map((item,index)=>{
      const doi=String(item.doi||'').toLowerCase();
      const existing=(window.QuireStore.listArticles()||[]).find(a=>doi&&String(a.doi||'').toLowerCase()===doi);
      return '<article class="inline-remote-result">'+
        '<div><span>'+escapeHtml(authorYear(item))+'</span><strong>'+escapeHtml(item.title||'Untitled article')+'</strong>'+
        '<small>'+escapeHtml([item.journal,item.doi?'DOI '+item.doi:''].filter(Boolean).join(' · '))+'</small></div>'+
        '<button type="button" data-inline-remote="'+index+'">'+(existing?'Cite existing':'Add & cite')+'</button>'+
      '</article>';
    }).join('');

    mount.querySelectorAll('[data-inline-remote]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=remoteResults[Number(btn.dataset.inlineRemote)];
      if(!item)return;
      try{
        const article=window.QuireMetadata.saveToLibrary(item);
        insertCitation(article);
      }catch(err){
        setRemoteMessage(err.message||'Could not add this reference.');
      }
    }));
  }

  function setRemoteMessage(message){
    const target=document.getElementById('inlineReferenceRemoteMessage');
    if(target)target.textContent=message||'';
  }

  async function remoteSearch(){
    const input=document.getElementById('inlineReferenceRemoteQuery');
    const query=input?.value.trim();
    if(!query)return;
    remoteBusy=true;remoteResults=[];setRemoteMessage('');
    renderRemote();
    const button=document.getElementById('inlineReferenceRemoteSearch');
    if(button){button.disabled=true;button.textContent='Searching…';}
    try{
      remoteResults=await window.QuireMetadata.search(query);
      if(!remoteResults.length)setRemoteMessage('No scholarly records found. Try the DOI or a more exact article title.');
    }catch(err){
      setRemoteMessage(err.message||'Metadata search failed.');
    }finally{
      remoteBusy=false;
      if(button){button.disabled=false;button.textContent='Find reference';}
      renderRemote();
    }
  }

  function updateStyleLabel(){
    const style=window.QuireCitations?.getStyle?.()||'harvard';
    const labels={harvard:'Harvard',apa7:'APA 7th',vancouver:'Vancouver'};
    const target=document.getElementById('inlineReferenceStyle');
    if(target)target.textContent=labels[style]||style;
  }

  function open(){
    saveSelection();
    const modal=document.getElementById('inlineReferenceModal');
    if(!modal)return;
    modal.hidden=false;
    const search=document.getElementById('inlineReferenceSearch');
    if(search){search.value='';setTimeout(()=>search.focus(),0);}
    const remote=document.getElementById('inlineReferenceRemoteQuery');
    if(remote)remote.value='';
    remoteResults=[];setRemoteMessage('');renderRemote();
    updateStyleLabel();renderLibrary();
  }

  function close(){
    const modal=document.getElementById('inlineReferenceModal');
    if(modal)modal.hidden=true;
  }

  function refreshInsertedCitations(){
    const editor=document.getElementById('liveSectionEditor');
    if(!editor)return;
    editor.querySelectorAll('[data-citation-article]').forEach(span=>{
      const article=window.QuireStore?.getArticle?.(span.dataset.citationArticle);
      if(!article)return;
      span.textContent=citationText(article);
      span.dataset.citationStyle=window.QuireCitations?.getStyle?.()||'harvard';
    });
    if(editor.querySelector('[data-citation-article]')) editor.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function bind(){
    document.getElementById('insertReferenceBtn')?.addEventListener('mousedown',saveSelection);
    document.getElementById('insertReferenceBtn')?.addEventListener('click',open);
    document.getElementById('closeInlineReferenceModal')?.addEventListener('click',close);
    document.getElementById('inlineReferenceModal')?.addEventListener('click',e=>{if(e.target.id==='inlineReferenceModal')close();});
    document.getElementById('inlineReferenceSearch')?.addEventListener('input',renderLibrary);
    document.getElementById('inlineReferenceRemoteSearch')?.addEventListener('click',remoteSearch);
    document.getElementById('inlineReferenceRemoteQuery')?.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();remoteSearch();}
    });
    document.getElementById('inlineReferenceOpenBibliography')?.addEventListener('click',()=>{
      close();window.QuireCitations?.open?.();
    });
    window.addEventListener('quire:citation-style-changed',()=>{
      updateStyleLabel();refreshInsertedCitations();
    });
    window.addEventListener('quire:metadata-saved',()=>{
      if(!document.getElementById('inlineReferenceModal')?.hidden)renderLibrary();
    });
    window.addEventListener('quire:references-imported',()=>{
      if(!document.getElementById('inlineReferenceModal')?.hidden)renderLibrary();
    });
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireInlineReferences={open,close,insertCitation,syncSection,refreshInsertedCitations};
})();