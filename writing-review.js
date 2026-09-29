/* Quire Writing Review — Step 13 */
(function(){
  let suggestions=[];
  let activeSectionId=null;

  function textOf(html=''){
    const div=document.createElement('div');div.innerHTML=html;
    return (div.innerText||'').replace(/\s+/g,' ').trim();
  }
  function sentenceList(text=''){
    return String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];
  }
  function escRe(s){return String(s).replace(/[.*+?^$()|[\]\\{}]/g,'\\$&');}

  function analyseSection(section){
    const text=textOf(section.content||'');
    const out=[];
    let n=0;
    const add=(type,original,replacement,message)=>out.push({id:'review_'+(++n),type,original,replacement,message,status:'open'});

    const phrases=[
      ['clearly shows','suggests','This wording may sound more definitive than the evidence warrants.'],
      ['proves that','provides evidence that','“Proves” is usually too absolute for academic writing.'],
      ['always','often','Check whether an absolute statement is justified by your evidence.'],
      ['all patients','patients in the cited studies','This generalises beyond the population directly evidenced.'],
      ['a lot of','many','Consider a more formal academic expression.'],
      ['really','substantially','Consider a more precise academic modifier.'],
      ['very important','important','“Very” can usually be removed or replaced with a precise description of importance.']
    ];
    phrases.forEach(([needle,replacement,message])=>{
      const m=text.match(new RegExp('\\b'+escRe(needle)+'\\b','i'));
      if(m) add('clarity',m[0],replacement,message);
    });

    sentenceList(text).forEach(sentence=>{
      const wc=(sentence.match(/\b[\w’'-]+\b/g)||[]).length;
      if(wc>38) add('readability',sentence,null,'This sentence is '+wc+' words long. Consider splitting it into two sentences.');
      if(/\b(all|always|never|proves?|clearly|undoubtedly)\b/i.test(sentence) && !/\([^)]*(?:19|20)\d{2}[^)]*\)/.test(sentence)){
        add('evidence',sentence,null,'This broad or definitive claim does not contain an obvious in-text citation. Link evidence or narrow the wording.');
      }
    });

    const paragraphs=String(section.content||'').split(/<\/p>|<br\s*\/?>/i).map(textOf).filter(Boolean);
    paragraphs.forEach(p=>{
      const wc=(p.match(/\b[\w’'-]+\b/g)||[]).length;
      if(wc>180) add('structure',p,null,'This paragraph is long ('+wc+' words). Consider separating one supporting idea into a new paragraph.');
    });

    const starters=new Map();
    sentenceList(text).forEach(s=>{
      const key=s.split(/\s+/).slice(0,3).join(' ').toLowerCase();
      if(key.length>6) starters.set(key,(starters.get(key)||0)+1);
    });
    const repeat=[...starters.entries()].find(([,count])=>count>=3);
    if(repeat) add('repetition',repeat[0],null,'Several sentences begin similarly. Varying sentence openings may improve flow.');

    if(!text) add('structure','',null,'This section is empty. Start with the main point the section needs to establish, then build evidence around it.');
    return out.slice(0,14);
  }

  function sections(){
    const state=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    const chapters=window.QuireStore.listChapters();
    return state.sections.filter(s=>s.projectId===projectId).map(s=>({...s,chapter:chapters.find(c=>c.id===s.chapterId)}));
  }

  function renderSelector(){
    const select=document.getElementById('reviewSectionSelect');
    if(!select)return;
    const rows=sections();
    if(!activeSectionId||!rows.some(s=>s.id===activeSectionId)){
      activeSectionId=window.QuireChapterEditor?.getActive?.().sectionId||rows[0]?.id||null;
    }
    select.innerHTML=rows.map(s=>'<option value="'+s.id+'" '+(s.id===activeSectionId?'selected':'')+'>'+escapeHtml((s.chapter?.number||'')+' '+(s.chapter?.title||'')+' · '+s.title)+'</option>').join('');
  }

  function renderDocument(){
    const section=sections().find(s=>s.id===activeSectionId);
    const doc=document.getElementById('reviewDocument');
    if(!doc)return;
    document.getElementById('reviewDocumentTitle').textContent=section?.title||'No section selected';
    doc.innerHTML=section?.content||'<p class="placeholder-paragraph">This section has no text yet.</p>';
  }

  function renderSuggestions(){
    const mount=document.getElementById('writingSuggestions');
    const count=document.getElementById('writingSuggestionCount');
    if(!mount)return;
    const open=suggestions.filter(s=>s.status==='open');
    if(count)count.textContent=open.length+' suggestions';
    if(!open.length){
      mount.innerHTML='<div class="review-empty"><strong>No open suggestions</strong><small>Run a review to check clarity, academic tone, sentence length, repetition, structure and obvious evidence gaps.</small></div>';
      return;
    }
    mount.innerHTML=open.map(s=>
      '<article class="suggestion-card live-suggestion">'+
      '<span class="suggestion-type '+(s.type==='evidence'?'warning':'')+'">'+escapeHtml(s.type.toUpperCase())+'</span>'+
      (s.original?'<p><strong>'+escapeHtml(shorten(s.original,150))+'</strong></p>':'')+
      '<p>'+escapeHtml(s.message)+'</p>'+
      (s.replacement?'<div class="replacement">Suggested: “'+escapeHtml(s.replacement)+'”</div>':'')+
      '<div class="suggestion-actions">'+
      (s.replacement?'<button type="button" data-review-accept="'+s.id+'">Accept</button>':'')+
      (s.type==='evidence'?'<button type="button" data-review-evidence="'+s.id+'">Find evidence</button>':'')+
      '<button type="button" data-review-dismiss="'+s.id+'">Dismiss</button></div></article>'
    ).join('');
    mount.querySelectorAll('[data-review-accept]').forEach(b=>b.addEventListener('click',()=>accept(b.dataset.reviewAccept)));
    mount.querySelectorAll('[data-review-dismiss]').forEach(b=>b.addEventListener('click',()=>dismiss(b.dataset.reviewDismiss)));
    mount.querySelectorAll('[data-review-evidence]').forEach(b=>b.addEventListener('click',()=>{
      window.showView?.('chapters');
      setTimeout(()=>window.QuireEvidenceWriting?.open?.(),80);
    }));
  }

  function shorten(s,n){const v=String(s);return v.length>n?v.slice(0,n-1)+'…':v;}

  function replaceTextInHtml(html,original,replacement){
    const root=document.createElement('div');root.innerHTML=html;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())){
      const i=node.nodeValue.toLowerCase().indexOf(String(original).toLowerCase());
      if(i>=0){
        node.nodeValue=node.nodeValue.slice(0,i)+replacement+node.nodeValue.slice(i+String(original).length);
        return root.innerHTML;
      }
    }
    return html;
  }

  function accept(id){
    const s=suggestions.find(x=>x.id===id);
    const section=sections().find(x=>x.id===activeSectionId);
    if(!s||!section||!s.replacement)return;
    const content=replaceTextInHtml(section.content||'',s.original,s.replacement);
    const count=(textOf(content).match(/\b[\w’'-]+\b/g)||[]).length;
    window.QuireStore.updateSection(section.id,{content,currentWordCount:count});
    s.status='accepted';renderDocument();renderSuggestions();
  }
  function dismiss(id){
    const s=suggestions.find(x=>x.id===id);
    if(s)s.status='dismissed';
    renderSuggestions();
  }

  function review(){
    const section=sections().find(s=>s.id===activeSectionId);
    if(!section)return;
    suggestions=analyseSection(section);
    renderDocument();
    renderSuggestions();
  }

  function handleWritingCopilot(detail={}){
    if(detail.sectionId) activeSectionId=detail.sectionId;
    renderSelector();renderDocument();
    const section=sections().find(s=>s.id===activeSectionId);
    const focus=String(detail.selectedText||detail.paragraph||'').trim();
    const prompt=String(detail.prompt||'').toLowerCase();
    suggestions=section?analyseSection(section):[];

    let message='Review this passage alongside the section-level suggestions. Quire keeps this guidance separate from the manuscript until you choose an edit.';
    let type='copilot';
    if(prompt.includes('improve the academic clarity')){
      message='Focus on precision, sentence length, unnecessary intensifiers and claims that sound stronger than the evidence. The review below proposes only changes it can identify locally; no wording is inserted automatically.';
    }else if(prompt.includes('explain the argument')){
      const first=sentenceList(focus)[0]||focus;
      message=first
        ? 'The apparent lead proposition is: “'+shorten(first,180)+'” Check that the sentences which follow provide a clear reason, evidence or transition rather than introducing a separate idea.'
        : 'Select a paragraph with text so Quire can trace its lead proposition and supporting reasoning.';
    }else if(prompt.includes('challenge this paragraph')){
      message=/\b(all|always|never|proves?|clearly|undoubtedly|causes?)\b/i.test(focus)
        ? 'This passage contains broad or definitive wording. Test whether the cited evidence supports that strength of claim, the same population and the same context; consider plausible alternative explanations.'
        : 'Stress-test this passage: what assumption connects the evidence to the conclusion, what alternative explanation could fit, and does the cited population/context match the claim?';
    }else if(prompt.includes('still need evidence')){
      type='evidence';
      message='Run the evidence audit below for claim-level citation gaps. Prioritise factual, causal, comparative and generalisable statements; reflective or signposting sentences may not need a citation.';
      setTimeout(()=>document.getElementById('runEvidenceCheck')?.click(),0);
    }else if(prompt.includes('accurately supported')){
      type='evidence';
      message='Use the evidence audit to compare the wording with saved source passages. Related evidence is not automatically full support; verify direction, population, context and page-level wording before relying on the citation.';
      setTimeout(()=>document.getElementById('runEvidenceCheck')?.click(),0);
    }

    suggestions.unshift({
      id:'copilot_context_'+Date.now(),
      type,
      original:focus,
      replacement:null,
      message,
      status:'open'
    });
    renderSuggestions();
  }

  function bind(){
    renderSelector();renderDocument();renderSuggestions();
    document.getElementById('runWritingReview')?.addEventListener('click',review);
    document.getElementById('reviewSectionSelect')?.addEventListener('change',e=>{
      activeSectionId=e.target.value;suggestions=[];renderDocument();renderSuggestions();
    });
    window.addEventListener('quire:project-switched',()=>{
      activeSectionId=null;suggestions=[];renderSelector();renderDocument();renderSuggestions();
    });
    window.addEventListener('quire:writing-copilot-request',e=>handleWritingCopilot(e.detail||{}));
    window.addEventListener('quire:store-changed',()=>{
      if(document.getElementById('review')?.classList.contains('active'))renderSelector();
    });
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireWritingReview={review,analyseSection,handleWritingCopilot};
})();