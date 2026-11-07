# SkillBridge

**Learn practical skills. Explore real-world projects. Prepare for your career.**

SkillBridge is a frontend-only student learning workspace. It combines practical project briefs, guided milestones, Bangladesh career resources, and browser-saved profile and bookmark data. No account or backend is required.

## Features

- Project explorer with search, filters, difficulty sorting, detailed briefs and learning outcomes.
- Guided project roadmaps with milestone checklists and progress tracking.
- Profile, bookmarks, roadmaps and project links saved in the current browser with `localStorage`, plus a local demo review panel for status and feedback.
- Bangladesh career links for UGC internship calls, Bdjobs internships, BASIS Students’ Forum, Pathao careers and BRAC Bank internships. Check each source for current eligibility and opening dates.
- Responsive interface, readable Inter/system typography, light/dark theme, subtle interaction motion and reduced-motion support.

Project links and demo feedback stay in the current browser. The review panel demonstrates the interaction only: it does not contact a mentor or provide external review. Browser storage is device-specific and can be cleared with browser data.

## Bangladesh career resources

- [UGC ICSETEP internship portal](https://ssiicsetep.ugc.gov.bd/internship)
- [Bdjobs internship search](https://bdjobs.com/h/jobs?JobType=intern&lang=en)
- [BASIS Students’ Forum](https://bsf.basis.org.bd/about-forum)
- [Pathao careers](https://careers.pathao.com/job-openings/)
- [BRAC Bank internship program](https://bracbank.com/bn/page/internship-program)

Listings and program details change; verify dates and requirements on the linked sites.

## Structure

```text
SkillBridge/
├── index.html
├── css/style.css
├── js/app.js
├── js/profile.js
├── js/projects.js
└── vercel.json
```

`js/projects.js` contains project briefs and learning resources. `js/app.js` handles views, forms, local persistence and interactions. `css/style.css` contains the interface and responsive styles.

