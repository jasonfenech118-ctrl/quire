/* Quire Claim Awareness — Step 33 */
(function(){
  let timer=null;

  function textOf(html=''){
    const d=document.createElement('div');d.innerHTML=String(html||'');return (d.innerText||'').replace(/\s+/g,' ').trim();
  }
  function activeSection(){
    const id=window.QuireChapterEditor?.getActive?.().sectionId;
    return (window.QuireStore?.getState?.().sections||[]).find(s=>s.id===id)||null;
  }
  function paragraph(){
    return window.QuireWritingCompanion?.currentParagraph?.()||'';
  }
  function linkedArticleIds(){
    const section=activeSection();if(!section)return new Set();
    const state=window.QuireStore.getState();
    return new Set((state.evidenceLinks||[]).filter(e=>e.sectionId===section.id).map(e=>e.articleId).filter(Boolean));
  }
  function analyse(text){
    const api=window.QuireEvidenceCheck;
    if(!api||!text.trim())return [];
    const evidence=api.projectEvidence?.()||[];
    const linked=linkedArticleIds();
    return (api.sentences?.(text)||[]).map(sentence=>{
      if(api.framingLike?.(sentence))return {sentence,type:'framing',label:'Your framing',message:'This reads as your own framing or signposting rather than a factual claim that automatically needs a source.',candidates:[]};
      if(!api.claimLike?.(sentence))return {sentence,type:'interpretation',label:'Interpretation / developing point',message:'Quire does not see an obvious empirical claim here. Use your judgement if the idea depends on literature.',candidates:[]};
      const cited=api.hasCitation?.(sentence);
      const candidates=api.matchCandidates?.(sentence,evidence)||[];
      const linkedCandidates=candidates.filter(c=>linked.has(c.article?.id));
      if(cited)return {sentence,type:'cited',label:'Citation present',message:'A citation is present. Quire can still help you check whether saved source passages support the wording.',candidates};
      if(linkedCandidates.length)return {sentence,type:'linked',label:'Linked evidence nearby',message:'This looks like a claim that may need a citation. Related evidence is already linked to this thesis section.',candidates:linkedCandidates};
      if(candidates.length)return {sentence,type:'candidate',label:'Evidence may be available',message:'This looks like a claim that may need evidence. Quire found potentially related passages in your Research Library.',candidates};
      return {sentence,type:'missing',label:'Evidence may be needed',message:'This looks like a factual or empirical claim, but Quire did not find an obvious citation or matching saved passage. This is a prompt to review, not a judgement that the claim is false.',candidates:[]};
    });
  }
  function render(){
    const mount=document.getElementById('claimAwarenessMount');
    const count=document.getElementById('claimAwarenessCount');
    if(!mount||!count)return;
    const text=paragraph();
    if(!text.trim()){
      count.textContent='0 claims';
      mount.innerHTML='<small>As your paragraph develops, Quire will flag statements that may need evidence and distinguish them from your own framing.</small>';
      return;
    }
    if(text.split(/\s+/).length<8){
      count.textContent='developing';
      mount.innerHTML='<small>Keep developing the thought. Quire waits for enough context before labelling possible claims.</small>';
      return;
    }
    const rows=analyse(text);
    const claims=rows.filter(r=>['cited','linked','candidate','missing'].includes(r.type));
    count.textContent=claims.length+' '+(claims.length===1?'claim':'claims');
    if(!rows.length){
      mount.innerHTML='<small>No complete statement is ready for claim review yet.</small>';return;
    }
    mount.innerHTML=rows.map((row,i)=>
      '<article class="claim-awareness-row '+row.type+'">'+
        '<div><strong>'+escapeHtml(row.label)+'</strong><p>'+escapeHtml(shorten(row.sentence,190))+'</p><small>'+escapeHtml(row.message)+'</small></div>'+
        (row.candidates?.length?'<button type="button" data-claim-evidence="'+i+'">View '+row.candidates.length+' match'+(row.candidates.length===1?'':'es')+'</button>':'')+
      '</article>'
    ).join('');
    mount.querySelectorAll('[data-claim-evidence]').forEach(btn=>btn.addEventListener('click',()=>{
      const row=rows[Number(btn.dataset.claimEvidence)];
      const first=row?.candidates?.[0];
      if(first?.highlight?.id){
        window.QuireEvidenceWriting?.open?.();
        const search=document.getElementById('evidenceLinkerSearch');
        if(search){search.value=(first.highlight.highlightedText||'').split(/\s+/).slice(0,5).join(' ');search.dispatchEvent(new Event('input',{bubbles:true}));}
      }else window.QuireEvidenceWriting?.open?.();
    }));
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,450);}
  function bind(){
    document.getElementById('liveSectionEditor')?.addEventListener('input',schedule);
    document.getElementById('liveSectionEditor')?.addEventListener('keyup',schedule);
    document.getElementById('liveSectionEditor')?.addEventListener('mouseup',schedule);
    window.addEventListener('quire:section-opened',()=>setTimeout(render,50));
    window.addEventListener('quire:store-changed',schedule);
    window.addEventListener('quire:annotation-changed',schedule);
    render();
  }
  function shorten(v,n){v=String(v||'');return v.length>n?v.slice(0,n-1)+'…':v;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireClaimAwareness={analyse,render};
})();
