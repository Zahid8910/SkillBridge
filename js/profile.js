(function () {
  const KEY = 'skillbridge-profile-v1';
  const demoProfile = { name: 'Samira Rahman', university: 'Your university', department: 'Computer Science & Engineering', year: '2nd year', skills: 'HTML, CSS, JavaScript', interests: 'Frontend development, UI/UX' };
  function safeRead() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...demoProfile };
      return { ...demoProfile, ...value };
    } catch { return { ...demoProfile }; }
  }
  function save(profile) {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); return true; }
    catch { return false; }
  }
  window.SkillBridgeProfile = { read: safeRead, save, demo: { ...demoProfile } };
})();
