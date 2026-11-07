(function () {
  const demo = { name: 'Md. Zahid Hasan', university: 'Your university', department: 'Computer Science & Engineering', year: '2nd year', skills: 'HTML, CSS, JavaScript', interests: 'Frontend development, UI/UX' };

  function normalize(profile) {
    return Object.fromEntries(['name', 'university', 'department', 'year', 'skills', 'interests'].map(key => [key, String(profile[key] || '').trim()]));
  }

  function validate(profile) {
    const values = normalize(profile);
    const errors = {
      name: values.name.length < 2 ? 'Enter at least 2 characters.' : '',
      university: !values.university ? 'Add your university.' : '',
      department: !values.department ? 'Add your department.' : '',
      year: !values.year ? 'Choose your academic year.' : '',
      skills: values.skills.length > 180 ? 'Keep skills under 180 characters.' : '',
      interests: values.interests.length > 120 ? 'Keep interests under 120 characters.' : ''
    };
    return { values, errors, valid: Object.values(errors).every(message => !message) };
  }

  window.SkillBridgeProfile = { demo, normalize, validate };
})();
