/* Quire writing ribbon and evidence-aware writing actions */
(function(){
  let lastSelectionText='';
  let writingContext=null;

  function editor(){return document.getElementById('liveSectionEditor');}
  function selectedText(){
    const selection=window.getSelection?.();
    const text=selection?.toString?.().trim()||'';
    if(text)lastSelectionText=text;
    return text||lastSelectionText;
  }
  function paragraphText(){
    const sel=window.getSelection?.();
    let node=sel?.anchorNode;
    if(node?.nodeType===3)node=node.parentElement;
    const root=editor();
    if(node&&root?.contains(node)){
      const block=node.closest?.('p,li,blockquote,div,h2,h3');
      const text=block?.innerText?.trim();
      if(text)return text;
    }
    return selectedText()||'';
  }
  function rememberWritingContext(){
    writingContext={
      sectionId:window.QuireChapterEditor?.getActive?.().sectionId||window.QuireChapterEditor?.getCurrentSectionId?.()||null,
      selection:selectedText(),
      paragraph:paragraphText()
    };
    updateReturnControl(document.querySelector('.view.active')?.id||'chapters');
    return writingContext;
  }
  function updateReturnControl(viewId){
    const btn=document.getElementById('returnToWritingBtn');
    if(!btn)return;
    const show=Boolean(writingContext?.sectionId)&&viewId!=='chapters';
    btn.hidden=!show;
    const label=document.getElementById('returnToWritingLabel');
    if(label&&show){
      const section=(window.QuireStore?.getState?.().sections||[]).find(s=>s.id===writingContext.sectionId);
      label.textContent=section?.title?('Back to '+section.title):'Back to your section';
    }
  }
  function returnToWriting(){
    const sectionId=writingContext?.sectionId;
    window.showView?.('chapters');
    if(sectionId){
      setTimeout(()=>{
        window.QuireChapterEditor?.openSection?.(sectionId);
        editor()?.focus();
      },80);
    }else setTimeout(()=>editor()?.focus(),80);
    updateReturnControl('chapters');
  }
  function openReference(){
    rememberWritingContext();
    document.getElementById('insertReferenceBtn')?.click();
  }
  function openEvidence(){
    rememberWritingContext();
    document.getElementById('openEvidenceLinker')?.click();
  }
  function openReview(){
    rememberWritingContext();
    window.showView?.('review');
    setTimeout(()=>document.getElementById('runWritingReview')?.click(),50);
  }
  function openCopilotWith(prompt){
    rememberWritingContext();
    window.showView?.('review');
    window.dispatchEvent(new CustomEvent('quire:writing-copilot-request',{detail:{
      prompt,
      selectedText:selectedText(),
      paragraph:paragraphText(),
      sectionId:window.QuireChapterEditor?.getCurrentSectionId?.()||null
    }}));
  }

  function findLibrary(){
    rememberWritingContext();
    const q=writingContext?.selection||writingContext?.paragraph||'';
    window.showView?.('library');
    setTimeout(()=>{
      const input=document.getElementById('librarySearch');
      if(input&&q){input.value=q.slice(0,120);input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
    },60);
  }

  function findEvidence(){
    rememberWritingContext();
    const claim=writingContext?.selection||writingContext?.paragraph||'';
    window.dispatchEvent(new CustomEvent('quire:discover-evidence',{detail:{claim,source:'writing-ribbon'}}));
  }

  function bind(){
    document.querySelectorAll('[data-ribbon-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      const tab=btn.dataset.ribbonTab;
      document.querySelectorAll('[data-ribbon-tab]').forEach(x=>x.classList.toggle('active',x===btn));
      document.querySelectorAll('[data-ribbon-panel]').forEach(x=>x.classList.toggle('active',x.dataset.ribbonPanel===tab));
    }));
    editor()?.addEventListener('mouseup',()=>selectedText());
    editor()?.addEventListener('keyup',()=>selectedText());

    document.getElementById('ribbonInsertReferenceBtn')?.addEventListener('click',openReference);
    document.getElementById('ribbonFindLibraryBtn')?.addEventListener('click',findLibrary);
    document.getElementById('ribbonFindEvidenceBtn')?.addEventListener('click',findEvidence);
    document.getElementById('ribbonOpenEvidenceBtn')?.addEventListener('click',openEvidence);
    document.getElementById('ribbonCheckClaimBtn')?.addEventListener('click',()=>openCopilotWith('Check whether my selected claim is accurately supported by the sources linked to this section. Distinguish support, partial support, contradiction, and insufficient evidence. Quote no more than necessary and identify the source/page when available.'));
    document.getElementById('ribbonImproveWritingBtn')?.addEventListener('click',()=>openCopilotWith('Improve the academic clarity of my selected wording without changing the meaning or adding new factual claims. Explain any material wording change.'));
    document.getElementById('ribbonReviewSectionBtn')?.addEventListener('click',openReview);
    document.getElementById('ribbonExplainBtn')?.addEventListener('click',()=>openCopilotWith('Explain the argument I am making in this paragraph and identify any logical jump or ambiguous wording.'));
    document.getElementById('ribbonChallengeBtn')?.addEventListener('click',()=>openCopilotWith('Act as a critical academic reader. Challenge this paragraph using only grounded evidence and clearly separate evidence from suggestions.'));
    document.getElementById('ribbonFindGapBtn')?.addEventListener('click',()=>openCopilotWith('Identify factual or interpretive claims in this paragraph that still need evidence, and explain what type of source would support each claim.'));
    document.getElementById('returnToWritingBtn')?.addEventListener('click',returnToWriting);
    window.addEventListener('quire:return-to-writing',returnToWriting);
    window.addEventListener('quire:view-changed',e=>updateReturnControl(e.detail?.viewId));
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireWritingRibbon={selectedText,paragraphText,rememberWritingContext,returnToWriting,getContext:()=>writingContext,updateReturnControl};
})();