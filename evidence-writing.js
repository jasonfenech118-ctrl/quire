/* Quire Evidence-to-Writing — Step 11 */
(function(){
  let currentSectionId=null;
  let currentChapterId=null;

  function articleLabel(article){
    if(!article) return 'Unknown source';
    const first=(article.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Source';
    return surname+(article.year?' et al., '+article.year:'');
  }

  function evidenceRows(){
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    return state.highlights.filter(h=>h.projectId===projectId).map(h=>{
      const article=state.articles.find(a=>a.id===h.articleId);
      const note=state.notes.find(n=>n.highlightId===h.id);
      const links=state.evidenceLinks.filter(e=>e.highlightId===h.id);
      return {highlight:h,article,note,links};
    });
  }

  function linkedToCurrent(row){
    return row.links.some(e=>e.sectionId===currentSectionId);
  }

  function renderPanel(){
    const mount=document.getElementById('sectionEvidenceMount');
    if(!mount||!currentSectionId) return;
    const state=window.QuireStore.getState();
    const links=state.evidenceLinks.filter(e=>e.sectionId===currentSectionId);
    const rows=links.map(link=>{
      const highlight=state.highlights.find(h=>h.id===link.highlightId);
      const article=state.articles.find(a=>a.id===link.articleId||a.id===highlight?.articleId);
      const note=state.notes.find(n=>n.id===link.noteId)||state.notes.find(n=>n.highlightId===highlight?.id);
      return {link,highlight,article,note};
    }).filter(x=>x.highlight);

    document.getElementById('sectionEvidenceCount').textContent=rows.length+' '+(rows.length===1?'source':'sources');

    if(!rows.length){
      mount.innerHTML='<div class="empty-evidence"><strong>No linked evidence yet</strong><small>Link highlights from your Research Library so the evidence stays beside the section you are writing.</small></div>';
      return;
    }

    mount.innerHTML=rows.map(({link,highlight,article,note})=>
      '<article class="section-evidence-card">'+
        '<div class="section-evidence-source"><span>'+escapeHtml(articleLabel(article))+'</span><small>p. '+(highlight.pageNumber||'—')+'</small></div>'+
        '<p>'+escapeHtml(highlight.highlightedText||'')+'</p>'+
        (note?.body?'<div class="section-evidence-note">'+escapeHtml(note.body)+'</div>':'')+
        '<div class="section-evidence-actions">'+
          '<button type="button" data-insert-evidence="'+link.id+'">Insert citation note</button>'+
          '<button type="button" data-open-evidence="'+link.id+'">Open source</button>'+
          '<button type="button" data-unlink-evidence="'+link.id+'">Unlink</button>'+
        '</div>'+
      '</article>'
    ).join('');

    mount.querySelectorAll('[data-insert-evidence]').forEach(btn=>btn.addEventListener('click',()=>insertEvidence(btn.dataset.insertEvidence)));
    mount.querySelectorAll('[data-open-evidence]').forEach(btn=>btn.addEventListener('click',()=>openSource(btn.dataset.openEvidence)));
    mount.querySelectorAll('[data-unlink-evidence]').forEach(btn=>btn.addEventListener('click',()=>{
      window.QuireStore.removeEvidenceLink(btn.dataset.unlinkEvidence);renderPanel();
    }));
  }

  function renderLinker(){
    const list=document.getElementById('evidenceLinkerList');
    if(!list) return;
    const query=(document.getElementById('evidenceLinkerSearch')?.value||'').toLowerCase().trim();
    const filter=document.getElementById('evidenceLinkerFilter')?.value||'all';
    let rows=evidenceRows();
    rows=rows.filter(row=>{
      const linked=linkedToCurrent(row);
      if(filter==='linked'&&!linked) return false;
      if(filter==='unlinked'&&linked) return false;
      if(query){
        const hay=[row.highlight.highlightedText,row.note?.body,row.article?.title,row.article?.authors].filter(Boolean).join(' ').toLowerCase();
        if(!hay.includes(query)) return false;
      }
      return true;
    });

    if(!rows.length){
      list.innerHTML='<div class="metadata-empty">No matching highlights found. Create highlights in the Article Reader first.</div>';
      return;
    }

    list.innerHTML=rows.map(row=>{
      const linked=linkedToCurrent(row);
      return '<article class="evidence-linker-row">'+
        '<div><span>'+escapeHtml(articleLabel(row.article))+' · p. '+(row.highlight.pageNumber||'—')+'</span><strong>'+escapeHtml(row.highlight.highlightedText)+'</strong>'+
        (row.note?.body?'<small>'+escapeHtml(row.note.body)+'</small>':'')+'</div>'+
        '<button type="button" data-link-highlight="'+row.highlight.id+'" '+(linked?'disabled':'')+'>'+(linked?'Linked':'Link')+'</button>'+
      '</article>';
    }).join('');

    list.querySelectorAll('[data-link-highlight]').forEach(btn=>btn.addEventListener('click',()=>{
      const state=window.QuireStore.getState();
      const h=state.highlights.find(x=>x.id===btn.dataset.linkHighlight);
      const note=state.notes.find(n=>n.highlightId===h?.id);
      if(!h||!currentSectionId) return;
      window.QuireStore.addEvidenceLink({
        articleId:h.articleId,highlightId:h.id,noteId:note?.id||null,
        sectionId:currentSectionId,chapterId:currentChapterId,relationship:'supports'
      });
      renderLinker();renderPanel();
    }));
  }

  function insertEvidence(linkId){
    const state=window.QuireStore.getState();
    const link=state.evidenceLinks.find(e=>e.id===linkId);
    const h=state.highlights.find(x=>x.id===link?.highlightId);
    const a=state.articles.find(x=>x.id===link?.articleId||x.id===h?.articleId);
    const note=state.notes.find(n=>n.id===link?.noteId)||state.notes.find(n=>n.highlightId===h?.id);
    if(!h||!a) return;
    const editor=document.getElementById('liveSectionEditor');
    if(!editor) return;
    editor.focus();
    const citation='('+articleLabel(a)+')';
    const text=note?.body?note.body:'Evidence: '+h.highlightedText;
    document.execCommand('insertHTML',false,'<p data-evidence-link="'+escapeHtml(linkId)+'">'+escapeHtml(text)+' <span class="inline-citation">'+escapeHtml(citation)+'</span></p>');
    editor.dispatchEvent(new Event('input',{bubbles:true}));
  }

  async function openSource(linkId){
    const state=window.QuireStore.getState();
    const link=state.evidenceLinks.find(e=>e.id===linkId);
    const h=state.highlights.find(x=>x.id===link?.highlightId);
    if(!h) return;
    window.showView?.('reader');
    try{
      await window.QuirePdfReader.openArticle(h.articleId);
      await window.QuirePdfReader.renderPage(h.pageNumber||1);
    }catch(err){console.warn(err);}
  }

  function open(){
    if(!currentSectionId) return;
    document.getElementById('evidenceLinkerModal').hidden=false;
    document.getElementById('evidenceLinkerSearch').value='';
    document.getElementById('evidenceLinkerFilter').value='all';
    renderLinker();
  }
  function close(){document.getElementById('evidenceLinkerModal').hidden=true;}

  function bind(){
    document.getElementById('openEvidenceLinker')?.addEventListener('click',open);
    document.getElementById('closeEvidenceLinker')?.addEventListener('click',close);
    document.getElementById('evidenceLinkerModal')?.addEventListener('click',e=>{if(e.target.id==='evidenceLinkerModal')close();});
    document.getElementById('evidenceLinkerSearch')?.addEventListener('input',renderLinker);
    document.getElementById('evidenceLinkerFilter')?.addEventListener('change',renderLinker);
    window.addEventListener('quire:section-opened',e=>{
      currentChapterId=e.detail?.chapterId||null;currentSectionId=e.detail?.sectionId||null;renderPanel();
    });
    window.addEventListener('quire:annotation-changed',()=>{renderPanel();if(!document.getElementById('evidenceLinkerModal')?.hidden)renderLinker();});
    window.addEventListener('quire:project-switched',()=>{currentChapterId=null;currentSectionId=null;renderPanel();});
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireEvidenceWriting={renderPanel,open};
})();