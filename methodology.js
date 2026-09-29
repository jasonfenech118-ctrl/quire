/* Quire Methodology Workspace — Step 16 */
(function(){
  const profiles={
    qualitative:{
      title:'Qualitative methodology',
      intro:'Plan the rationale, participant selection, data collection, reflexivity and analytic rigour behind the study.',
      checklist:[
        ['rationale','Methodological rationale explained'],
        ['sampling','Sampling strategy justified'],
        ['recruitment','Recruitment process documented'],
        ['collection','Data collection procedure reproducible'],
        ['reflexivity','Researcher reflexivity addressed'],
        ['rigour','Trustworthiness / rigour strategy specified'],
        ['analysis','Analysis process described step-by-step'],
        ['ethics','Ethics and consent addressed']
      ],
      prompts:{
        rationale:'Why is a qualitative approach appropriate for the research question?',
        recruitment:'Who will be approached, by whom, where and how?',
        inclusion:'What inclusion and exclusion criteria will define the sample?',
        collection:'Describe interviews, focus groups, observations or other data collection in enough detail to reproduce the process.',
        analysis:'Describe coding, theme development, interpretation and any software used.',
        rigour:'How will credibility, dependability, confirmability, transferability or reflexivity be addressed?',
        ethics:'Consent, privacy, distress, withdrawal and data protection considerations.'
      }
    },
    quantitative:{
      title:'Quantitative methodology',
      intro:'Define variables, measurement, sampling, procedures and the statistical plan before analysis begins.',
      checklist:[
        ['rationale','Study design justified'],
        ['variables','Primary variables / outcomes defined'],
        ['sampling','Sampling and sample-size rationale documented'],
        ['measurement','Measures and instruments described'],
        ['collection','Data collection procedure reproducible'],
        ['analysis','Statistical tests mapped to objectives'],
        ['assumptions','Statistical assumptions considered'],
        ['ethics','Ethics and data protection addressed']
      ],
      prompts:{
        rationale:'Why is the selected quantitative design appropriate?',
        recruitment:'How will participants or records be sampled and recruited?',
        inclusion:'Define inclusion/exclusion criteria and, where relevant, sample-size or power rationale.',
        collection:'Describe measurements, instruments, timing and data quality controls.',
        analysis:'Map variables and research objectives to descriptive and inferential analyses.',
        rigour:'Validity, reliability, missing-data handling and assumption checks.',
        ethics:'Consent, confidentiality, data minimisation and any clinical risk.'
      }
    },
    mixed:{
      title:'Mixed-methods methodology',
      intro:'Plan each strand separately, then make the point and purpose of integration explicit.',
      checklist:[
        ['rationale','Mixed-methods rationale explicit'],
        ['priority','Priority of qualitative/quantitative strands defined'],
        ['timing','Sequence or concurrency documented'],
        ['sampling','Sampling for both strands explained'],
        ['collection','Both data collection procedures described'],
        ['analysis','Each strand analysis documented'],
        ['integration','Integration point and method defined'],
        ['ethics','Ethics addressed across both strands']
      ],
      prompts:{
        rationale:'Why are both qualitative and quantitative evidence needed?',
        recruitment:'Describe recruitment and sampling for each strand.',
        inclusion:'State criteria and whether the same or different samples contribute to each strand.',
        collection:'Describe collection procedures for both strands and their sequence.',
        analysis:'Describe separate analyses and how they will be brought together.',
        rigour:'How will quality be judged within each strand and at integration?',
        ethics:'Address consent, privacy and any burden created by participating in multiple strands.'
      }
    },
    meta:{
      title:'Systematic review / evidence synthesis',
      intro:'Build a transparent, reproducible review protocol from question framework through screening, appraisal and synthesis.',
      checklist:[
        ['protocol','Protocol / review plan defined'],
        ['question','PICO/PCC/SPIDER framework specified'],
        ['search','Search strategy reproducible'],
        ['eligibility','Eligibility criteria explicit'],
        ['screening','Screening and conflict process defined'],
        ['appraisal','Risk-of-bias / appraisal tool selected'],
        ['extraction','Data extraction fields defined'],
        ['synthesis','Narrative/meta-analytic synthesis plan defined']
      ],
      prompts:{
        rationale:'Why is this review type appropriate and what uncertainty will it address?',
        recruitment:'List databases, registers and grey-literature sources to search.',
        inclusion:'Define population/concept/context/intervention/outcome and study-design eligibility.',
        collection:'Describe search, deduplication, title/abstract screening, full-text screening and extraction.',
        analysis:'Describe narrative synthesis and, if applicable, effect measure, model, heterogeneity and subgroup analysis.',
        rigour:'Specify appraisal/risk-of-bias approach and certainty assessment if used.',
        ethics:'Document protocol registration, data-management and reporting guidance where applicable.'
      }
    }
  };

  let saveTimer=null;
  function setup(){return window.QuireStore.getStudySetupData();}
  function type(){return setup().studyType||'qualitative';}
  function profile(){return profiles[type()]||profiles.qualitative;}
  function workspace(){return window.QuireStore.getMethodWorkspace()||{};}

  function render(){
    const p=profile(),w=workspace(),s=setup();
    document.getElementById('methodologyWorkspaceTitle').textContent=p.title;
    document.getElementById('methodologyWorkspaceIntro').textContent=p.intro;
    const badge=document.getElementById('methodologyStudyType');
    if(badge) badge.textContent=(s.studyType||'Not selected').replace('meta','Systematic review / meta-analysis');

    const fields=['rationale','recruitment','inclusion','collection','analysis','rigour','ethics'];
    fields.forEach(key=>{
      const el=document.getElementById('method_'+key);
      if(el){
        el.placeholder=p.prompts[key]||'';
        el.value=w[key]||'';
      }
    });
    const checks=w.checks||{};
    const list=document.getElementById('methodologyChecklist');
    list.innerHTML=p.checklist.map(([key,label])=>
      '<label class="method-check"><input type="checkbox" data-method-check="'+key+'" '+(checks[key]?'checked':'')+'><span>'+label+'</span></label>'
    ).join('');
    list.querySelectorAll('input').forEach(input=>input.addEventListener('change',queueSave));
    updateProgress();
  }

  function collect(){
    const w={};
    ['rationale','recruitment','inclusion','collection','analysis','rigour','ethics'].forEach(k=>w[k]=document.getElementById('method_'+k)?.value||'');
    w.checks={};
    document.querySelectorAll('[data-method-check]').forEach(input=>w.checks[input.dataset.methodCheck]=input.checked);
    return w;
  }

  function updateProgress(){
    const p=profile(),w=collect();
    const done=p.checklist.filter(([key])=>w.checks[key]).length;
    const textDone=['rationale','recruitment','inclusion','collection','analysis','rigour','ethics'].filter(k=>(w[k]||'').trim().length>20).length;
    const pct=Math.round(((done/p.checklist.length)*.55+(textDone/7)*.45)*100);
    document.getElementById('methodologyProgress').textContent=pct+'%';
    document.getElementById('methodologyProgressBar').style.width=pct+'%';
  }

  function queueSave(){
    updateProgress();clearTimeout(saveTimer);
    document.getElementById('methodologySaveState').textContent='Saving…';
    saveTimer=setTimeout(save,500);
  }
  function save(){
    window.QuireStore.saveMethodWorkspace(collect());
    document.getElementById('methodologySaveState').textContent='Saved';
    setTimeout(()=>{const el=document.getElementById('methodologySaveState');if(el)el.textContent='Autosave';},1000);
  }
  function bind(){
    ['rationale','recruitment','inclusion','collection','analysis','rigour','ethics'].forEach(k=>document.getElementById('method_'+k)?.addEventListener('input',queueSave));
    document.getElementById('saveMethodologyWorkspace')?.addEventListener('click',save);
    window.addEventListener('quire:project-switched',render);
    window.addEventListener('quire:cloud-pulled',render);
    render();
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.QuireMethodology={render,save};
})();