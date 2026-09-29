/* Quire Research Synthesis — Step 15 */
(function(){
  let selected=new Set();

  function articles(){return window.QuireStore.listArticles();}
  function dataFor(article){
    return article.citationData?.synthesis||{design:'',sample:'',methods:'',findings:'',limitations:'',relevance:''};
  }
  function saveField(articleId,key,value){
    const article=window.QuireStore.getArticle(articleId);
    if(!article)return;
    const synthesis={...dataFor(article),[key]:value};
    window.QuireStore.updateArticle(articleId,{citationData:{...(article.citationData||{}),synthesis}});
  }
  function label(article){
    const first=(article.authors||'').split(';')[0]?.trim().split(/\s+/).slice(-1)[0]||'Source';
    return first+(article.year?' '+article.year:'');
  }

  function seedFromAnnotations(articleId){
    const state=window.QuireStore.getState();
    const article=state.articles.find(a=>a.id===articleId);if(!article)return;
    const hs=state.highlights.filter(h=>h.articleId===articleId);
    const pick=cat=>hs.filter(h=>h.category===cat).map(h=>h.highlightedText).join(' ');
    const notes=state.notes.filter(n=>n.articleId===articleId).map(n=>n.body).filter(Boolean);
    const existing=dataFor(article);
    const synthesis={
      ...existing,
      methods:existing.methods||pick('methodology'),
      findings:existing.findings||pick('key_finding'),
      limitations:existing.limitations||pick('limitation'),
      relevance:existing.relevance||notes.slice(0,2).join(' ')
    };
    window.QuireStore.updateArticle(articleId,{citationData:{...(article.citationData||{}),synthesis}});
  }

  function renderSelector(){
    const mount=document.getElementById('synthesisArticlePicker');if(!mount)return;
    const rows=articles();
    if(!selected.size) rows.slice(0,Math.min(rows.length,4)).forEach(a=>selected.add(a.id));
    mount.innerHTML=rows.map(a=>
      '<label class="synthesis-pick"><input type="checkbox" value="'+a.id+'" '+(selected.has(a.id)?'checked':'')+'><span><strong>'+escapeHtml(a.title)+'</strong><small>'+escapeHtml(label(a))+'</small></span></label>'
    ).join('');
    mount.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{
      if(input.checked)selected.add(input.value);else selected.delete(input.value);
      renderMatrix();renderInsights();
    }));
  }

  function appraisalBadge(articleId){
    const appraisal=window.QuireStore.getAppraisal?.(articleId);
    const judgement=appraisal?.overallJudgement||'not_started';
    const label=window.QuireAppraisal?.getJudgementLabel?.(judgement)||'Not appraised';
    return '<span class="synthesis-appraisal-badge '+judgement+'">'+escapeHtml(label)+'</span>';
  }

  function fieldCell(article,key){
    const value=dataFor(article)[key]||'';
    return '<td><textarea data-synthesis-field="'+key+'" data-synthesis-article="'+article.id+'" placeholder="Add '+key+'…">'+escapeHtml(value)+'</textarea></td>';
  }

  function renderMatrix(){
    const table=document.getElementById('synthesisMatrix');if(!table)return;
    const rows=articles().filter(a=>selected.has(a.id));
    if(!rows.length){table.innerHTML='<tbody><tr><td>Select papers to compare.</td></tr></tbody>';return;}
    table.innerHTML='<thead><tr><th>Paper</th><th>Design</th><th>Sample</th><th>Methods</th><th>Key findings</th><th>Limitations</th><th>Thesis relevance</th></tr></thead><tbody>'+
      rows.map(a=>'<tr><th><strong>'+escapeHtml(label(a))+'</strong><small>'+escapeHtml(a.title)+'</small>'+appraisalBadge(a.id)+'<button type="button" data-synthesis-seed="'+a.id+'">Use annotations</button></th>'+
        ['design','sample','methods','findings','limitations','relevance'].map(k=>fieldCell(a,k)).join('')+'</tr>').join('')+
      '</tbody>';
    table.querySelectorAll('textarea').forEach(t=>t.addEventListener('change',()=>saveField(t.dataset.synthesisArticle,t.dataset.synthesisField,t.value)));
    table.querySelectorAll('[data-synthesis-seed]').forEach(b=>b.addEventListener('click',()=>{seedFromAnnotations(b.dataset.synthesisSeed);renderMatrix();renderInsights();}));
  }

  function terms(text){
    const stop=new Set('the and that with from this were have has for into their they study patients participants results findings using used'.split(' '));
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(x=>x.length>4&&!stop.has(x));
  }

  function possibleDisagreements(rows){
    const neg=/\b(no|not|without|did not|does not|failed to|no association|no difference|lower|decreased|reduced)\b/i;
    const pool=rows.map(a=>{
      const state=window.QuireStore.getState();
      const marked=state.highlights.filter(h=>h.articleId===a.id&&['key_finding','contradictory'].includes(h.category)).map(h=>h.highlightedText);
      const text=[dataFor(a).findings,...marked].filter(Boolean).join(' ');
      return {article:a,text,negative:neg.test(text),terms:new Set(terms(text))};
    }).filter(x=>x.text);
    const pairs=[];
    for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
      const shared=[...pool[i].terms].filter(t=>pool[j].terms.has(t));
      if(shared.length>=2 && pool[i].negative!==pool[j].negative){
        pairs.push({a:pool[i].article,b:pool[j].article,shared:shared.slice(0,5)});
      }
    }
    return pairs.slice(0,5);
  }

  function renderInsights(){
    const mount=document.getElementById('synthesisInsights');if(!mount)return;
    const rows=articles().filter(a=>selected.has(a.id));
    if(rows.length<2){
      mount.innerHTML='<div class="synthesis-insight"><strong>Select at least two papers</strong><p>Quire will describe common evidence patterns and missing matrix fields.</p></div>';return;
    }
    const findingTerms=new Map();
    rows.forEach(a=>[...new Set(terms(dataFor(a).findings))].forEach(t=>findingTerms.set(t,(findingTerms.get(t)||0)+1)));
    const common=[...findingTerms.entries()].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([t,n])=>t+' ('+n+')');
    const missing=rows.flatMap(a=>{
      const d=dataFor(a);return ['design','sample','limitations'].filter(k=>!d[k]).map(k=>label(a)+' · '+k);
    });
    const state=window.QuireStore.getState();
    const contradictions=state.highlights.filter(h=>selected.has(h.articleId)&&h.category==='contradictory').length;
    const disagreements=possibleDisagreements(rows);
    mount.innerHTML=
      '<div class="synthesis-insight"><span class="eyebrow">COMMON SIGNALS</span><strong>'+(common.length?escapeHtml(common.join(', ')):'No repeated finding terms yet')+'</strong><p>Repeated terms are a navigation aid, not a conclusion that studies agree.</p></div>'+
      '<div class="synthesis-insight"><span class="eyebrow">COUNTER-EVIDENCE & DISAGREEMENT</span><strong>'+contradictions+' researcher-marked · '+disagreements.length+' possible contrast'+(disagreements.length===1?'':'s')+'</strong><p>Quire looks for selected papers discussing similar terms with differing direction or negation. These are prompts to compare context, population and methods—not proof that the studies contradict one another.</p>'+
      (disagreements.length?'<div class="synthesis-disagreements">'+disagreements.map(d=>'<button type="button" data-compare-disagreement="'+escapeHtml(d.a.id)+'|'+escapeHtml(d.b.id)+'"><strong>'+escapeHtml(label(d.a))+' ↔ '+escapeHtml(label(d.b))+'</strong><small>Shared signals: '+escapeHtml(d.shared.join(', '))+'</small></button>').join('')+'</div>':'')+'</div>'+
      '<div class="synthesis-insight"><span class="eyebrow">MATRIX GAPS</span><strong>'+missing.length+' fields incomplete</strong><p>'+escapeHtml(missing.slice(0,6).join(' · ')||'Core comparison fields are populated.')+'</p></div>';
    mount.querySelectorAll('[data-compare-disagreement]').forEach(btn=>btn.addEventListener('click',()=>{
      const [a,b]=btn.dataset.compareDisagreement.split('|');
      selected=new Set([a,b]);renderSelector();renderMatrix();renderInsights();
    }));
  }

  function render(){renderSelector();renderMatrix();renderInsights();}
  function bind(){
    document.getElementById('refreshSynthesisBtn')?.addEventListener('click',render);
    window.addEventListener('quire:project-switched',()=>{selected=new Set();render();});
    window.addEventListener('quire:annotation-changed',renderInsights);
    window.addEventListener('quire:appraisal-changed',()=>{renderMatrix();renderInsights();});
    render();
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireSynthesis={render,possibleDisagreements};
})();