/* Quire Ideas & Provenance — Step 40 */
(function(){
  const ORIGINS={
    researcher:'Your idea',
    source:'Source-derived',
    supervisor:'Supervisor feedback',
    analysis:'Analysis memo',
    brainstorm:'Brainstorming'
  };
  const STATUSES={inbox:'Inbox',developing:'Developing themes',ready:'Ready for thesis'};

  function ideas(){
    return window.QuireStore.listAnalysisItems({kind:'idea'}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
  function render(){
    const board=document.getElementById('ideaBoard');if(!board)return;
    const rows=ideas();
    board.innerHTML=Object.entries(STATUSES).map(([status,label])=>{
      const group=rows.filter(x=>(x.payload?.ideaStatus||'inbox')===status);
      return '<div class="idea-column"><div class="column-head"><strong>'+label+'</strong><span>'+group.length+'</span></div>'+
        (group.length?group.map(card).join(''):'<div class="idea-empty">No ideas here yet.</div>')+'</div>';
    }).join('');
    board.querySelectorAll('[data-idea-next]').forEach(btn=>btn.addEventListener('click',()=>advance(btn.dataset.ideaNext)));
    board.querySelectorAll('[data-idea-remove]').forEach(btn=>btn.addEventListener('click',()=>{if(confirm('Remove this idea?'))window.QuireStore.removeAnalysisItem(btn.dataset.ideaRemove);}));
  }
  function card(row){
    const p=row.payload||{},origin=p.origin||'researcher',status=p.ideaStatus||'inbox';
    const next=status==='inbox'?'developing':status==='developing'?'ready':null;
    return '<article class="idea-card '+(status==='ready'?'ready':status==='developing'?'strong':'')+'">'+
      '<small>'+escapeHtml(ORIGINS[origin]||origin)+'</small><p>'+escapeHtml(row.title)+'</p>'+
      (p.sourceLabel?'<div class="idea-provenance">Origin: '+escapeHtml(p.sourceLabel)+'</div>':'')+
      '<div class="idea-tags"><span>'+escapeHtml(origin)+'</span>'+(p.sourcePage?'<span>p. '+escapeHtml(p.sourcePage)+'</span>':'')+'</div>'+
      '<div class="idea-actions">'+(next?'<button type="button" data-idea-next="'+row.id+'">Move to '+escapeHtml(STATUSES[next])+'</button>':'<button type="button" data-idea-next="'+row.id+'">Use in thesis</button>')+
      '<button type="button" data-idea-remove="'+row.id+'">Remove</button></div></article>';
  }
  function advance(id){
    const row=window.QuireStore.getAnalysisItem(id);if(!row)return;
    const current=row.payload?.ideaStatus||'inbox';
    if(current==='ready'){
      window.showView?.('chapters');
      window.dispatchEvent(new CustomEvent('quire:workflow-handoff',{detail:{title:'Idea ready for writing',copy:'Develop this idea in your own words and connect the evidence that supports or challenges it.',action:'Continue writing',view:'chapters'}}));
      return;
    }
    const next=current==='inbox'?'developing':'ready';
    window.QuireStore.updateAnalysisItem(id,{payload:{...(row.payload||{}),ideaStatus:next}});
  }
  function ensureModal(){
    if(document.getElementById('ideaCaptureModal'))return;
    const modal=document.createElement('div');modal.id='ideaCaptureModal';modal.className='modal';modal.hidden=true;
    modal.innerHTML='<div class="modal-card idea-capture-card" role="dialog" aria-modal="true" aria-labelledby="ideaCaptureTitle">'+
      '<div class="modal-head"><div><span class="eyebrow">IDEA CAPTURE</span><h2 id="ideaCaptureTitle">Capture the thought, keep its origin.</h2></div><button type="button" id="closeIdeaCapture">×</button></div>'+
      '<label><span>Your idea / interpretation</span><textarea id="ideaCaptureText" rows="5" placeholder="Write the idea in your own words…"></textarea></label>'+
      '<div class="idea-capture-grid"><label><span>Origin</span><select id="ideaCaptureOrigin">'+Object.entries(ORIGINS).map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select></label><label><span>Source / context</span><input id="ideaCaptureSource" type="text" placeholder="Optional source, supervisor, memo…"></label></div>'+
      '<div id="ideaCaptureQuoted" class="idea-capture-quoted" hidden></div>'+
      '<div class="modal-actions"><button type="button" class="soft-btn" id="cancelIdeaCapture">Cancel</button><button type="button" class="primary-btn" id="saveIdeaCapture">Save idea</button></div></div>';
    document.body.appendChild(modal);
    const close=()=>{modal.hidden=true;modal.dataset.sourceId='';modal.dataset.sourcePage='';document.getElementById('ideaCaptureQuoted').hidden=true;};
    document.getElementById('closeIdeaCapture').addEventListener('click',close);
    document.getElementById('cancelIdeaCapture').addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    document.getElementById('saveIdeaCapture').addEventListener('click',()=>{
      const text=document.getElementById('ideaCaptureText').value.trim();if(!text)return;
      window.QuireStore.addAnalysisItem({kind:'idea',title:text,payload:{ideaStatus:'inbox',origin:document.getElementById('ideaCaptureOrigin').value,sourceLabel:document.getElementById('ideaCaptureSource').value.trim(),sourceId:modal.dataset.sourceId||null,sourcePage:modal.dataset.sourcePage||null,sourceExcerpt:modal.dataset.sourceExcerpt||''}});
      close();window.showView?.('brainstorm');
    });
  }
  function capture(seed={}){
    ensureModal();const modal=document.getElementById('ideaCaptureModal');modal.hidden=false;
    document.getElementById('ideaCaptureText').value=seed.idea||'';
    document.getElementById('ideaCaptureOrigin').value=ORIGINS[seed.origin]?seed.origin:'researcher';
    document.getElementById('ideaCaptureSource').value=seed.sourceLabel||'';
    modal.dataset.sourceId=seed.sourceId||'';modal.dataset.sourcePage=seed.sourcePage||'';modal.dataset.sourceExcerpt=seed.sourceExcerpt||'';
    const quoted=document.getElementById('ideaCaptureQuoted');
    if(seed.sourceExcerpt){quoted.hidden=false;quoted.innerHTML='<span class="eyebrow">SOURCE CONTEXT</span><p>'+escapeHtml(seed.sourceExcerpt)+'</p>';}else quoted.hidden=true;
    setTimeout(()=>document.getElementById('ideaCaptureText')?.focus(),0);
  }
  function captureFromSource(detail={}){
    const text=String(detail.text||'').trim();if(!text)return null;
    return window.QuireStore.addAnalysisItem({kind:'idea',title:text,payload:{ideaStatus:'inbox',origin:detail.origin||'source',sourceLabel:detail.sourceLabel||'',sourceId:detail.sourceId||null,sourcePage:detail.sourcePage||null}});
  }
  function bind(){
    const btn=document.getElementById('newIdeaBtn');
    if(btn){const clone=btn.cloneNode(true);btn.replaceWith(clone);clone.addEventListener('click',capture);}
    window.addEventListener('quire:idea-capture-request',e=>capture(e.detail||{}));
    window.addEventListener('quire:store-changed',render);
    window.addEventListener('quire:project-switched',render);
    ensureModal();render();
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireIdeas={render,capture,captureFromSource};
})();
