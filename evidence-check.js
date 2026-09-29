/* Quire Evidence Check — Step 14 */
(function(){
  const STOP=new Set('the a an and or of to in on for with from by is are was were be been being that this these those it its as at into than then their there which who where how can may might could would should'.split(' '));

  function tokens(text=''){
    return [...new Set(String(text).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(t=>t.length>3&&!STOP.has(t)))];
  }
  function similarity(a,b){
    const A=tokens(a),B=new Set(tokens(b));
    if(!A.length||!B.size)return 0;
    const hit=A.filter(x=>B.has(x)).length;
    return hit/Math.max(4,Math.min(A.length,B.size));
  }
  function textOf(html=''){
    const d=document.createElement('div');d.innerHTML=html;return (d.innerText||'').replace(/\s+/g,' ').trim();
  }
  function sentences(text=''){
    return String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(s=>s.length>25)||[];
  }
  function hasCitation(sentence){
    return /\([^)]*(?:19|20)\d{2}[^)]*\)|\[(?:\d+[,-]?\s*)+\]/.test(sentence);
  }
  function claimLike(sentence){
    return /\b(is|are|was|were|shows?|suggests?|indicates?|demonstrates?|improves?|reduces?|increases?|associated|linked|results?|leads?|causes?|affects?|patients?|participants?)\b/i.test(sentence);
  }

  function activeSection(){
    const id=document.getElementById('reviewSectionSelect')?.value||window.QuireChapterEditor?.getActive?.().sectionId;
    return window.QuireStore.listSections?.().find?.(s=>s.id===id) ||
      (window.QuireStore.getState().sections||[]).find(s=>s.id===id)||null;
  }

  function projectEvidence(){
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    return state.highlights.filter(h=>h.projectId===projectId).map(h=>{
      const article=state.articles.find(a=>a.id===h.articleId);
      const note=state.notes.find(n=>n.highlightId===h.id);
      return {highlight:h,article,note,text:[h.highlightedText,note?.body,article?.title].filter(Boolean).join(' ')};
    });
  }

  function matchCandidates(sentence,evidence){
    return evidence.map(row=>({...row,score:similarity(sentence,row.text)}))
      .filter(x=>x.score>=.08).sort((a,b)=>b.score-a.score).slice(0,3);
  }

  function citationArticle(sentence,articles){
    const year=sentence.match(/(?:19|20)\d{2}/)?.[0];
    if(!year)return null;
    const lower=sentence.toLowerCase();
    return articles.find(a=>{
      const surname=(a.authors||'').split(';')[0]?.trim().split(/\s+/).slice(-1)[0]?.toLowerCase();
      return surname && lower.includes(surname) && String(a.year||'')===year;
    })||null;
  }

  function audit(){
    const section=activeSection();
    const mount=document.getElementById('evidenceAuditMount');
    if(!mount)return;
    if(!section){mount.innerHTML='<div class="review-empty"><strong>No section selected</strong></div>';return;}
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    const articles=state.articles.filter(a=>a.projectId===projectId);
    const evidence=projectEvidence();
    const linkedIds=new Set(state.evidenceLinks.filter(e=>e.sectionId===section.id).map(e=>e.articleId).filter(Boolean));
    const issues=[];

    sentences(textOf(section.content)).forEach((sentence,index)=>{
      if(!claimLike(sentence))return;
      if(!hasCitation(sentence)){
        const candidates=matchCandidates(sentence,evidence);
        issues.push({type:'needs-citation',sentence,index,candidates});
        return;
      }
      const cited=citationArticle(sentence,articles);
      if(cited){
        const related=evidence.filter(e=>e.article?.id===cited.id);
        const best=Math.max(0,...related.map(e=>similarity(sentence,e.text)));
        if(best<.06){
          issues.push({type:'support-check',sentence,index,article:cited,candidates:matchCandidates(sentence,evidence)});
        }
      }
    });

    linkedIds.forEach(id=>{
      if(!articles.some(a=>a.id===id)) issues.push({type:'missing-source',sentence:'A linked evidence record points to a missing article.',candidates:[]});
    });

    document.getElementById('evidenceAuditCount').textContent=issues.length+' checks';
    if(!issues.length){
      mount.innerHTML='<div class="review-empty"><strong>No obvious evidence gaps detected</strong><small>This is a heuristic check. It cannot determine whether a claim is scientifically valid or whether a citation truly supports every nuance.</small></div>';
      return;
    }
    mount.innerHTML=issues.map((issue,i)=>{
      const title=issue.type==='needs-citation'?'Citation may be needed':issue.type==='support-check'?'Check citation support':'Broken evidence link';
      const explanation=issue.type==='needs-citation'
        ?'This looks like a factual or interpretive claim but has no obvious in-text citation.'
        :issue.type==='support-check'
          ?'Quire found the cited article, but its saved highlights do not strongly overlap with this wording. Review the source before relying on the citation.'
          :'The section contains an evidence link whose article record is no longer available.';
      return '<article class="evidence-audit-card"><span class="suggestion-type warning">'+title.toUpperCase()+'</span>'+
        '<p><strong>'+escapeHtml(shorten(issue.sentence,190))+'</strong></p><p>'+escapeHtml(explanation)+'</p>'+
        (issue.candidates?.length?'<div class="candidate-evidence"><small>Possible existing evidence</small>'+issue.candidates.map(c=>
          '<button type="button" data-audit-link="'+c.highlight.id+'">'+escapeHtml(label(c.article))+' · p. '+(c.highlight.pageNumber||'—')+'</button>'
        ).join('')+'</div>':'')+
        '<div class="suggestion-actions"><button type="button" data-audit-open="'+i+'">Review evidence</button></div></article>';
    }).join('');

    mount.querySelectorAll('[data-audit-link]').forEach(btn=>btn.addEventListener('click',()=>{
      window.showView?.('chapters');
      setTimeout(()=>window.QuireEvidenceWriting?.open?.(),100);
    }));
    mount.querySelectorAll('[data-audit-open]').forEach(btn=>btn.addEventListener('click',()=>{
      window.showView?.('chapters');
      setTimeout(()=>window.QuireEvidenceWriting?.open?.(),100);
    }));
  }

  function label(article){
    if(!article)return'Unknown source';
    const first=(article.authors||'').split(';')[0]?.trim().split(/\s+/).slice(-1)[0]||'Source';
    return first+(article.year?' '+article.year:'');
  }
  function shorten(v,n){v=String(v);return v.length>n?v.slice(0,n-1)+'…':v;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  function bind(){
    document.getElementById('runEvidenceCheck')?.addEventListener('click',audit);
    document.getElementById('reviewSectionSelect')?.addEventListener('change',()=>document.getElementById('evidenceAuditMount').innerHTML='');
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireEvidenceCheck={audit};
})();