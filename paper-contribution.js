/* Quire Reading Contribution Checkpoint & Literature Maturity Trend — Step 61 */
(function(){
  const SIGNALS={
    new_concept:{label:'Introduced a new concept / theme',short:'New concept'},
    reinforces:{label:'Reinforced an existing pattern',short:'Reinforces'},
    challenges:{label:'Challenged or contradicted a pattern',short:'Challenges'},
    method_context:{label:'Added useful method / context insight',short:'Method / context'},
    background:{label:'Primarily background / orientation',short:'Background'},
    little_new:{label:'Added little or no major new concept',short:'Little new'}
  };
  let pendingArticleId=null;

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function pid(){return window.QuireStore?.getActiveProjectId?.();}
  function articles(){return window.QuireStore?.listArticles?.()||[];}
  function contribution(article){
    const row=article?.citationData?.reviewContribution;
    if(!row||typeof row!=='object')return null;
    return {
      signals:Array.isArray(row.signals)?row.signals.filter(s=>SIGNALS[s]):[],
      note:String(row.note||''),
      recordedAt:String(row.recordedAt||'')
    };
  }
  function authorYear(article){
    const first=String(article?.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Source';
    return surname+(article?.year?' '+article.year:'');
  }

  function classified(projectId=pid()){
    const state=window.QuireStore?.getState?.()||{};
    return (state.articles||[])
      .filter(a=>a.projectId===projectId&&a.readingStatus==='reviewed'&&contribution(a))
      .sort((a,b)=>String(contribution(b)?.recordedAt||b.updatedAt||'').localeCompare(String(contribution(a)?.recordedAt||a.updatedAt||'')));
  }

  function maturityEvidence(projectId=pid()){
    const rows=classified(projectId);
    const recent=rows.slice(0,10);
    const counts={newConcept:0,reinforces:0,challenges:0,methodContext:0,background:0,littleNew:0};
    recent.forEach(article=>{
      const sig=new Set(contribution(article)?.signals||[]);
      if(sig.has('new_concept'))counts.newConcept++;
      if(sig.has('reinforces'))counts.reinforces++;
      if(sig.has('challenges'))counts.challenges++;
      if(sig.has('method_context'))counts.methodContext++;
      if(sig.has('background'))counts.background++;
      if(sig.has('little_new'))counts.littleNew++;
    });
    const recentFive=rows.slice(0,5);
    const fiveSignals=recentFive.map(a=>new Set(contribution(a)?.signals||[]));
    const newFive=fiveSignals.filter(s=>s.has('new_concept')).length;
    const recurFive=fiveSignals.filter(s=>s.has('reinforces')||s.has('little_new')).length;
    let key='building',label='Building evidence',copy='Not enough post-reading checkpoints yet to describe a maturity pattern.';
    if(rows.length>=3){
      if(newFive>=2){
        key='expanding';label='Still expanding';
        copy='Recent papers are still introducing new concepts or themes. Broader reading is still changing the map of the field.';
      }else if(recentFive.length>=5&&newFive===0&&recurFive>=3){
        key='recurring';label='Patterns recurring';
        copy='Recent papers are mostly reinforcing known patterns or adding little that is conceptually new. This supports a stabilising signal, but it is not proof of saturation or search completeness.';
      }else{
        key='developing';label='Developing';
        copy='The recent literature is adding a mixture of reinforcement, challenge and new insight. Keep comparing before treating the landscape as stable.';
      }
    }
    return {classified:rows.length,recentCount:recent.length,counts,newFive,recurFive,key,label,copy};
  }

  function ensureModal(){
    if(document.getElementById('paperContributionModal'))return;
    const modal=document.createElement('div');
    modal.id='paperContributionModal';
    modal.className='modal-backdrop';
    modal.hidden=true;
    modal.innerHTML=
      '<div class="modal paper-contribution-modal" role="dialog" aria-modal="true" aria-labelledby="paperContributionTitle">'+
        '<div class="modal-head"><div><span class="eyebrow">POST-READING CHECKPOINT</span><h2 id="paperContributionTitle">What did this paper add to your understanding?</h2></div><button id="closePaperContribution" type="button">×</button></div>'+
        '<p class="paper-contribution-intro">This is your judgement after reading the paper. Quire uses it only to show how your literature landscape is changing over time.</p>'+
        '<div id="paperContributionArticle" class="paper-contribution-article"></div>'+
        '<div class="paper-contribution-options">'+
          Object.entries(SIGNALS).map(([value,row])=>'<label><input type="checkbox" value="'+value+'"><span>'+escapeHtml(row.label)+'</span></label>').join('')+
        '</div>'+
        '<label class="field wide"><span>What was genuinely new, reinforced or challenged? (optional)</span><textarea id="paperContributionNote" rows="3" placeholder="Record the main change in your understanding."></textarea></label>'+
        '<small id="paperContributionMessage" class="gap-signal-message"></small>'+
        '<div class="account-button-row"><button class="soft-btn" id="paperContributionLater" type="button">Later</button><button class="primary-btn" id="savePaperContribution" type="button">Save checkpoint</button></div>'+
      '</div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;pendingArticleId=null;};
    document.getElementById('closePaperContribution')?.addEventListener('click',close);
    document.getElementById('paperContributionLater')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('savePaperContribution')?.addEventListener('click',save);
  }

  function open(articleId){
    ensureModal();
    const article=window.QuireStore?.getArticle?.(articleId);if(!article)return;
    pendingArticleId=articleId;
    const existing=contribution(article);
    document.getElementById('paperContributionArticle').innerHTML='<strong>'+escapeHtml(article.title||'Untitled paper')+'</strong><small>'+escapeHtml(authorYear(article))+'</small>';
    document.querySelectorAll('#paperContributionModal .paper-contribution-options input').forEach(input=>input.checked=Boolean(existing?.signals.includes(input.value)));
    document.getElementById('paperContributionNote').value=existing?.note||'';
    document.getElementById('paperContributionMessage').textContent='';
    document.getElementById('paperContributionModal').hidden=false;
  }

  function save(){
    if(!pendingArticleId)return;
    const selected=[...document.querySelectorAll('#paperContributionModal .paper-contribution-options input:checked')].map(i=>i.value);
    const message=document.getElementById('paperContributionMessage');
    if(!selected.length){if(message)message.textContent='Choose at least one description of what the paper added.';return;}
    const article=window.QuireStore.getArticle(pendingArticleId);if(!article)return;
    window.QuireStore.updateArticle(pendingArticleId,{
      citationData:{
        ...(article.citationData||{}),
        reviewContribution:{
          signals:selected,
          note:document.getElementById('paperContributionNote')?.value.trim()||'',
          recordedAt:new Date().toISOString()
        }
      }
    });
    document.getElementById('paperContributionModal').hidden=true;
    pendingArticleId=null;
    render();
    window.dispatchEvent(new CustomEvent('quire:literature-maturity-updated'));
  }

  function render(){
    const summary=document.getElementById('literatureMaturitySummary');
    const trend=document.getElementById('literatureMaturityTrend');
    if(!summary||!trend||!window.QuireStore)return;
    const evidence=maturityEvidence();
    summary.innerHTML=
      '<div><strong>'+evidence.classified+'</strong><span>reviewed papers classified</span></div>'+
      '<div><strong>'+evidence.counts.newConcept+'</strong><span>recent new-concept signals</span></div>'+
      '<div><strong>'+evidence.counts.reinforces+'</strong><span>recent reinforcement signals</span></div>'+
      '<div><strong>'+evidence.counts.challenges+'</strong><span>recent challenge signals</span></div>'+
      '<div class="maturity-state"><strong>'+escapeHtml(evidence.label)+'</strong><span>'+escapeHtml(evidence.copy)+'</span></div>';

    const rows=classified().slice(0,10);
    if(!rows.length){
      trend.innerHTML='<div class="literature-maturity-empty">Mark papers reviewed and complete the optional post-reading checkpoint to build a maturity trend.</div>';
      return;
    }
    trend.innerHTML=rows.map(article=>{
      const row=contribution(article);
      return '<article class="maturity-paper-row">'+
        '<div><strong>'+escapeHtml(authorYear(article))+'</strong><small>'+escapeHtml(article.title||'Untitled paper')+'</small></div>'+
        '<div class="maturity-signal-chips">'+row.signals.map(s=>'<span class="'+escapeHtml(s)+'">'+escapeHtml(SIGNALS[s].short)+'</span>').join('')+'</div>'+
        (row.note?'<p>'+escapeHtml(row.note)+'</p>':'')+
        '<button type="button" data-edit-paper-contribution="'+escapeHtml(article.id)+'">Edit checkpoint</button>'+
      '</article>';
    }).join('');
    trend.querySelectorAll('[data-edit-paper-contribution]').forEach(btn=>btn.addEventListener('click',()=>open(btn.dataset.editPaperContribution)));
  }

  function bind(){
    ensureModal();
    window.addEventListener('quire:paper-reviewed',event=>{
      const articleId=event.detail?.articleId;
      const article=articleId?window.QuireStore?.getArticle?.(articleId):null;
      if(article&&!contribution(article))open(articleId);
    });
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:view-changed',event=>{if(event.detail?.viewId==='synthesis')render();});
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuirePaperContribution={render,open,classified,maturityEvidence,signals:SIGNALS};
})();