/* Quire Search-Concept Coverage — Step 66 */
(function(){
  let activeConceptId='';

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function normalize(v){return String(v||'').toLowerCase().replace(/[^a-z0-9\s-]+/g,' ').replace(/\s+/g,' ').trim();}
  function projectId(){return window.QuireStore?.getActiveProjectId?.();}
  function plan(){return window.QuireStore?.getSearchPlan?.()||{};}
  function articles(){return window.QuireStore?.listArticles?.()||[];}
  function screeningMap(){return new Map((window.QuireStore?.listScreeningRecords?.()||[]).map(r=>[r.articleId,r]));}

  function conceptRows(){
    return (plan().concepts||[])
      .map((concept,index)=>({
        id:concept.id||'concept_'+index,
        label:String(concept.label||('Concept '+(index+1))).trim(),
        terms:[...new Set((concept.terms||[]).map(t=>String(t||'').trim()).filter(Boolean))]
      }))
      .filter(c=>c.terms.length);
  }

  function articleText(article){
    const keywords=Array.isArray(article.keywords)?article.keywords.join(' '):String(article.keywords||'');
    return normalize([article.title,article.abstract,article.journal,keywords].filter(Boolean).join(' '));
  }

  function matchesConcept(article,concept){
    const hay=articleText(article);
    if(!hay)return false;
    return concept.terms.some(term=>{
      const needle=normalize(term);
      return needle.length>1&&hay.includes(needle);
    });
  }

  function scopedArticles(){
    const scope=document.getElementById('searchCoverageScope')?.value||'all';
    const rows=articles();
    if(scope==='all')return rows;
    const records=screeningMap();
    return rows.filter(article=>{
      const r=records.get(article.id);
      if(!r)return false;
      if(scope==='screened')return ['include','maybe'].includes(r.titleAbstractDecision);
      return ['include','maybe'].includes(r.fullTextDecision);
    });
  }

  function analysis(){
    const concepts=conceptRows();
    const rows=scopedArticles();
    const matches=new Map();
    concepts.forEach(c=>matches.set(c.id,rows.filter(a=>matchesConcept(a,c))));
    const overlap=rows.map(article=>({
      article,
      concepts:concepts.filter(c=>matchesConcept(article,c))
    }));
    return {
      concepts,rows,matches,overlap,
      none:overlap.filter(x=>x.concepts.length===0),
      multiple:overlap.filter(x=>x.concepts.length>=2),
      all:concepts.length?overlap.filter(x=>x.concepts.length===concepts.length):[]
    };
  }

  function coverageLabel(count,total){
    if(!total)return 'No records in this corpus';
    const ratio=count/total;
    if(ratio===0)return 'No obvious metadata match';
    if(ratio<.15)return 'Lightly represented';
    if(ratio<.45)return 'Some representation';
    return 'Broadly represented';
  }

  function renderDetail(concept,rows){
    const detail=document.getElementById('searchCoverageDetail');if(!detail)return;
    if(!concept){detail.hidden=true;detail.innerHTML='';return;}
    detail.hidden=false;
    detail.innerHTML=
      '<div class="search-coverage-detail-head"><div><span class="eyebrow">METADATA MATCHES</span><strong>'+escapeHtml(concept.label)+'</strong><small>'+rows.length+' collected record'+(rows.length===1?'':'s')+' contain at least one planned term in title/abstract/journal/keywords.</small></div><button type="button" id="closeSearchCoverageDetail">Close</button></div>'+
      '<div class="search-coverage-term-list">'+concept.terms.map(t=>'<span>'+escapeHtml(t)+'</span>').join('')+'</div>'+
      (rows.length?'<div class="search-coverage-paper-list">'+rows.slice(0,30).map(article=>
        '<button type="button" data-search-coverage-paper="'+escapeHtml(article.id)+'"><strong>'+escapeHtml(article.title||'Untitled paper')+'</strong><small>'+escapeHtml([article.authors,article.year].filter(Boolean).join(' · '))+'</small></button>'
      ).join('')+'</div>':'<p class="search-coverage-warning">No obvious metadata match was found. This can reflect terminology differences, incomplete abstracts/keywords, or genuinely light collection coverage. Review the search terms before interpreting it.</p>');
    document.getElementById('closeSearchCoverageDetail')?.addEventListener('click',()=>{activeConceptId='';renderDetail(null,[]);});
    detail.querySelectorAll('[data-search-coverage-paper]').forEach(btn=>btn.addEventListener('click',async()=>{
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(btn.dataset.searchCoveragePaper);}catch(e){}
    }));
  }

  function render(){
    const summary=document.getElementById('searchCoverageSummary');
    const mount=document.getElementById('searchCoverageConcepts');
    if(!summary||!mount||!window.QuireStore)return;
    const a=analysis();

    if(!a.concepts.length){
      summary.innerHTML='<div class="search-coverage-empty"><strong>No search concepts with terms yet</strong><small>Add concepts and synonyms to the Search Strategy. Coverage appears after Quire has something explicit to compare against the collected corpus.</small></div>';
      mount.innerHTML='';
      renderDetail(null,[]);
      return;
    }

    summary.innerHTML=
      '<div><strong>'+a.rows.length+'</strong><span>records in selected corpus</span></div>'+
      '<div><strong>'+a.multiple.length+'</strong><span>match 2+ search concepts</span></div>'+
      '<div><strong>'+a.all.length+'</strong><span>match every planned concept</span></div>'+
      '<div><strong>'+a.none.length+'</strong><span>no obvious metadata concept match</span></div>';

    mount.innerHTML=a.concepts.map(concept=>{
      const rows=a.matches.get(concept.id)||[];
      const percent=a.rows.length?Math.round(rows.length/a.rows.length*100):0;
      return '<article class="search-coverage-concept '+(activeConceptId===concept.id?'active':'')+'">'+
        '<div class="search-coverage-concept-head"><div><span>'+escapeHtml(coverageLabel(rows.length,a.rows.length))+'</span><strong>'+escapeHtml(concept.label)+'</strong></div><b>'+rows.length+' / '+a.rows.length+'</b></div>'+
        '<div class="search-coverage-bar"><i style="width:'+percent+'%"></i></div>'+
        '<div class="search-coverage-terms">'+concept.terms.slice(0,8).map(t=>'<span>'+escapeHtml(t)+'</span>').join('')+(concept.terms.length>8?'<em>+'+(concept.terms.length-8)+'</em>':'')+'</div>'+
        '<small>'+percent+'% of this selected corpus contains at least one planned term. This is corpus coverage, not literature completeness.</small>'+
        '<button type="button" data-search-coverage-concept="'+escapeHtml(concept.id)+'">Inspect matched records →</button>'+
      '</article>';
    }).join('');

    mount.querySelectorAll('[data-search-coverage-concept]').forEach(btn=>btn.addEventListener('click',()=>{
      activeConceptId=btn.dataset.searchCoverageConcept;
      const concept=a.concepts.find(c=>c.id===activeConceptId);
      render();
      renderDetail(concept,a.matches.get(activeConceptId)||[]);
    }));

    if(activeConceptId){
      const concept=a.concepts.find(c=>c.id===activeConceptId);
      if(concept)renderDetail(concept,a.matches.get(activeConceptId)||[]);
      else{activeConceptId='';renderDetail(null,[]);}
    }
  }

  function bind(){
    document.getElementById('searchCoverageScope')?.addEventListener('change',()=>{activeConceptId='';render();});
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',()=>{activeConceptId='';render();});
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='searchscreen')render();});
    window.addEventListener('quire:literature-candidates-imported',render);
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireSearchCoverage={render,analysis,matchesConcept};
})();