/* Quire End-of-Session Checkpoint — Step 43 */
(function(){
  const key=()=> 'quire_session_checkpoint_v1:'+(window.QuireStore?.getActiveProjectId?.()||'default');
  function current(){
    try{return JSON.parse(localStorage.getItem(key())||'null');}catch(e){return null;}
  }
  function build(){
    const state=window.QuireStore.getState(),projectId=window.QuireStore.getActiveProjectId();
    const now=Date.now(),day=24*60*60*1000;
    const recentSections=(state.sections||[]).filter(x=>x.projectId===projectId&&now-new Date(x.updatedAt||0).getTime()<day).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,5);
    const recentNotes=(state.notes||[]).filter(x=>x.projectId===projectId&&now-new Date(x.updatedAt||x.createdAt||0).getTime()<day).slice(0,5);
    const unresolved=(state.feedbackItems||[]).filter(x=>x.projectId===projectId&&x.status!=='resolved').slice(0,5);
    const readyIdeas=(state.analysisItems||[]).filter(x=>x.projectId===projectId&&x.kind==='idea'&&x.payload?.ideaStatus==='ready').slice(0,5);
    const active=window.QuireChapterEditor?.getActive?.()||{};
    const startSection=(state.sections||[]).find(s=>s.id===active.sectionId)||recentSections[0]||null;
    return {
      savedAt:new Date().toISOString(),
      completed:[
        ...recentSections.map(s=>'Worked on thesis section: '+s.title),
        ...recentNotes.map(n=>'Captured research note: '+String(n.title||n.body||'').slice(0,90))
      ].slice(0,7),
      unresolved:[
        ...unresolved.map(x=>'Supervisor/revision: '+String(x.comment||'').slice(0,100)),
        ...readyIdeas.map(x=>'Ready idea not yet fully developed: '+x.title)
      ].slice(0,7),
      next:startSection?{label:'Continue '+startSection.title,view:'chapters',sectionId:startSection.id}:{label:'Open Research and continue the evidence journey',view:'library'}
    };
  }
  function save(){
    const row=build();localStorage.setItem(key(),JSON.stringify(row));render(row);
    window.dispatchEvent(new CustomEvent('quire:workflow-handoff',{detail:{title:'Session checkpoint saved',copy:'Quire has recorded a lightweight local starting point for your next session.',action:'Return Home',view:'dashboard'}}));
  }
  function render(row=current()){
    const mount=document.getElementById('sessionCheckpointCard');if(!mount)return;
    if(!row){mount.hidden=true;return;}
    mount.hidden=false;
    mount.innerHTML='<div><span class="eyebrow">LAST SESSION</span><strong>'+new Date(row.savedAt).toLocaleString()+'</strong></div>'+
      '<div><small>Completed / touched</small><p>'+escapeHtml(row.completed?.slice(0,3).join(' · ')||'No recent work was detected automatically.')+'</p></div>'+
      '<div><small>Still open</small><p>'+escapeHtml(row.unresolved?.slice(0,3).join(' · ')||'No unresolved items were detected automatically.')+'</p></div>'+
      '<button type="button" id="resumeCheckpointBtn">'+escapeHtml(row.next?.label||'Continue')+' →</button>';
    document.getElementById('resumeCheckpointBtn')?.addEventListener('click',()=>{
      if(row.next?.sectionId)window.QuireChapterEditor?.openSection?.(row.next.sectionId);
      window.showView?.(row.next?.view||'dashboard');
    });
  }
  function bind(){
    document.getElementById('saveSessionCheckpointBtn')?.addEventListener('click',save);
    window.addEventListener('quire:project-switched',()=>render());
    render();
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireSessionCheckpoint={build,save,render,current};
})();
