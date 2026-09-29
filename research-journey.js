/* Quire simple research journey */
(function(){
  const VIEW_STAGE={
    setup:'setup',methodology:'setup',projects:'setup',overview:'setup',dashboard:'setup',
    searchscreen:'searchscreen',library:'searchscreen',
    reader:'reader',
    appraisal:'appraisal',analysis:'appraisal',synthesis:'appraisal',
    map:'map',brainstorm:'map',
    chapters:'chapters',
    review:'review',supervision:'review',
    export:'export'
  };
  const PROMPTS={
    setup:'Start with the question, study design and deadlines.',
    searchscreen:'Find the literature and decide what belongs in your project.',
    reader:'Read closely. Highlight the exact evidence you may use.',
    appraisal:'Understand what the evidence means—and where its limits are.',
    map:'Organise evidence into objectives, themes and writing destinations.',
    chapters:'Write with the evidence beside you.',
    review:'Check claims, language and supervisor feedback before finalising.',
    export:'Finish the manuscript and check the references before export.'
  };

  function mark(view){
    const stage=VIEW_STAGE[view]||'setup';
    document.querySelectorAll('[data-journey-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.journeyView===stage));
    const prompt=document.getElementById('journeyPrompt');
    if(prompt)prompt.textContent=PROMPTS[stage]||PROMPTS.setup;
  }

  function bind(){
    document.querySelectorAll('[data-journey-view]').forEach(btn=>btn.addEventListener('click',()=>{
      window.showView?.(btn.dataset.journeyView);
    }));
    document.addEventListener('click',e=>{
      const nav=e.target.closest?.('[data-view],[data-go]');
      const view=nav?.dataset?.view||nav?.dataset?.go;
      if(view)setTimeout(()=>mark(view),0);
    });
    const active=document.querySelector('.view.active')?.id||'dashboard';
    mark(active);
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireJourney={mark};
})();