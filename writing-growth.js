/* Quire Personal Writing Growth — Step 47 */
(function(){
  const key=()=> 'quire_writing_growth_v1:'+(window.QuireStore?.getActiveProjectId?.()||'default');
  function rows(){try{return JSON.parse(localStorage.getItem(key())||'[]');}catch(e){return [];}}
  function saveRows(v){localStorage.setItem(key(),JSON.stringify(v.slice(-100)));}
  function add(detail={}){
    if(!detail.original||!detail.replacement||detail.original===detail.replacement)return;
    const list=rows();
    list.push({id:'lesson_'+Date.now(),type:detail.type||'clarity',original:String(detail.original),replacement:String(detail.replacement),explanation:String(detail.message||''),sectionId:detail.sectionId||null,status:'new',createdAt:new Date().toISOString()});
    saveRows(list);render();
  }
  function categories(list){
    const map=new Map();
    list.forEach(x=>map.set(x.type,(map.get(x.type)||0)+1));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function ensureModal(){
    if(document.getElementById('writingGrowthModal'))return;
    const modal=document.createElement('div');modal.id='writingGrowthModal';modal.className='modal';modal.hidden=true;
    modal.innerHTML='<div class="modal-card writing-growth-card" role="dialog" aria-modal="true" aria-labelledby="writingGrowthTitle"><div class="modal-head"><div><span class="eyebrow">PERSONAL WRITING GROWTH</span><h2 id="writingGrowthTitle">Learn from edits you chose to accept.</h2></div><button id="closeWritingGrowth" type="button">×</button></div><p class="writing-growth-intro">Quire records accepted language edits locally so recurring lessons become easier to notice. This is not an English score.</p><div id="writingGrowthSummary"></div><div id="writingGrowthLessons"></div></div>';
    document.body.appendChild(modal);
    const close=()=>modal.hidden=true;document.getElementById('closeWritingGrowth').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close();});
  }
  function render(){
    ensureModal();const list=rows(),summary=document.getElementById('writingGrowthSummary'),mount=document.getElementById('writingGrowthLessons');if(!summary||!mount)return;
    const cats=categories(list);
    summary.innerHTML='<div class="writing-growth-summary"><div><strong>'+list.length+'</strong><span>accepted lessons</span></div><div><strong>'+list.filter(x=>x.status==='mastered').length+'</strong><span>marked mastered</span></div><div><strong>'+(cats[0]?.[0]||'—')+'</strong><span>most common area</span></div></div>';
    mount.innerHTML=list.length?list.slice().reverse().slice(0,30).map(x=>'<article class="writing-lesson"><span>'+escapeHtml(x.type)+'</span><p><del>'+escapeHtml(shorten(x.original,150))+'</del></p><p><strong>'+escapeHtml(shorten(x.replacement,150))+'</strong></p><small>'+escapeHtml(x.explanation)+'</small><button type="button" data-lesson-master="'+x.id+'">'+(x.status==='mastered'?'Mastered ✓':'Mark mastered')+'</button></article>').join(''):'<div class="review-empty"><strong>No accepted lessons yet</strong><small>When you explicitly accept a wording suggestion, Quire can keep the lesson here for reflection.</small></div>';
    mount.querySelectorAll('[data-lesson-master]').forEach(btn=>btn.addEventListener('click',()=>{const next=rows();const row=next.find(x=>x.id===btn.dataset.lessonMaster);if(row)row.status=row.status==='mastered'?'reviewed':'mastered';saveRows(next);render();}));
  }
  function open(){ensureModal();render();document.getElementById('writingGrowthModal').hidden=false;}
  function bind(){
    ensureModal();
    document.getElementById('openWritingGrowthBtn')?.addEventListener('click',open);
    window.addEventListener('quire:writing-suggestion-accepted',e=>add(e.detail||{}));
  }
  function shorten(v,n){const s=String(v||'');return s.length>n?s.slice(0,n-1)+'…':s;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireWritingGrowth={rows,add,render,open};
})();
