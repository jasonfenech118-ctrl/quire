/* Quire Writing Companion — Step 32
   Reflects the researcher's meaning and offers optional language guidance.
   It never edits manuscript content automatically. */
(function(){
  let timer=null;
  const PATTERN_KEY='quire_writing_patterns_v1';

  function editor(){return document.getElementById('liveSectionEditor');}
  function clean(text=''){return String(text).replace(/\s+/g,' ').trim();}
  function sentences(text=''){return clean(text).split(/(?<=[.!?])\s+/).map(clean).filter(Boolean);}
  function words(text=''){return clean(text).match(/\b[\w’'-]+\b/g)||[];}

  function currentParagraph(){
    const root=editor();
    const sel=window.getSelection?.();
    let node=sel?.anchorNode;
    if(node?.nodeType===3)node=node.parentElement;
    if(node&&root?.contains(node)){
      const block=node.closest?.('p,li,blockquote,div,h2,h3');
      const text=clean(block?.innerText);
      if(text)return text;
    }
    const blocks=[...(root?.querySelectorAll?.('p,li,blockquote,div,h2,h3')||[])];
    const last=blocks.map(x=>clean(x.innerText)).filter(Boolean).pop();
    return last||clean(root?.innerText||'');
  }

  function understanding(text){
    const ss=sentences(text);
    if(!text)return 'Start writing a paragraph. Quire will reflect back the main idea it understands so you can check whether your meaning is clear.';
    const lead=ss[0]||text;
    const contrast=ss.find(s=>/\b(however|although|whereas|but|despite|in contrast)\b/i.test(s));
    const cause=ss.find(s=>/\b(because|therefore|thus|consequently|suggests?|indicates?|associated with|leads? to)\b/i.test(s));
    let out='Your main point appears to be: “'+lead.slice(0,220)+(lead.length>220?'…':'')+'”';
    if(contrast&&contrast!==lead)out+=' You also seem to be adding a qualification or contrasting point.';
    else if(cause&&cause!==lead)out+=' You then appear to explain a relationship, reason or implication.';
    if(ss.length>4)out+=' The paragraph contains several ideas, so consider whether one deserves its own paragraph.';
    return out;
  }

  function languageSuggestions(text){
    const out=[];
    const ss=sentences(text);
    const long=ss.find(s=>words(s).length>32);
    if(long)out.push({title:'Shorten a long sentence',body:'One sentence is '+words(long).length+' words. Splitting it may make the argument easier to follow.'});
    const ands=(text.match(/\band\b/gi)||[]).length;
    if(ands>=4)out.push({title:'Reduce repeated “and”',body:'You use “and” several times. Consider separating distinct ideas or using a more precise relationship such as “however”, “therefore”, “in addition” or “whereas” only when that relationship is genuinely intended.'});
    if(/\b(i think|i believe|in my opinion)\b/i.test(text))out.push({title:'Strengthen academic phrasing',body:'If this is an interpretation, name what the interpretation is based on rather than relying only on “I think” or “I believe”.'});
    if(/\b(very|really|a lot|good|bad|big|thing|things)\b/i.test(text))out.push({title:'Use more precise vocabulary',body:'A general or conversational word appears here. Replace it only if a more precise term better expresses your intended meaning; avoid complicated vocabulary for its own sake.'});
    if(/\b(proves?|always|never|definitely|clearly|obviously)\b/i.test(text))out.push({title:'Check strength of claim',body:'This wording sounds definitive. In academic writing, make sure the evidence justifies that level of certainty; terms such as “suggests”, “indicates” or “is associated with” may be more accurate when appropriate.'});
    if(ss.length>=2&&!/\b(however|therefore|thus|because|although|whereas|additionally|furthermore|in contrast|for example)\b/i.test(text))out.push({title:'Make the relationship explicit',body:'Check whether the reader can tell how the sentences relate: continuation, contrast, cause, example or interpretation. Add a transition only if it makes that logic clearer.'});
    if(!out.length)out.push({title:'Meaning is reasonably clear',body:'No obvious local language issue was detected. Use “Review current paragraph” for a deeper academic-language check when needed.'});
    return out.slice(0,3);
  }

  function reviewCategories(text){
    const ss=sentences(text), wc=words(text).length;
    const longCount=ss.filter(s=>words(s).length>32).length;
    const ands=(text.match(/\band\b/gi)||[]).length;
    const conversational=(text.match(/\b(really|very|a lot|good|bad|big|thing|things)\b/gi)||[]);
    const strong=(text.match(/\b(proves?|always|never|definitely|clearly|obviously)\b/gi)||[]);
    return [
      {key:'meaning',title:'Meaning understood',body:understanding(text)},
      {key:'grammar',title:'Language & grammar',body:longCount?'The paragraph contains '+longCount+' long sentence'+(longCount>1?'s':'')+'. Shorter sentence boundaries may improve readability.':'No obvious sentence-length problem was detected in this paragraph.'},
      {key:'clarity',title:'Academic clarity',body:ands>=4?'Several ideas are linked with “and”. Check whether each relationship is continuation, contrast, cause or a separate point.':(ss.length>4?'The paragraph carries several steps of the argument. Check that one main point remains dominant.':'The paragraph structure appears reasonably focused at this level.')},
      {key:'vocabulary',title:'Vocabulary',body:conversational.length?'Consider a more precise alternative for: '+[...new Set(conversational.map(x=>x.toLowerCase()))].join(', ')+'. Choose the simplest accurate academic term rather than a more complicated synonym.':'No obvious conversational vocabulary was detected. Keep prioritising precise, natural wording over complexity.'},
      {key:'evidence',title:'Evidence & claim caution',body:strong.length?'The wording includes a strong certainty signal ('+[...new Set(strong)].join(', ')+'). Check that linked evidence supports that strength of claim.':'No obvious absolute claim marker was detected. Factual, causal and comparative statements should still be checked against their sources.'}
    ];
  }

  function proposedWording(text){
    let proposal=clean(text);
    proposal=proposal.replace(/\ba lot of\b/gi,'many').replace(/\breally\b/gi,'substantially');
    proposal=proposal.replace(/\bvery important\b/gi,'important');
    proposal=proposal.replace(/\bproves that\b/gi,'provides evidence that');
    proposal=proposal.replace(/\bclearly shows\b/gi,'suggests');
    const ss=sentences(proposal);
    const longIndex=ss.findIndex(s=>words(s).length>36);
    if(longIndex>=0){
      const s=ss[longIndex];
      const split=s.match(/^(.{40,}?[;,])\s+(.+)$/);
      if(split)ss[longIndex]=split[1].replace(/[;,]$/,'.')+' '+split[2];
      proposal=ss.join(' ');
    }
    return proposal;
  }

  function patternSnapshot(text){
    const ss=sentences(text);
    return {
      samples:text?1:0,
      longSentences:ss.filter(s=>words(s).length>32).length,
      repeatedAnd:(text.match(/\band\b/gi)||[]).length>=4?1:0,
      conversational:/\b(really|very|a lot|good|bad|big|thing|things)\b/i.test(text)?1:0,
      strongClaims:/\b(proves?|always|never|definitely|clearly|obviously)\b/i.test(text)?1:0
    };
  }
  function recordPatterns(text){
    if(words(text).length<20)return;
    let saved={samples:0,longSentences:0,repeatedAnd:0,conversational:0,strongClaims:0};
    try{saved={...saved,...JSON.parse(localStorage.getItem(PATTERN_KEY)||'{}')};}catch(_){}
    const snap=patternSnapshot(text);
    Object.keys(saved).forEach(k=>saved[k]=(Number(saved[k])||0)+(Number(snap[k])||0));
    localStorage.setItem(PATTERN_KEY,JSON.stringify(saved));
  }
  function recurringPattern(){
    let p={};
    try{p=JSON.parse(localStorage.getItem(PATTERN_KEY)||'{}');}catch(_){}
    if((p.samples||0)<4)return '';
    const notes=[];
    if((p.longSentences||0)>=3)notes.push('long linked sentences');
    if((p.repeatedAnd||0)>=3)notes.push('repeated use of “and” to connect ideas');
    if((p.conversational||0)>=3)notes.push('general or conversational wording');
    if((p.strongClaims||0)>=3)notes.push('strong certainty wording');
    return notes.length?'A recurring pattern in your recent writing is '+notes.slice(0,2).join(' and ')+'. Quire will keep highlighting this gently; this is not a language score.':'';
  }

  function render(force=false){
    const text=currentParagraph();
    const state=document.getElementById('writingCompanionState');
    const understood=document.getElementById('writingUnderstanding');
    const mount=document.getElementById('writingLanguageSuggestions');
    if(!understood||!mount)return;
    if(state)state.textContent=text?(force?'Reviewed':'Live'):'Ready';
    understood.textContent=understanding(text)+(recurringPattern()?' '+recurringPattern():'');
    mount.innerHTML=languageSuggestions(text).map(x=>'<div class="language-suggestion"><strong>'+escapeHtml(x.title)+'</strong><small>'+escapeHtml(x.body)+'</small></div>').join('');
  }

  function queue(){
    clearTimeout(timer);
    const state=document.getElementById('writingCompanionState');
    if(state)state.textContent='Reading…';
    timer=setTimeout(()=>{const text=currentParagraph();recordPatterns(text);render(false);},650);
  }

  function deeperReview(){
    render(true);
    window.QuireWritingRibbon?.rememberWritingContext?.();
    const text=currentParagraph();
    if(text){
      window.showView?.('review');
      window.dispatchEvent(new CustomEvent('quire:writing-copilot-request',{detail:{
        prompt:'Reflect back what you understand this paragraph to mean, then suggest optional improvements to grammar, sentence structure, academic clarity and vocabulary. Preserve my intended meaning, do not add factual claims, do not make the vocabulary unnecessarily complex, and keep all suggestions separate from the manuscript.',
        selectedText:text,paragraph:text,sectionId:window.QuireChapterEditor?.getActive?.().sectionId||null
      }}));
    }
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}

  function bind(){
    editor()?.addEventListener('input',queue);
    editor()?.addEventListener('keyup',queue);
    editor()?.addEventListener('mouseup',()=>render(false));
    document.getElementById('reviewCurrentParagraphBtn')?.addEventListener('click',deeperReview);
    window.addEventListener('quire:section-opened',()=>setTimeout(()=>render(false),0));
    render(false);
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireWritingCompanion={render,currentParagraph,understanding,languageSuggestions,reviewCategories,proposedWording,recurringPattern};
})();