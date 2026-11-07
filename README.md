# SkillBridge

**Learn practical skills. Explore real-world projects. Prepare for your career.**

SkillBridge is a responsive, student-focused frontend demonstration for bridging university learning and practical software work. It helps students discover realistic project briefs, see the skills those projects exercise, and find reliable learning material to take a next step.

## Problem

Many university students learn programming concepts without seeing how they connect to industry workflows and real product problems. It can be difficult to decide what to learn, how to practice, or how academic knowledge applies to a career.

## Proposed solution

SkillBridge brings industry-inspired project briefs and trusted learning links into one lightweight workspace. Students can search and filter projects, save ideas to revisit, and maintain a small local profile that personalizes the dashboard.

## Features

- Dashboard with profile-based greeting, useful counts and featured project briefs.
- Project Explorer with keyword search, category and difficulty filters, sorting, actionable project requirements, learning outcomes, and saved projects.
- Learning resources grouped by skill, with search and links to established documentation and learning sites.
- Editable student profile with basic validation and browser-local persistence.
- Persistent light/dark theme toggle and project sorting by title, difficulty, or estimated duration.
- Subtle view, card, hover, and hero motion with reduced-motion support.
- Profile-based project recommendations that match the student's listed skills and career interests.
- Orbiting hero artwork and responsive hover/press feedback on navigation, cards, bookmarks, and actions.

## Design rationale

The visual direction keeps SkillBridge's student product identity while applying a few useful patterns observed on Credosis' public site: a direct value statement, scannable numbered service content, and project descriptions that foreground the problem and outcome. The project briefs now include concrete requirements and outcomes so students can see what a finished piece of work should demonstrate. The frontend intern role also highlights responsive, accessible, maintainable, and performant interfaces, which are reflected in the responsive layouts, keyboard states, reduced-motion support, and small vanilla-JavaScript modules. The interface uses Inter for headings and body copy with system sans-serif fallbacks, giving the text a familiar, consistent reading style.

Reference pages: [Credosis home](https://credosis.com/), [Services](https://credosis.com/services), [Work](https://credosis.com/work), [About](https://credosis.com/about), and [Frontend Engineer Intern role](https://credosis.com/careers/frontend-engineer-intern).
- Responsive desktop sidebar and mobile bottom navigation.

## Technology

HTML5, CSS3, vanilla JavaScript, and `localStorage`. No build step or backend is required. The interface uses Inter with system sans-serif fallbacks for consistent, readable text.

## Project structure

```text
SkillBridge/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── projects.js
    └── profile.js
```

`projects.js` holds the sample project and learning resource data, including project requirements. `profile.js` safely reads and writes profile data. `app.js` renders views, recommends projects from profile skills/interests, handles navigation and filtering, manages bookmarks and theme preference, and validates the profile form. `style.css` contains the design system and responsive layouts.

## Run locally

Open `index.html` directly, or serve the folder with VS Code Live Server. For example, if Python is available:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

Profile, saved project data, and theme preference are stored in this browser on this device. They are not synced to an account or server. Reset the demo by clearing the browser's site data/local storage.

## Screenshots

Add desktop and mobile screenshots here after capturing the finished demo.

## Live demo

Not deployed yet. After deploying, replace this line with the Vercel URL.

## Deploy to Vercel

Import this repository in Vercel and select the static/Other framework preset. No build command is needed; use `.` as the output directory. The included `vercel.json` rewrites routes to `index.html` for the single-page navigation.

## GitHub setup

Run these commands from the project directory after creating an empty GitHub repository and replacing the URL:

```bash
git init
git add index.html css js README.md vercel.json
git commit -m "Build SkillBridge frontend demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/skillbridge.git
git push -u origin main
```

## Final demo checklist

- [ ] Dashboard greeting and counts load.
- [ ] All four navigation views work on desktop and mobile.
- [ ] Search, category and difficulty filters update project results; clear and empty states work.
- [ ] Project detail dialog opens, closes by button/Escape/backdrop, and exposes its brief, skills, outcomes and technologies.
- [ ] Bookmarks can be saved/removed and survive a refresh.
- [ ] Learning resources search/filter and open legitimate external references in a new tab.
- [ ] Profile validation identifies missing required values; saved profile remains after refresh and personalizes dashboard.
- [ ] Inspect mobile widths for overflow and keyboard navigation for dialog/profile controls.

## Walkthrough video (3–5 minutes)

1. **Problem and idea (30–45 sec):** Explain the gap between coursework and practical industry experience.
2. **Dashboard (30 sec):** Show how the workspace guides students toward projects and resources.
3. **Core project flow (90 sec):** Search/filter a brief, open the details, explain skills/outcomes, bookmark it, and refresh to show persistence.
4. **Learning and profile (45–60 sec):** Find a resource and update the demo profile, then show the greeting and skill summary change.
5. **Implementation (30–45 sec):** Explain data separation, render/filter flow, localStorage, responsive CSS, and one challenge you solved.

## Likely technical interview questions

**How does project search work?** `renderProjects()` reads the current query and filter values, then filters the single project data array. The query is matched case-insensitively against title, summary, category, level, technologies, and skills.

**How do category and difficulty filters combine?** Each project must match both selected filters and the search query. The `all` option skips that condition, so multiple controls narrow the same result set.

**How does the UI stay in sync with project data?** Project records live once in `js/projects.js`. Cards, dashboard counts, filtering, and detail content are rendered from those records by `js/app.js`.

**How are bookmarks persisted?** The app stores an array of project IDs in `localStorage`. On load it parses and validates the IDs against known projects; changes trigger a rerender and a storage write.

**How is profile data stored safely?** `profile.js` wraps JSON parsing and writes in `try/catch`. Invalid or missing data falls back to a demo profile. The form validates required fields before saving and updates the visible profile after a successful write.

**Why use IDs for bookmarks instead of copying project objects?** IDs are stable references to the canonical data. This keeps stored data small and means a project description can change without stale copies in a bookmark list.

**What would change for a production product?** Add server-side accounts and persistence, API-backed content, automated tests, and stronger validation/privacy controls. The current local-only demo is intentionally backend-free.

## Future improvements

- Add a guided project roadmap with milestones and progress tracking.
- Offer more Bangladesh-specific internship and career resources.
- Connect profiles and bookmarks to an authenticated backend.
- Add reviewed project submissions and mentor feedback.
