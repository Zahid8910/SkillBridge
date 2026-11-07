(function () {
  const data = window.SkillBridgeData;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const THEME_STORAGE = 'skillbridge-theme-v1';
  const categoryTone = {'Frontend Development':'blue','Full-Stack Development':'violet','Backend Development':'green','UI/UX Design':'pink','Database Management':'amber','Data Analysis':'teal','Artificial Intelligence':'indigo'};
  let profile = {...window.SkillBridgeProfile.demo};
  let saved = [];
  let submissions = [];
  let roadmaps = [];
  let activeRoadmapProjectId = '';
  let mentorKey = '';
  let mentorName = '';
  let showSaved = false;
  let authMode = 'login';
  let lastFocused = null;

  async function api(path, options = {}) {
    const response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: {'Content-Type':'application/json', ...(options.headers || {})},
      ...options
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
    return body;
  }
  const post = (path, body, headers) => api(path, {method:'POST', body:JSON.stringify(body), headers});
  const put = (path, body) => api(path, {method:'PUT', body:JSON.stringify(body)});
  const patch = (path, body, headers) => api(path, {method:'PATCH', body:JSON.stringify(body), headers});
  function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('visible'), 2600); }
  function initials(name) { return (name || 'S').trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase() || 'S'; }
  function fillOptions(select, options) { options.forEach(item => { const option=document.createElement('option'); option.value=item; option.textContent=item; select.append(option); }); }
  function updateSavedCount() { $('#saved-count').textContent = saved.length; }
  function showAuthGate(show) {
    $('#auth-gate').classList.toggle('hidden', !show);
    $('.app-shell').classList.toggle('hidden', show);
    $('.mobile-nav').classList.toggle('hidden', show);
    document.body.classList.toggle('auth-pending', show);
  }
  function setAuthMode(mode) {
    authMode = mode;
    const registering = mode === 'register';
    $$('.auth-tab').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
    $('.auth-name-field').classList.toggle('hidden', !registering);
    $('#auth-submit').innerHTML = registering ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
    $('#auth-title').textContent = registering ? 'Create your workspace' : 'Sign in to your workspace';
    $('#auth-form').elements.password.autocomplete = registering ? 'new-password' : 'current-password';
    $('#auth-status').textContent = '';
  }
  function setTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('#theme-icon').textContent = dark ? '☀' : '☾';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    $('#theme-toggle').setAttribute('aria-label', label); $('#theme-toggle').title = label;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111a2a' : '#f5f7fb');
    try { localStorage.setItem(THEME_STORAGE, dark ? 'dark' : 'light'); } catch { /* Theme remains active for this visit. */ }
  }
  function projectCard(project) {
    const isSaved = saved.includes(project.id);
    return `<article class="project-card"><div class="project-card-top"><span class="category-dot ${categoryTone[project.category]||'blue'}">${esc(project.category)}</span><button class="bookmark-button ${isSaved?'is-saved':''}" data-bookmark="${esc(project.id)}" aria-label="${isSaved?'Remove bookmark':'Save project'}" aria-pressed="${isSaved}">${isSaved?'♥':'♡'}</button></div><button class="project-title-button" data-detail="${esc(project.id)}"><h3>${esc(project.title)} <span>↗</span></h3></button><p class="project-summary">${esc(project.summary)}</p><div class="tag-row">${project.tech.slice(0,3).map(tag=>`<span>${esc(tag)}</span>`).join('')}</div><div class="card-divider"></div><div class="project-card-foot"><span class="level-label ${project.level.toLowerCase()}"><i></i>${esc(project.level)}</span><span class="duration-label">◷ ${esc(project.duration)}</span></div></article>`;
  }
  function renderFeatured() {
    const interests=(profile.interests||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
    const skills=(profile.skills||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
    const picks=data.projects.map((project,index)=>{const text=[project.title,project.category,...project.tech,...project.skills].join(' ').toLowerCase();const score=[...interests,...skills].reduce((sum,term)=>sum+(text.includes(term)?2:0),0);return {project,index,score};}).sort((a,b)=>b.score-a.score||Number(b.project.featured)-Number(a.project.featured)||a.index-b.index);
    $('#featured-projects').innerHTML=picks.slice(0,3).map(item=>projectCard(item.project)).join('');
  }
  function renderProjects() {
    const term=$('#project-search').value.trim().toLowerCase(),category=$('#category-filter').value,level=$('#difficulty-filter').value;
    const filtered=data.projects.filter(project=>(!showSaved||saved.includes(project.id))&&(category==='all'||project.category===category)&&(level==='all'||project.level===level)&&(!term||[project.title,project.summary,project.category,project.level,...project.tech,...project.skills].join(' ').toLowerCase().includes(term)));
    const sort=$('#project-sort').value;
    if(sort==='title')filtered.sort((a,b)=>a.title.localeCompare(b.title));
    if(sort==='difficulty'){const rank={Beginner:0,Intermediate:1,Advanced:2};filtered.sort((a,b)=>rank[a.level]-rank[b.level]||a.title.localeCompare(b.title));}
    if(sort==='duration')filtered.sort((a,b)=>(parseInt(a.duration,10)||0)-(parseInt(b.duration,10)||0)||a.title.localeCompare(b.title));
    $('#all-projects').innerHTML=filtered.map(projectCard).join('');
    $('#projects-empty').classList.toggle('hidden',filtered.length>0);$('#all-projects').classList.toggle('hidden',filtered.length===0);
    $('#project-results-label').textContent=`Showing ${filtered.length} of ${data.projects.length} projects`;
    $('#saved-only').classList.toggle('selected',showSaved);$('#saved-only').setAttribute('aria-pressed',String(showSaved));
  }
  function renderResources() {
    const term=$('#resource-search').value.trim().toLowerCase(),skill=$('#resource-category').value;
    const list=data.resources.filter(resource=>(skill==='all'||resource.skill===skill)&&(!term||[resource.title,resource.skill,resource.description,resource.type,resource.level].join(' ').toLowerCase().includes(term)));
    $('#resource-list').innerHTML=list.map((resource,index)=>`<article class="resource-card"><div class="resource-card-top"><span class="resource-icon resource-icon-${index%4}">${['↗','⌘','⌁','▤'][index%4]}</span><span class="resource-type">${esc(resource.type)}</span></div><span class="resource-skill">${esc(resource.skill)}</span><h3>${esc(resource.title)}</h3><p>${esc(resource.description)}</p><div class="resource-card-foot"><span class="resource-level">${esc(resource.level)}</span><a class="resource-link" href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(resource.title)} in a new tab">Open resource <span>↗</span></a></div></article>`).join('');
    $('#resources-empty').classList.toggle('hidden',list.length>0);$('#resource-list').classList.toggle('hidden',list.length===0);$('#resource-results-label').textContent=`${list.length} trusted resources`;
  }
  function fillProfileForm(nextProfile = profile) {
    profile=window.SkillBridgeProfile.normalize(nextProfile);
    const form=$('#profile-form');
    for(const key of ['name','university','department','year','skills','interests'])form.elements[key].value=profile[key]||'';
    $('#welcome-name').textContent=(profile.name||'Student').trim().split(/\s+/)[0];
    $('#top-avatar').textContent=initials(profile.name);$('#profile-avatar').textContent=initials(profile.name);
    $('#profile-display-name').textContent=profile.name||'Your name';$('#profile-display-role').textContent=`${profile.department||'Student'} · ${profile.year||'Add your year'}`;
    $('#interest-tags').innerHTML=(profile.interests||'').split(',').map(item=>item.trim()).filter(Boolean).slice(0,4).map(item=>`<span>${esc(item)}</span>`).join('')||'<span>Add an interest in your profile</span>';
    const skills=(profile.skills||'').split(',').map(item=>item.trim()).filter(Boolean);$('#skill-summary').textContent=skills.length?`${skills.length} skill${skills.length===1?'':'s'}`:'Add your skills';
  }
  function validateProfileForm(form) {
    const values=Object.fromEntries(['name','university','department','year','skills','interests'].map(key=>[key,form.elements[key].value.trim()]));
    const result=window.SkillBridgeProfile.validate(values);
    Object.entries(result.errors).forEach(([key,message])=>{$(`[data-error="${key}"]`).textContent=message;form.elements[key].setAttribute('aria-invalid',String(Boolean(message)));});
    return result;
  }
  function openDetail(id,trigger) {
    const project=data.projects.find(item=>item.id===id);if(!project)return;
    lastFocused=trigger;const isSaved=saved.includes(id);
    $('#modal-content').innerHTML=`<div class="modal-eyebrow"><span class="category-dot ${categoryTone[project.category]||'blue'}">${esc(project.category)}</span></div><h2 id="modal-title">${esc(project.title)}</h2><p class="modal-summary">${esc(project.summary)}</p><div class="modal-meta"><span class="level-label ${project.level.toLowerCase()}"><i></i>${esc(project.level)}</span><span>◷ ${esc(project.duration)}</span></div><div class="modal-section"><h3>Project brief</h3><p>Plan and build a first useful version of this solution. Start with the core user need, make the interface clear, and refine it with feedback.</p></div><div class="modal-section"><h3>Core requirements</h3><ul class="requirements-list">${project.requirements.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><div class="modal-section"><h3>Technologies to explore</h3><div class="tag-row modal-tags">${project.tech.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div></div><div class="modal-columns"><div class="modal-section"><h3>Skills to practice</h3><ul>${project.skills.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><div class="modal-section"><h3>Learning outcomes</h3><ul>${project.outcomes.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div></div><div class="modal-actions"><button class="button ${isSaved?'button-outline':'button-primary'}" data-bookmark="${esc(id)}" aria-pressed="${isSaved}">${isSaved?'♥ Saved to your list':'♡ Save this project'}</button><button class="button button-outline" data-start-roadmap="${esc(id)}">Start this roadmap <span>→</span></button><button class="quiet-link modal-done" data-close-modal>Done</button></div>`;
    $('#project-modal').classList.remove('hidden');document.body.classList.add('modal-open');$('#modal-close').focus();
  }
  function closeModal(){ $('#project-modal').classList.add('hidden');document.body.classList.remove('modal-open');if(lastFocused?.isConnected)lastFocused.focus(); }
  function setView(view){
    const target=document.getElementById(`view-${view}`);if(!target)return;
    $$('.view').forEach(section=>section.classList.toggle('active',section===target));
    $$('.nav-link,.mobile-link').forEach(link=>link.classList.toggle('active',link.dataset.view===view));
    $('#page-title').textContent=({dashboard:'Dashboard',projects:'Explore projects',resources:'Learning resources',roadmap:'Project roadmap',profile:'My profile'})[view];
    $('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');window.location.hash=view;
    if(view==='projects')renderProjects();if(view==='resources')renderResources();if(view==='roadmap')refreshRoadmap();window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderSubmissions(){
    const items=[...submissions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    $('#submission-list').innerHTML=items.length?items.map(item=>`<article class="submission-item"><div class="submission-item-head"><strong>${esc(data.projects.find(project=>project.id===item.projectId)?.title||'Project')}</strong><span class="submission-status status-${esc(item.status)}">${esc(item.status.replace('-',' '))}</span></div><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open submitted work ↗</a>${item.notes?`<p>${esc(item.notes)}</p>`:''}${item.feedback?`<div class="mentor-feedback"><span>Mentor feedback · ${esc(item.mentorName||'Mentor')}</span><p>${esc(item.feedback)}</p></div>`:''}<small>Submitted ${new Date(item.createdAt).toLocaleDateString()}</small></article>`).join(''):'<p class="list-empty">No submissions yet. Share your work when you are ready for feedback.</p>';
  }
  async function refreshRoadmap(preferredId=''){
    try{
      const response=await api('/roadmaps');roadmaps=response.roadmaps;
      $('#roadmap-count').textContent=roadmaps.length;
      const select=$('#roadmap-project-select');const previous=preferredId||activeRoadmapProjectId;
      select.innerHTML='<option value="">Choose a project to get started</option>'+roadmaps.map(item=>`<option value="${esc(item.projectId)}">${esc(item.project.title)}</option>`).join('');
      activeRoadmapProjectId=roadmaps.some(item=>item.projectId===previous)?previous:(roadmaps[0]?.projectId||'');
      select.value=activeRoadmapProjectId;
      const active=roadmaps.find(item=>item.projectId===activeRoadmapProjectId);
      $('#roadmap-empty').classList.toggle('hidden',Boolean(active));$('#roadmap-active').classList.toggle('hidden',!active);
      if(!active){$('#roadmap-progress-label').textContent='No roadmap selected';$('#roadmap-progress-percent').textContent='0%';$('#roadmap-progress-bar').style.width='0%';renderSubmissions();return;}
      $('#roadmap-project-title').textContent=active.project.title;$('#roadmap-project-meta').textContent=`${active.project.category} · ${active.project.level} · ${active.project.duration}`;
      $('#roadmap-progress-label').textContent=`${active.completed} of ${active.total} milestones complete`;
      $('#roadmap-progress-percent').textContent=`${active.percent}%`;$('#roadmap-progress-bar').style.width=`${active.percent}%`;
      $('#milestone-list').innerHTML=active.milestones.map((milestone,index)=>`<li class="milestone-item ${milestone.completed?'complete':''}" style="--index:${index}"><label class="milestone-check"><input type="checkbox" data-milestone="${esc(milestone.id)}" ${milestone.completed?'checked':''}><span class="milestone-number">${String(index+1).padStart(2,'0')}</span><span class="milestone-copy"><strong>${esc(milestone.title)}</strong><small>${milestone.completed?'Completed':'Mark complete when you are done with this step'}</small></span></label></li>`).join('');
      $('#submission-form').elements.url.value='';$('#submission-form').elements.notes.value='';
      renderSubmissions();
    }catch(error){toast(error.message);}
  }
  function renderMentorQueue(items){
    $('#mentor-queue').innerHTML=items.length?items.map(item=>`<article class="mentor-review-card" data-review-card="${esc(item.id)}"><div class="submission-item-head"><strong>${esc(item.projectTitle)}</strong><span class="submission-status status-${esc(item.status)}">${esc(item.status.replace('-',' '))}</span></div><p class="mentor-student">${esc(item.studentName)} · Submitted ${new Date(item.createdAt).toLocaleDateString()}</p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Review submitted work ↗</a>${item.notes?`<p>${esc(item.notes)}</p>`:''}<label class="field">Feedback<textarea data-feedback rows="3" maxlength="2000" placeholder="Give specific, actionable feedback...">${esc(item.feedback||'')}</textarea></label><div class="mentor-review-actions"><select data-review-status aria-label="Review decision"><option value="approved">Approve</option><option value="needs-revision" ${item.status==='needs-revision'?'selected':''}>Request revision</option></select><button class="button button-primary" data-review-submit="${esc(item.id)}">Save review</button></div></article>`).join(''):'<p class="list-empty">No submissions are waiting for a review.</p>';
  }
  async function loadMentorQueue(){
    try{const response=await api('/mentor/submissions',{headers:{'X-Mentor-Key':mentorKey}});renderMentorQueue(response.submissions);$('#mentor-status').textContent=`Loaded ${response.submissions.length} submission${response.submissions.length===1?'':'s'}.`;}
    catch(error){$('#mentor-status').textContent=error.message;$('#mentor-queue').innerHTML='';}
  }
  async function hydrateWorkspace(){
    const [profileResponse,bookmarkResponse,roadmapResponse,submissionResponse]=await Promise.all([api('/profile'),api('/bookmarks'),api('/roadmaps'),api('/submissions')]);
    profile=profileResponse.profile;saved=bookmarkResponse.bookmarks;roadmaps=roadmapResponse.roadmaps;submissions=submissionResponse.submissions;
    fillProfileForm(profile);renderFeatured();renderProjects();renderResources();updateSavedCount();
    const preferred=location.hash.slice(1);if(['dashboard','projects','resources','roadmap','profile'].includes(preferred))setView(preferred);else setView('dashboard');
  }
  function bindEvents(){
    document.addEventListener('click',async event=>{
      const authTab=event.target.closest('[data-auth-mode]');if(authTab){setAuthMode(authTab.dataset.authMode);return;}
      if(event.target.closest('#demo-login')){$('#auth-form').elements.email.value='student@skillbridge.demo';$('#auth-form').elements.password.value='SkillBridge2026!';$('#auth-status').textContent='Demo credentials filled. Select Sign in to continue.';return;}
      const nav=event.target.closest('[data-view]');if(nav){event.preventDefault();setView(nav.dataset.view);return;}
      const go=event.target.closest('[data-go]');if(go){setView(go.dataset.go);return;}
      const bookmark=event.target.closest('[data-bookmark]');if(bookmark){
        const id=bookmark.dataset.bookmark,next=saved.includes(id)?saved.filter(item=>item!==id):[...saved,id];
        try{const response=await put('/bookmarks',{bookmarks:next});saved=response.bookmarks;updateSavedCount();renderFeatured();renderProjects();if(!$('#project-modal').classList.contains('hidden'))openDetail(id,$('#modal-close'));toast(next.includes(id)?'Project saved to your account.':'Removed from your saved projects.');}catch(error){toast(error.message);}return;
      }
      const startRoadmap=event.target.closest('[data-start-roadmap]');if(startRoadmap){try{await post('/roadmaps',{projectId:startRoadmap.dataset.startRoadmap});closeModal();setView('roadmap');await refreshRoadmap(startRoadmap.dataset.startRoadmap);toast('Project roadmap added to your account.');}catch(error){toast(error.message);}return;}
      const detail=event.target.closest('[data-detail]');if(detail){openDetail(detail.dataset.detail,detail);return;}
      const review=event.target.closest('[data-review-submit]');if(review){
        const card=review.closest('[data-review-card]');try{await patch(`/mentor/submissions/${encodeURIComponent(review.dataset.reviewSubmit)}`,{status:$('[data-review-status]',card).value,feedback:$('[data-feedback]',card).value,mentorName},{'X-Mentor-Key':mentorKey});$('#mentor-status').textContent='Review saved.';await loadMentorQueue();await refreshRoadmap(activeRoadmapProjectId);toast('Mentor review saved.');}catch(error){$('#mentor-status').textContent=error.message;}return;
      }
      if(event.target.closest('[data-close-modal]')||event.target.id==='modal-close'||event.target.id==='project-modal')closeModal();
      if(event.target.closest('[data-clear-filters]'))$('#clear-filters').click();
    });

    $('#auth-form').addEventListener('submit',async event=>{
      event.preventDefault();const form=event.currentTarget;const payload={email:form.elements.email.value.trim(),password:form.elements.password.value};if(authMode==='register')payload.name=form.elements.name.value.trim();
      $('#auth-status').textContent='';$('#auth-submit').disabled=true;
      try{await post(`/auth/${authMode}`,payload);form.reset();showAuthGate(false);await hydrateWorkspace();toast(authMode==='register'?'Your account is ready.':'Welcome back.');}
      catch(error){$('#auth-status').textContent=error.message;}
      finally{$('#auth-submit').disabled=false;}
    });
    $('#project-search').addEventListener('input',renderProjects);$('#category-filter').addEventListener('change',renderProjects);$('#difficulty-filter').addEventListener('change',renderProjects);$('#project-sort').addEventListener('change',renderProjects);
    $('#clear-filters').addEventListener('click',()=>{$('#project-search').value='';$('#category-filter').value='all';$('#difficulty-filter').value='all';$('#project-sort').value='recommended';showSaved=false;renderProjects();});
    $('#saved-only').addEventListener('click',()=>{showSaved=!showSaved;renderProjects();});
    $('#resource-search').addEventListener('input',renderResources);$('#resource-category').addEventListener('change',renderResources);
    $('#roadmap-project-select').addEventListener('change',async event=>{if(!event.target.value)return;try{await post('/roadmaps',{projectId:event.target.value});await refreshRoadmap(event.target.value);}catch(error){toast(error.message);}});
    $('#milestone-list').addEventListener('change',async event=>{const input=event.target.closest('[data-milestone]');if(!input||!activeRoadmapProjectId)return;try{await patch(`/roadmaps/${encodeURIComponent(activeRoadmapProjectId)}/milestones/${encodeURIComponent(input.dataset.milestone)}`,{completed:input.checked});await refreshRoadmap(activeRoadmapProjectId);}catch(error){toast(error.message);}});
    $('#submission-form').addEventListener('submit',async event=>{event.preventDefault();if(!activeRoadmapProjectId){$('#submission-status').textContent='Start a project roadmap before submitting.';return;}const form=event.currentTarget;try{const response=await post('/submissions',{projectId:activeRoadmapProjectId,url:form.elements.url.value.trim(),notes:form.elements.notes.value.trim()});submissions.unshift(response.submission);form.reset();renderSubmissions();$('#submission-status').textContent='Submitted for mentor review.';toast('Your work was sent for review.');}catch(error){$('#submission-status').textContent=error.message;}});
    $('#mentor-access-form').addEventListener('submit',async event=>{event.preventDefault();mentorKey=event.currentTarget.elements.key.value;mentorName=event.currentTarget.elements.mentorName.value.trim()||'Mentor';await loadMentorQueue();});
    $('#profile-form').addEventListener('input',event=>{if(event.target.name){$(`[data-error="${event.target.name}"]`).textContent='';event.target.setAttribute('aria-invalid','false');$('#form-status').textContent='';}});
    $('#profile-form').addEventListener('submit',async event=>{event.preventDefault();const result=validateProfileForm(event.currentTarget);if(!result.valid){$('#form-status').textContent='Please check the highlighted fields.';event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();return;}try{const response=await put('/profile',result.values);fillProfileForm(response.profile);renderFeatured();$('#form-status').textContent='Profile synced to your account.';toast('Your profile was updated.');}catch(error){$('#form-status').textContent=error.message;}});
    $('#logout-button').addEventListener('click',async()=>{try{await post('/auth/logout',{});}catch{}profile={...window.SkillBridgeProfile.demo};saved=[];roadmaps=[];submissions=[];showAuthGate(true);setAuthMode('login');$('#auth-status').textContent='You have signed out.';});
    $('#menu-toggle').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));});
    $('#theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
    $('#modal-close').addEventListener('click',closeModal);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#project-modal').classList.contains('hidden'))closeModal();if(event.key==='Tab'&&!$('#project-modal').classList.contains('hidden')){const focusable=$$('button,a,input,select,[tabindex]:not([tabindex="-1"])',$('#project-modal')).filter(element=>!element.disabled);if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}}});
  }

  fillOptions($('#category-filter'),[...new Set(data.projects.map(project=>project.category))]);
  fillOptions($('#resource-category'),[...new Set(data.resources.map(resource=>resource.skill))]);
  fillOptions($('#roadmap-project-select'),data.projects.map(project=>project.title));
  data.projects.forEach((project,index)=>{const option=$('#roadmap-project-select').options[index+1];option.value=project.id;});
  $('#project-total').textContent=data.projects.length;$('#project-nav-count').textContent=data.projects.length;$('#resource-total').textContent=data.resources.length;
  $('#today-label').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date());
  renderResources();
  let preferredTheme='light';try{preferredTheme=localStorage.getItem(THEME_STORAGE)||'light';}catch{}setTheme(preferredTheme);
  bindEvents();
  (async function initialize(){
    try{const session=await api('/auth/session');if(!session.authenticated){showAuthGate(true);return;}showAuthGate(false);await hydrateWorkspace();}
    catch(error){showAuthGate(true);$('#auth-status').textContent=`Could not connect to the SkillBridge server. Start it with node server.js. (${error.message})`;}
  })();
})();
