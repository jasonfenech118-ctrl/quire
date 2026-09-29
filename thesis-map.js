/* Quire Live Thesis Map — Step 18 */
(function(){
  let selectedNode=null;
  let relationshipFilter='all';
  let viewMode='connections';
  let resizeTimer=null;
  let dirty=true;

  function state(){
    const all=window.QuireStore.getState();
    const projectId=window.QuireStore.getActiveProjectId();
    return {
      all,projectId,
      project:all.projects.find(p=>p.id===projectId)||null,
      objectives:all.objectives.filter(x=>x.projectId===projectId).sort((a,b)=>(a.orderIndex||0)-(b.orderIndex||0)),
      themes:all.themes.filter(x=>x.projectId===projectId),
      articles:all.articles.filter(x=>x.projectId===projectId),
      highlights:all.highlights.filter(x=>x.projectId===projectId),
      notes:all.notes.filter(x=>x.projectId===projectId),
      links:all.evidenceLinks.filter(x=>x.projectId===projectId),
      articleThemes:all.articleThemes.filter(x=>{
        const article=all.articles.find(a=>a.id===x.articleId);
        return article?.projectId===projectId;
      }),
      chapters:all.chapters.filter(x=>x.projectId===projectId).sort((a,b)=>(a.orderIndex||0)-(b.orderIndex||0)),
      sections:all.sections.filter(x=>x.projectId===projectId).sort((a,b)=>(a.orderIndex||0)-(b.orderIndex||0))
    };
  }

  function nodeId(type,id){return 'mapnode_'+type+'_'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_');}
  function key(type,id){return type+':'+id;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
  function truncate(v,n=92){const s=String(v||'');return s.length>n?s.slice(0,n-1)+'…':s;}

  function articleLabel(article){
    const first=(article?.authors||'').split(';')[0]?.trim();
    const surname=first?first.split(/\s+/).slice(-1)[0]:'Source';
    return surname+(article?.year?' '+article.year:'');
  }

  function relationClass(rel){
    if(rel==='contradicts')return 'contradicts';
    if(rel==='critiques')return 'critiques';
    if(rel==='contextualises')return 'contextualises';
    if(rel==='method')return 'method';
    if(rel==='cites')return 'cites';
    return 'supports';
  }

  function buildGraphData(s){
    const nodes=[];
    const edges=[];
    const edgeKeys=new Set();

    function addNode(type,id,label,meta={}){
      nodes.push({type,id,label,...meta});
    }
    function addEdge(fromType,fromId,toType,toId,relationship='structural',derived=false){
      if(!fromId||!toId)return;
      const id=[fromType,fromId,toType,toId,relationship].join('|');
      if(edgeKeys.has(id))return;
      edgeKeys.add(id);
      edges.push({id,fromType,fromId,toType,toId,relationship,derived});
    }

    addNode('question',s.projectId,s.project?.researchQuestion||'Research question not yet defined',{project:s.project});
    s.objectives.forEach(o=>addNode('objective',o.id,o.title||o.description||'Untitled objective',{record:o}));
    s.themes.forEach(t=>addNode('theme',t.id,t.name||'Untitled theme',{record:t}));
    s.articles.forEach(a=>addNode('article',a.id,a.title||'Untitled article',{record:a}));
    s.chapters.forEach(c=>addNode('chapter',c.id,c.title||'Untitled chapter',{record:c}));
    s.sections.forEach(sec=>addNode('section',sec.id,sec.title||'Untitled section',{record:sec}));

    s.objectives.forEach(o=>addEdge('question',s.projectId,'objective',o.id,'structural'));

    s.articleThemes.forEach(at=>addEdge('theme',at.themeId,'article',at.articleId,'theme'));
    s.links.forEach(link=>{
      const articleId=link.articleId || (link.highlightId?s.highlights.find(h=>h.id===link.highlightId)?.articleId:null);
      const chapterId=link.chapterId || (link.sectionId?s.sections.find(sec=>sec.id===link.sectionId)?.chapterId:null);
      if(link.objectiveId&&link.themeId) addEdge('objective',link.objectiveId,'theme',link.themeId,link.relationship||'supports');
      if(link.themeId&&articleId) addEdge('theme',link.themeId,'article',articleId,link.relationship||'supports');
      if(link.objectiveId&&articleId&&!link.themeId) addEdge('objective',link.objectiveId,'article',articleId,link.relationship||'supports');
      if(articleId&&link.sectionId) addEdge('article',articleId,'section',link.sectionId,link.relationship||'supports');
      else if(articleId&&chapterId) addEdge('article',articleId,'chapter',chapterId,link.relationship||'supports');
      if(link.themeId&&link.sectionId&&!articleId) addEdge('theme',link.themeId,'section',link.sectionId,link.relationship||'supports');
      else if(link.themeId&&chapterId&&!articleId) addEdge('theme',link.themeId,'chapter',chapterId,link.relationship||'supports');
      if(link.objectiveId&&link.sectionId&&!articleId&&!link.themeId) addEdge('objective',link.objectiveId,'section',link.sectionId,link.relationship||'supports');
      else if(link.objectiveId&&chapterId&&!articleId&&!link.themeId) addEdge('objective',link.objectiveId,'chapter',chapterId,link.relationship||'supports');
    });

    // Derive objective→theme connections where an objective and a theme are attached to the same article.
    const objectiveArticles=new Map();
    const themeArticles=new Map();
    s.links.forEach(link=>{
      const articleId=link.articleId || (link.highlightId?s.highlights.find(h=>h.id===link.highlightId)?.articleId:null);
      if(!articleId)return;
      if(link.objectiveId){
        if(!objectiveArticles.has(link.objectiveId))objectiveArticles.set(link.objectiveId,new Set());
        objectiveArticles.get(link.objectiveId).add(articleId);
      }
      if(link.themeId){
        if(!themeArticles.has(link.themeId))themeArticles.set(link.themeId,new Set());
        themeArticles.get(link.themeId).add(articleId);
      }
    });
    s.articleThemes.forEach(at=>{
      if(!themeArticles.has(at.themeId))themeArticles.set(at.themeId,new Set());
      themeArticles.get(at.themeId).add(at.articleId);
    });
    for(const [objectiveId,articles] of objectiveArticles){
      for(const [themeId,themeSet] of themeArticles){
        if([...articles].some(id=>themeSet.has(id))) addEdge('objective',objectiveId,'theme',themeId,'derived',true);
      }
    }

    // Structural chapter→section edges.
    s.sections.forEach(sec=>addEdge('chapter',sec.chapterId,'section',sec.id,'structural'));

    return {nodes,edges};
  }

  function countsForNode(type,id,data,s){
    const connectedEdges=data.edges.filter(e=>(e.fromType===type&&e.fromId===id)||(e.toType===type&&e.toId===id));
    const evidenceEdges=connectedEdges.filter(e=>!['structural','theme','derived'].includes(e.relationship));
    if(type==='objective'){
      const articles=new Set();
      s.links.filter(l=>l.objectiveId===id).forEach(l=>{
        const a=l.articleId||(l.highlightId?s.highlights.find(h=>h.id===l.highlightId)?.articleId:null);
        if(a)articles.add(a);
      });
      return {primary:articles.size,secondary:'sources',connections:connectedEdges.length,evidence:evidenceEdges.length};
    }
    if(type==='theme'){
      const articles=new Set(s.articleThemes.filter(x=>x.themeId===id).map(x=>x.articleId));
      s.links.filter(l=>l.themeId===id).forEach(l=>{
        const a=l.articleId||(l.highlightId?s.highlights.find(h=>h.id===l.highlightId)?.articleId:null);
        if(a)articles.add(a);
      });
      return {primary:articles.size,secondary:'sources',connections:connectedEdges.length,evidence:evidenceEdges.length};
    }
    if(type==='article'){
      const hs=s.highlights.filter(h=>h.articleId===id).length;
      return {primary:hs,secondary:'highlights',connections:connectedEdges.length,evidence:evidenceEdges.length};
    }
    if(type==='chapter'){
      const secs=s.sections.filter(sec=>sec.chapterId===id);
      const links=s.links.filter(l=>l.chapterId===id||secs.some(sec=>sec.id===l.sectionId));
      return {primary:links.length,secondary:'evidence links',connections:connectedEdges.length,evidence:links.length};
    }
    if(type==='section'){
      const links=s.links.filter(l=>l.sectionId===id);
      return {primary:links.length,secondary:'sources',connections:connectedEdges.length,evidence:links.length};
    }
    return {primary:connectedEdges.length,secondary:'connections',connections:connectedEdges.length,evidence:evidenceEdges.length};
  }

  function isGap(type,id,data,s){
    const c=countsForNode(type,id,data,s);
    if(type==='question') return !String(s.project?.researchQuestion||'').trim();
    if(type==='chapter') return c.evidence===0;
    if(type==='section') return c.evidence===0;
    if(type==='article') return c.evidence===0;
    return c.primary===0;
  }

  function nodeButton(type,record,label,data,s,index=0){
    const counts=countsForNode(type,record?.id||s.projectId,data,s);
    const id=record?.id||s.projectId;
    const gap=isGap(type,id,data,s);
    const classes=['thesis-map-node','node-'+type,gap?'is-gap':''].filter(Boolean).join(' ');
    let kicker=type.toUpperCase();
    if(type==='objective')kicker='OBJECTIVE '+(record.orderIndex||index+1);
    if(type==='chapter')kicker='CHAPTER '+(record.number||record.orderIndex||index+1);
    if(type==='section')kicker=(record.number||'SECTION');
    if(type==='article')kicker=articleLabel(record);
    return '<button type="button" id="'+nodeId(type,id)+'" class="'+classes+'" data-map-node-type="'+type+'" data-map-node-id="'+escapeHtml(id)+'" data-gap="'+(gap?'true':'false')+'">'+
      '<span class="map-node-kicker">'+escapeHtml(kicker)+'</span>'+
      '<strong>'+escapeHtml(truncate(label,type==='article'?72:92))+'</strong>'+
      '<small>'+counts.primary+' '+counts.secondary+'</small>'+
      (gap&&type!=='question'?'<i>Needs connection</i>':'')+
    '</button>';
  }

  function renderGraph(){
    const s=state();
    const data=buildGraphData(s);
    const mount=document.getElementById('thesisMapGraph');
    if(!mount)return;

    const writing=s.chapters.map((chapter,index)=>{
      const sections=s.sections.filter(sec=>sec.chapterId===chapter.id);
      return '<div class="map-writing-group">'+
        nodeButton('chapter',chapter,chapter.title,data,s,index)+
        '<div class="map-section-nodes">'+sections.map((sec,i)=>nodeButton('section',sec,sec.title,data,s,i)).join('')+'</div>'+
      '</div>';
    }).join('');

    mount.innerHTML=
      '<svg id="thesisMapEdges" class="thesis-map-edges" aria-hidden="true"></svg>'+
      '<div class="thesis-map-column map-col-question"><div class="map-column-head"><span>1</span><strong>Question</strong></div>'+
        nodeButton('question',s.project,s.project?.researchQuestion||'Research question not yet defined',data,s,0)+'</div>'+
      '<div class="thesis-map-column"><div class="map-column-head"><span>2</span><strong>Objectives</strong><small>'+s.objectives.length+'</small></div>'+
        '<div class="map-node-stack">'+(s.objectives.length?s.objectives.map((o,i)=>nodeButton('objective',o,o.title||o.description,data,s,i)).join(''):'<div class="map-empty-column">Add objectives in Study Setup.</div>')+'</div></div>'+
      '<div class="thesis-map-column"><div class="map-column-head"><span>3</span><strong>Themes</strong><small>'+s.themes.length+'</small></div>'+
        '<div class="map-node-stack">'+(s.themes.length?s.themes.map((t,i)=>nodeButton('theme',t,t.name,data,s,i)).join(''):'<div class="map-empty-column">No themes yet.</div>')+'</div></div>'+
      '<div class="thesis-map-column map-col-evidence"><div class="map-column-head"><span>4</span><strong>Evidence</strong><small>'+s.articles.length+'</small></div>'+
        '<div class="map-node-stack">'+(s.articles.length?s.articles.map((a,i)=>nodeButton('article',a,a.title,data,s,i)).join(''):'<div class="map-empty-column">Add articles to your Research Library.</div>')+'</div></div>'+
      '<div class="thesis-map-column map-col-writing"><div class="map-column-head"><span>5</span><strong>Writing</strong><small>'+s.chapters.length+' chapters</small></div>'+
        '<div class="map-node-stack">'+(writing||'<div class="map-empty-column">No chapters yet.</div>')+'</div></div>';

    mount.dataset.mode=viewMode;
    bindNodes(data,s);
    renderStats(data,s);
    renderGaps(data,s);
    requestAnimationFrame(()=>drawEdges(data));
  }

  function visibleEdge(edge){
    if(relationshipFilter==='all') return true;
    if(edge.relationship==='structural'||edge.relationship==='theme'||edge.relationship==='derived') return false;
    return edge.relationship===relationshipFilter;
  }

  function drawEdges(data){
    const graph=document.getElementById('thesisMapGraph');
    const svg=document.getElementById('thesisMapEdges');
    if(!graph||!svg)return;
    const graphRect=graph.getBoundingClientRect();
    const width=Math.max(graph.scrollWidth,graphRect.width);
    const height=Math.max(graph.scrollHeight,graphRect.height);
    svg.setAttribute('viewBox','0 0 '+width+' '+height);
    svg.setAttribute('width',width);
    svg.setAttribute('height',height);

    const paths=[];
    data.edges.filter(visibleEdge).forEach(edge=>{
      const from=document.getElementById(nodeId(edge.fromType,edge.fromId));
      const to=document.getElementById(nodeId(edge.toType,edge.toId));
      if(!from||!to)return;
      if(viewMode==='gaps' && from.dataset.gap!=='true' && to.dataset.gap!=='true') return;
      const a=from.getBoundingClientRect();
      const b=to.getBoundingClientRect();
      const x1=a.right-graphRect.left;
      const y1=a.top-graphRect.top+a.height/2;
      const x2=b.left-graphRect.left;
      const y2=b.top-graphRect.top+b.height/2;
      const dx=Math.max(42,Math.abs(x2-x1)*.42);
      const d='M '+x1+' '+y1+' C '+(x1+dx)+' '+y1+', '+(x2-dx)+' '+y2+', '+x2+' '+y2;
      const cls='map-edge edge-'+relationClass(edge.relationship)+(edge.derived?' derived':'')+(edge.relationship==='structural'?' structural':'');
      paths.push('<path class="'+cls+'" d="'+d+'" data-edge-rel="'+escapeHtml(edge.relationship)+'"></path>');
    });
    svg.innerHTML=paths.join('');
  }

  function renderStats(data,s){
    const mount=document.getElementById('thesisMapStats');
    if(!mount)return;
    const articlesWithEvidence=new Set();
    s.links.forEach(l=>{
      const a=l.articleId||(l.highlightId?s.highlights.find(h=>h.id===l.highlightId)?.articleId:null);
      if(a)articlesWithEvidence.add(a);
    });
    const sectionsWithEvidence=new Set(s.links.map(l=>l.sectionId).filter(Boolean));
    const gaps=data.nodes.filter(n=>isGap(n.type,n.id,data,s)&&n.type!=='question').length;
    const cards=[
      [s.objectives.length,'Objectives'],
      [s.themes.length,'Themes'],
      [articlesWithEvidence.size+'/'+s.articles.length,'Evidence-backed papers'],
      [sectionsWithEvidence.size+'/'+s.sections.length,'Sections with evidence'],
      [s.links.length,'Evidence links'],
      [gaps,'Map gaps']
    ];
    mount.innerHTML=cards.map(([value,label])=>'<div><strong>'+escapeHtml(value)+'</strong><span>'+escapeHtml(label)+'</span></div>').join('');
  }

  function renderGaps(data,s){
    const mount=document.getElementById('thesisMapGaps');
    if(!mount)return;
    const gaps=data.nodes.filter(n=>n.type!=='question'&&isGap(n.type,n.id,data,s));
    if(!gaps.length){
      mount.innerHTML='<div class="map-gap-good"><strong>No structural gaps detected</strong><small>Every mapped objective, theme, article and writing destination has at least one relevant connection.</small></div>';
      return;
    }
    mount.innerHTML=gaps.slice(0,8).map(n=>
      '<button type="button" data-gap-node="'+n.type+'|'+n.id+'"><span>'+escapeHtml(n.type.toUpperCase())+'</span><strong>'+escapeHtml(truncate(n.label,70))+'</strong></button>'
    ).join('')+(gaps.length>8?'<small class="map-more-gaps">+'+(gaps.length-8)+' more gaps</small>':'');
    mount.querySelectorAll('[data-gap-node]').forEach(btn=>btn.addEventListener('click',()=>{
      const [type,id]=btn.dataset.gapNode.split('|');
      selectNode(type,id,data,s);
    }));
  }

  function bindNodes(data,s){
    document.querySelectorAll('[data-map-node-type]').forEach(btn=>btn.addEventListener('click',()=>{
      selectNode(btn.dataset.mapNodeType,btn.dataset.mapNodeId,data,s);
    }));
  }

  function selectNode(type,id,data,s){
    selectedNode={type,id};
    document.querySelectorAll('.thesis-map-node').forEach(n=>n.classList.toggle('selected',n.dataset.mapNodeType===type&&n.dataset.mapNodeId===id));
    const node=data.nodes.find(n=>n.type===type&&String(n.id)===String(id));
    renderInspector(node,data,s);
    document.getElementById(nodeId(type,id))?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }

  function connectedRecords(type,id,data,s){
    const edges=data.edges.filter(e=>(e.fromType===type&&String(e.fromId)===String(id))||(e.toType===type&&String(e.toId)===String(id)));
    return edges.map(e=>{
      const other=e.fromType===type&&String(e.fromId)===String(id)
        ?{type:e.toType,id:e.toId}:{type:e.fromType,id:e.fromId};
      const node=data.nodes.find(n=>n.type===other.type&&String(n.id)===String(other.id));
      return node?{...node,relationship:e.relationship,derived:e.derived}:null;
    }).filter(Boolean);
  }

  function renderInspector(node,data,s){
    const panel=document.getElementById('thesisMapInspector');
    if(!panel)return;
    if(!node){
      panel.innerHTML='<div class="map-inspector-empty"><span class="eyebrow">MAP INSPECTOR</span><strong>Select a node</strong><p>Choose an objective, theme, paper, chapter or section to inspect its connections.</p></div>';
      return;
    }
    const connections=connectedRecords(node.type,node.id,data,s);
    const counts=countsForNode(node.type,node.id,data,s);
    let meta='';
    let action='';
    if(node.type==='article'){
      const a=node.record;
      meta=[a.authors,a.journal,a.year,a.doi].filter(Boolean).join(' · ');
      action='<button class="primary-btn" type="button" data-map-open-article="'+a.id+'">Open article</button>';
    }else if(node.type==='chapter'){
      const c=node.record;
      meta=(c.currentWordCount||0)+' words · '+(c.status||'not started').replace(/_/g,' ');
      action='<button class="primary-btn" type="button" data-map-open-chapter="'+c.id+'">Open chapter</button>';
    }else if(node.type==='section'){
      const sec=node.record;
      meta=(sec.currentWordCount||0)+' words · '+(sec.status||'not started').replace(/_/g,' ');
      action='<button class="primary-btn" type="button" data-map-open-section="'+sec.id+'">Open section</button>';
    }else if(node.type==='objective'){
      meta=node.record?.description||'Research objective';
      action='<button class="soft-btn" type="button" data-go-setup-map>Open Study Setup</button>';
    }else if(node.type==='theme'){
      meta=node.record?.description||'Research theme';
      action='<button class="soft-btn" type="button" data-map-add-connection>Link evidence</button>';
    }else if(node.type==='question'){
      meta=s.project?.title||'Active thesis project';
      action='<button class="soft-btn" type="button" data-go-setup-map>Open Study Setup</button>';
    }

    panel.innerHTML=
      '<div class="map-inspector-head"><span class="eyebrow">'+escapeHtml(node.type.toUpperCase())+'</span><button type="button" id="closeMapInspector">×</button></div>'+
      '<h3>'+escapeHtml(node.label)+'</h3>'+
      (meta?'<p>'+escapeHtml(meta)+'</p>':'')+
      '<div class="map-inspector-metrics"><div><strong>'+counts.connections+'</strong><span>Connections</span></div><div><strong>'+counts.evidence+'</strong><span>Evidence links</span></div></div>'+
      '<div class="map-inspector-actions">'+action+'<button class="soft-btn" type="button" data-map-add-connection>＋ Add connection</button></div>'+
      '<div class="map-inspector-connections"><span class="eyebrow">CONNECTED TO</span>'+
        (connections.length?connections.slice(0,12).map(c=>
          '<button type="button" data-inspect-related="'+c.type+'|'+c.id+'"><span>'+escapeHtml(c.type)+'</span><strong>'+escapeHtml(truncate(c.label,62))+'</strong><small>'+escapeHtml(c.relationship)+(c.derived?' · derived':'')+'</small></button>'
        ).join(''):'<p>No connections yet.</p>')+
      '</div>';

    document.getElementById('closeMapInspector')?.addEventListener('click',()=>{selectedNode=null;document.querySelectorAll('.thesis-map-node.selected').forEach(n=>n.classList.remove('selected'));renderInspector(null,data,s);});
    panel.querySelectorAll('[data-inspect-related]').forEach(btn=>btn.addEventListener('click',()=>{
      const [t,i]=btn.dataset.inspectRelated.split('|');selectNode(t,i,data,s);
    }));
    panel.querySelectorAll('[data-map-add-connection]').forEach(btn=>btn.addEventListener('click',()=>openConnectionModal(node)));
    panel.querySelector('[data-go-setup-map]')?.addEventListener('click',()=>window.showView?.('setup'));
    panel.querySelector('[data-map-open-article]')?.addEventListener('click',async e=>{
      window.showView?.('reader');
      try{await window.QuirePdfReader?.openArticle?.(e.currentTarget.dataset.mapOpenArticle);}catch(err){console.warn(err);}
    });
    panel.querySelector('[data-map-open-chapter]')?.addEventListener('click',e=>{
      window.QuireChapterEditor?.openChapter?.(e.currentTarget.dataset.mapOpenChapter);
      window.showView?.('chapters');
    });
    panel.querySelector('[data-map-open-section]')?.addEventListener('click',e=>{
      window.QuireChapterEditor?.openSection?.(e.currentTarget.dataset.mapOpenSection);
      window.showView?.('chapters');
    });
  }

  function fillSelect(select,items,labelFn,blank){
    if(!select)return;
    select.innerHTML='<option value="">'+blank+'</option>'+items.map(item=>'<option value="'+escapeHtml(item.id)+'">'+escapeHtml(labelFn(item))+'</option>').join('');
  }

  function updateHighlightOptions(articleId){
    const s=state();
    const select=document.getElementById('mapConnectionHighlight');
    const rows=s.highlights.filter(h=>h.articleId===articleId);
    fillSelect(select,rows,h=>'p. '+(h.pageNumber||'—')+' · '+truncate(h.highlightedText,65),'Article-level connection');
  }

  function openConnectionModal(prefill=null){
    const s=state();
    fillSelect(document.getElementById('mapConnectionArticle'),s.articles,a=>articleLabel(a)+' · '+truncate(a.title,55),'Choose an article');
    fillSelect(document.getElementById('mapConnectionObjective'),s.objectives,o=>'Objective '+(o.orderIndex||'')+' · '+(o.title||o.description),'No objective');
    fillSelect(document.getElementById('mapConnectionTheme'),s.themes,t=>t.name,'No theme');
    fillSelect(document.getElementById('mapConnectionChapter'),s.chapters,c=>'Chapter '+(c.number||c.orderIndex||'')+' · '+c.title,'No chapter');
    document.getElementById('mapConnectionSection').innerHTML='<option value="">No section</option>';
    document.getElementById('mapConnectionHighlight').innerHTML='<option value="">Article-level connection</option>';
    document.getElementById('mapConnectionRelationship').value='supports';
    document.getElementById('mapConnectionRationale').value='';

    if(prefill){
      if(prefill.type==='article') document.getElementById('mapConnectionArticle').value=prefill.id;
      if(prefill.type==='objective') document.getElementById('mapConnectionObjective').value=prefill.id;
      if(prefill.type==='theme') document.getElementById('mapConnectionTheme').value=prefill.id;
      if(prefill.type==='chapter') document.getElementById('mapConnectionChapter').value=prefill.id;
      if(prefill.type==='section'){
        const sec=s.sections.find(x=>x.id===prefill.id);
        if(sec){
          document.getElementById('mapConnectionChapter').value=sec.chapterId;
          updateSectionOptions(sec.chapterId);
          document.getElementById('mapConnectionSection').value=sec.id;
        }
      }
      if(prefill.type==='article') updateHighlightOptions(prefill.id);
    }
    document.getElementById('mapConnectionModal').hidden=false;
  }

  function updateSectionOptions(chapterId){
    const s=state();
    const rows=s.sections.filter(sec=>sec.chapterId===chapterId);
    fillSelect(document.getElementById('mapConnectionSection'),rows,sec=>(sec.number?sec.number+' · ':'')+sec.title,'No section');
  }

  function saveConnection(){
    const articleId=document.getElementById('mapConnectionArticle').value||null;
    const highlightId=document.getElementById('mapConnectionHighlight').value||null;
    const objectiveId=document.getElementById('mapConnectionObjective').value||null;
    const themeId=document.getElementById('mapConnectionTheme').value||null;
    const chapterId=document.getElementById('mapConnectionChapter').value||null;
    const sectionId=document.getElementById('mapConnectionSection').value||null;
    const relationship=document.getElementById('mapConnectionRelationship').value||'supports';
    const rationale=document.getElementById('mapConnectionRationale').value.trim();

    if(!articleId){
      setConnectionMessage('Choose an article or paper to use as the evidence source.');
      return;
    }
    if(!objectiveId&&!themeId&&!chapterId&&!sectionId){
      setConnectionMessage('Choose at least one objective, theme, chapter or section to connect the evidence to.');
      return;
    }

    const s=state();
    const note=s.notes.find(n=>highlightId&&n.highlightId===highlightId);
    window.QuireStore.addEvidenceLink({
      articleId,highlightId,noteId:note?.id||null,
      objectiveId,themeId,chapterId,sectionId,relationship,rationale
    });
    document.getElementById('mapConnectionModal').hidden=true;
    setConnectionMessage('');
    render();
  }

  function setConnectionMessage(message){
    const el=document.getElementById('mapConnectionMessage');
    if(el)el.textContent=message||'';
  }

  function render(){
    dirty=false;
    renderGraph();
    const s=state(),data=buildGraphData(s);
    if(selectedNode){
      const node=data.nodes.find(n=>n.type===selectedNode.type&&String(n.id)===String(selectedNode.id));
      if(node)renderInspector(node,data,s);else renderInspector(null,data,s);
    }else renderInspector(null,data,s);
  }

  function bind(){
    document.getElementById('addMapConnectionBtn')?.addEventListener('click',()=>openConnectionModal());
    document.getElementById('closeMapConnectionModal')?.addEventListener('click',()=>document.getElementById('mapConnectionModal').hidden=true);
    document.getElementById('cancelMapConnection')?.addEventListener('click',()=>document.getElementById('mapConnectionModal').hidden=true);
    document.getElementById('saveMapConnection')?.addEventListener('click',saveConnection);
    document.getElementById('mapConnectionModal')?.addEventListener('click',e=>{if(e.target.id==='mapConnectionModal')e.currentTarget.hidden=true;});
    document.getElementById('mapConnectionArticle')?.addEventListener('change',e=>updateHighlightOptions(e.target.value));
    document.getElementById('mapConnectionChapter')?.addEventListener('change',e=>updateSectionOptions(e.target.value));

    document.getElementById('mapRelationshipFilter')?.addEventListener('change',e=>{
      relationshipFilter=e.target.value;render();
    });
    document.querySelectorAll('[data-map-mode]').forEach(btn=>btn.addEventListener('click',()=>{
      viewMode=btn.dataset.mapMode;
      document.querySelectorAll('[data-map-mode]').forEach(x=>x.classList.toggle('active',x===btn));
      render();
    }));

    document.querySelector('[data-view="map"]')?.addEventListener('click',()=>{
      if(dirty) requestAnimationFrame(render);
      else requestAnimationFrame(()=>{
        const s=state();drawEdges(buildGraphData(s));
      });
    });
    window.addEventListener('quire:project-switched',()=>{selectedNode=null;dirty=true;if(document.getElementById('map')?.classList.contains('active'))render();});
    window.addEventListener('quire:cloud-pulled',()=>{dirty=true;if(document.getElementById('map')?.classList.contains('active'))render();});
    window.addEventListener('quire:annotation-changed',()=>{dirty=true;if(document.getElementById('map')?.classList.contains('active'))render();});
    window.addEventListener('quire:store-changed',()=>{
      dirty=true;
      if(!document.getElementById('map')?.classList.contains('active'))return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(render,120);
    });
    window.addEventListener('resize',()=>{
      if(!document.getElementById('map')?.classList.contains('active'))return;
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        const s=state();drawEdges(buildGraphData(s));
      },120);
    });
    render();
  }

  document.addEventListener('DOMContentLoaded',bind);
  window.QuireThesisMap={render,openConnectionModal};
})();