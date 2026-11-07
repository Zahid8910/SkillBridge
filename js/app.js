(function () {
  const data = window.SkillBridgeData;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const STORAGE = 'skillbridge-bookmarks-v1';
  const THEME_STORAGE = 'skillbridge-theme-v1';
  let saved = readSaved();
  let showSaved = false;
  let lastFocused = null;
  const categoryTone = { 'Frontend Development':'blue', 'Full-Stack Development':'violet', 'Backend Development':'green', 'UI/UX Design':'pink', 'Database Management':'amber', 'Data Analysis':'teal', 'Artificial Intelligence':'indigo' };

  function readSaved() { try { const value = JSON.parse(localStorage.getItem(STORAGE)); return Array.isArray(value) ? value.filter(id => data.projects.some(p => p.id === id)) : []; } catch { return []; } }
  function persistSaved() { try { localStorage.setItem(STORAGE, JSON.stringify(saved)); } catch { toast('Could not save bookmarks in this browser.'); } updateSavedCount(); }
  function initials(name) { return (name || 'S').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S'; }
  function projectCard(project) {
    const isSaved = saved.includes(project.id);
    return `<article class="project-card"><div class="project-card-top"><span class="category-dot ${categoryTone[project.category] || 'blue'}">${esc(project.category)}</span><button class="bookmark-button ${isSaved ? 'is-saved' : ''}" data-bookmark="${esc(project.id)}" aria-label="${isSaved ? 'Remove bookmark' : 'Save project'}" aria-pressed="${isSaved}">${isSaved ? '♥' : '♡'}</button></div><button class="project-title-button" data-detail="${esc(project.id)}"><h3>${esc(project.title)} <span>↗</span></h3></button><p class="project-summary">${esc(project.summary)}</p><div class="tag-row">${project.tech.slice(0, 3).map(tag => `<span>${esc(tag)}</span>`).join('')}</div><div class="card-divider"></div><div class="project-card-foot"><span class="level-label ${project.level.toLowerCase()}"><i></i>${esc(project.level)}</span><span class="duration-label">◷ ${esc(project.duration)}</span></div></article>`;
  }
  function renderFeatured() {
    const profile = window.SkillBridgeProfile.read();
    const interests = (profile.interests || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    const skills = (profile.skills || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    const recommendations = data.projects.map((project, index) => {
      const searchable = [project.title, project.category, ...project.tech, ...project.skills].join(' ').toLowerCase();
      const score = [...interests, ...skills].reduce((total, term) => total + (searchable.includes(term) ? 2 : 0), 0);
      return { project, score, index };
    }).sort((a,b) => b.score - a.score || Number(b.project.featured) - Number(a.project.featured) || a.index - b.index);
    $('#featured-projects').innerHTML = recommendations.slice(0, 3).map(item => projectCard(item.project)).join('');
  }
  function renderProjects() {
    const term = $('#project-search').value.trim().toLowerCase(), category = $('#category-filter').value, level = $('#difficulty-filter').value;
    const filtered = data.projects.filter(p => (!showSaved || saved.includes(p.id)) && (category === 'all' || p.category === category) && (level === 'all' || p.level === level) && (!term || [p.title,p.summary,p.category,p.level,...p.tech,...p.skills].join(' ').toLowerCase().includes(term)));
    const sort = $('#project-sort').value;
    if (sort === 'title') filtered.sort((a,b) => a.title.localeCompare(b.title));
    if (sort === 'difficulty') { const rank = { Beginner:0, Intermediate:1, Advanced:2 }; filtered.sort((a,b) => rank[a.level] - rank[b.level] || a.title.localeCompare(b.title)); }
    if (sort === 'duration') filtered.sort((a,b) => (parseInt(a.duration,10) || 0) - (parseInt(b.duration,10) || 0) || a.title.localeCompare(b.title));
    $('#all-projects').innerHTML = filtered.map(projectCard).join('');
    $('#projects-empty').classList.toggle('hidden', filtered.length > 0); $('#all-projects').classList.toggle('hidden', filtered.length === 0);
    $('#project-results-label').textContent = `Showing ${filtered.length} of ${data.projects.length} projects`;
    $('#saved-only').classList.toggle('selected', showSaved); $('#saved-only').setAttribute('aria-pressed', String(showSaved));
  }
  function renderResources() {
    const term = $('#resource-search').value.trim().toLowerCase(), skill = $('#resource-category').value;
    const list = data.resources.filter(r => (skill === 'all' || r.skill === skill) && (!term || [r.title,r.skill,r.description,r.type,r.level].join(' ').toLowerCase().includes(term)));
    $('#resource-list').innerHTML = list.map((r, index) => `<article class="resource-card"><div class="resource-card-top"><span class="resource-icon resource-icon-${index % 4}">${['↗','⌘','⌁','▤'][index % 4]}</span><span class="resource-type">${esc(r.type)}</span></div><span class="resource-skill">${esc(r.skill)}</span><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p><div class="resource-card-foot"><span class="resource-level">${esc(r.level)}</span><a class="resource-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(r.title)} in a new tab">Open resource <span>↗</span></a></div></article>`).join('');
    $('#resources-empty').classList.toggle('hidden', list.length > 0); $('#resource-list').classList.toggle('hidden', list.length === 0); $('#resource-results-label').textContent = `${list.length} trusted resources`;
  }
  function fillOptions(select, options) { options.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.append(option); }); }
  function updateSavedCount() { $('#saved-count').textContent = saved.length; }
  function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('visible'), 2400); }
  function setTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('#theme-icon').textContent = dark ? '☀' : '☾';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    $('#theme-toggle').setAttribute('aria-label', label); $('#theme-toggle').title = label;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111a2a' : '#f5f7fb');
    try { localStorage.setItem(THEME_STORAGE, dark ? 'dark' : 'light'); } catch { /* Theme still works for this visit if storage is unavailable. */ }
  }
  function openDetail(id, trigger) {
    const project = data.projects.find(p => p.id === id); if (!project) return;
    lastFocused = trigger; const isSaved = saved.includes(id);
    $('#modal-content').innerHTML = `<div class="modal-eyebrow"><span class="category-dot ${categoryTone[project.category] || 'blue'}">${esc(project.category)}</span></div><h2 id="modal-title">${esc(project.title)}</h2><p class="modal-summary">${esc(project.summary)}</p><div class="modal-meta"><span class="level-label ${project.level.toLowerCase()}"><i></i>${esc(project.level)}</span><span>◷ ${esc(project.duration)}</span></div><div class="modal-section"><h3>Project brief</h3><p>Plan and build a first useful version of this solution. Start with the core user need, make the interface clear, and refine it with feedback.</p></div><div class="modal-section"><h3>Core requirements</h3><ul class="requirements-list">${project.requirements.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div><div class="modal-section"><h3>Technologies to explore</h3><div class="tag-row modal-tags">${project.tech.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div><div class="modal-columns"><div class="modal-section"><h3>Skills to practice</h3><ul>${project.skills.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div><div class="modal-section"><h3>Learning outcomes</h3><ul>${project.outcomes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div></div><div class="modal-actions"><button class="button ${isSaved ? 'button-outline' : 'button-primary'}" data-bookmark="${esc(id)}" aria-pressed="${isSaved}">${isSaved ? '♥ Saved to your list' : '♡ Save this project'}</button><button class="quiet-link modal-done" data-close-modal>Done</button></div>`;
    $('#project-modal').classList.remove('hidden'); document.body.classList.add('modal-open'); $('#modal-close').focus();
  }
  function closeModal() { $('#project-modal').classList.add('hidden'); document.body.classList.remove('modal-open'); if (lastFocused?.isConnected) lastFocused.focus(); }
  function setView(view) {
    const target = document.getElementById(`view-${view}`); if (!target) return;
    $$('.view').forEach(section => section.classList.toggle('active', section === target));
    $$('.nav-link, .mobile-link').forEach(link => link.classList.toggle('active', link.dataset.view === view));
    $('#page-title').textContent = ({dashboard:'Dashboard',projects:'Explore projects',resources:'Learning resources',profile:'My profile'})[view];
    $('#sidebar').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded','false'); window.location.hash = view;
    if (view === 'projects') renderProjects(); if (view === 'resources') renderResources();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function fillProfileForm() {
    const profile = window.SkillBridgeProfile.read(), form = $('#profile-form');
    for (const key of ['name','university','department','year','skills','interests']) form.elements[key].value = profile[key] || '';
    $('#welcome-name').textContent = (profile.name || 'Samira').trim().split(/\s+/)[0];
    $('#top-avatar').textContent = initials(profile.name); $('#profile-avatar').textContent = initials(profile.name);
    $('#profile-display-name').textContent = profile.name || 'Your name'; $('#profile-display-role').textContent = `${profile.department || 'Student'} · ${profile.year || 'Add your year'}`;
    $('#interest-tags').innerHTML = (profile.interests || '').split(',').map(x=>x.trim()).filter(Boolean).slice(0,4).map(i=>`<span>${esc(i)}</span>`).join('') || '<span>Add an interest in your profile</span>';
    const skills = (profile.skills || '').split(',').map(x=>x.trim()).filter(Boolean);
    $('#skill-summary').textContent = skills.length ? `${skills.length} skill${skills.length === 1 ? '' : 's'}` : 'Add your skills';
  }
  function validateForm(form) {
    const values = Object.fromEntries(['name','university','department','year','skills','interests'].map(key => [key, form.elements[key].value.trim()]));
    const errors = {name: values.name.length < 2 ? 'Enter at least 2 characters.' : '', university: !values.university ? 'Add your university.' : '', department: !values.department ? 'Add your department.' : '', year: !values.year ? 'Choose your academic year.' : '', skills: values.skills.length > 180 ? 'Keep skills under 180 characters.' : '', interests: values.interests.length > 120 ? 'Keep interests under 120 characters.' : ''};
    Object.entries(errors).forEach(([key, message]) => { $(`[data-error="${key}"]`).textContent = message; form.elements[key].setAttribute('aria-invalid', String(Boolean(message))); });
    return { values, valid: Object.values(errors).every(message => !message) };
  }

  fillOptions($('#category-filter'), [...new Set(data.projects.map(p=>p.category))]);
  fillOptions($('#resource-category'), [...new Set(data.resources.map(r=>r.skill))]);
  $('#project-total').textContent = data.projects.length; $('#project-nav-count').textContent = data.projects.length; $('#resource-total').textContent = data.resources.length;
  const date = new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(new Date()); $('#today-label').textContent = date;
  fillProfileForm(); renderFeatured(); renderProjects(); renderResources(); updateSavedCount();

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-view]'); if (nav) { event.preventDefault(); setView(nav.dataset.view); return; }
    const go = event.target.closest('[data-go]'); if (go) { setView(go.dataset.go); return; }
    const bookmark = event.target.closest('[data-bookmark]'); if (bookmark) {
      const id = bookmark.dataset.bookmark;
      if (saved.includes(id)) { saved = saved.filter(item => item !== id); toast('Removed from your saved projects.'); }
      else { saved.push(id); toast('Project saved for later.'); }
      persistSaved(); renderFeatured(); renderProjects();
      if (!$('#project-modal').classList.contains('hidden')) openDetail(id, $('#modal-close'));
      return;
    }
    const detail = event.target.closest('[data-detail]'); if (detail) { openDetail(detail.dataset.detail, detail); return; }
    if (event.target.closest('[data-close-modal]') || event.target.id === 'modal-close' || event.target.id === 'project-modal') closeModal();
    if (event.target.closest('[data-clear-filters]')) { $('#clear-filters').click(); }
  });
  $('#project-search').addEventListener('input', renderProjects); $('#category-filter').addEventListener('change', renderProjects); $('#difficulty-filter').addEventListener('change', renderProjects);
  $('#project-sort').addEventListener('change', renderProjects);
  $('#clear-filters').addEventListener('click', () => { $('#project-search').value=''; $('#category-filter').value='all'; $('#difficulty-filter').value='all'; $('#project-sort').value='recommended'; showSaved=false; renderProjects(); });
  $('#saved-only').addEventListener('click', () => { showSaved=!showSaved; renderProjects(); });
  $('#resource-search').addEventListener('input', renderResources); $('#resource-category').addEventListener('change', renderResources);
  $('#menu-toggle').addEventListener('click', () => { const open = $('#sidebar').classList.toggle('open'); $('#menu-toggle').setAttribute('aria-expanded',String(open)); });
  $('#theme-toggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#project-modal').classList.contains('hidden')) closeModal(); if (event.key === 'Tab' && !$('#project-modal').classList.contains('hidden')) { const focusable = $$('button, a, input, select, [tabindex]:not([tabindex="-1"])', $('#project-modal')).filter(el=>!el.disabled); if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); } } });
  $('#profile-form').addEventListener('input', event => { if (event.target.name) { $(`[data-error="${event.target.name}"]`).textContent=''; event.target.setAttribute('aria-invalid','false'); $('#form-status').textContent=''; } });
  $('#profile-form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget, result = validateForm(form); if (!result.valid) { $('#form-status').textContent='Please check the highlighted fields.'; form.querySelector('[aria-invalid="true"]')?.focus(); return; }
    if (!window.SkillBridgeProfile.save(result.values)) { $('#form-status').textContent='Could not save. Check your browser storage settings.'; return; }
    fillProfileForm(); $('#form-status').textContent='Profile saved on this device.'; toast('Your profile has been updated.');
  });
  let preferredTheme = 'light'; try { preferredTheme = localStorage.getItem(THEME_STORAGE) || 'light'; } catch { /* Use light mode when storage is unavailable. */ }
  setTheme(preferredTheme);
  const initialView = location.hash.slice(1); if (['dashboard','projects','resources','profile'].includes(initialView)) setView(initialView);
})();
