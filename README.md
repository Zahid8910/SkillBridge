# SkillBridge

**Learn practical skills. Explore real-world projects. Prepare for your career.**

SkillBridge is a student learning workspace that connects practical project briefs, guided milestones, Bangladesh-specific career resources, and mentor-reviewed submissions.

## Features

- Project explorer with search, filters, difficulty sorting, project briefs, and learning outcomes.
- Bangladesh career links for UGC internship calls, Bdjobs internships, BASIS Students’ Forum, Pathao careers, and BRAC Bank internships. Check each source for current eligibility and opening dates.
- Personalized profile and project recommendations.
- Authenticated accounts with server-side profile and bookmark persistence.
- Multiple project roadmaps per account with milestone checklists and live progress.
- HTTPS project submissions, review status, and mentor feedback.
- Mentor review queue protected by a configurable shared key.
- Responsive interface, readable Inter/system typography, light/dark theme, subtle interaction motion, and reduced-motion support.

## Run locally

Install Node.js 18 or newer, then run:

```bash
node server.js
```

Open `http://127.0.0.1:3000`. On first run, the server creates `data/skillbridge.json`; the database and credentials file are excluded from Git.

Demo student login:

- Email: `student@skillbridge.demo`
- Password: `SkillBridge2026!`

The demo mentor key is `local-mentor-demo-key` when `NODE_ENV` is not `production`. For a private local setup, set `MENTOR_REVIEW_KEY`. Production mode requires that environment variable and enables secure session cookies.

## Backend API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`
- `GET/PUT /api/profile`, `GET/PUT /api/bookmarks`
- `GET/POST /api/roadmaps`, `PATCH /api/roadmaps/:projectId/milestones/:milestoneId`
- `GET/POST /api/submissions`
- `GET /api/mentor/submissions`, `PATCH /api/mentor/submissions/:id` (requires `X-Mentor-Key`)

Passwords are stored as salted scrypt hashes; the browser receives an HttpOnly, SameSite session cookie. The included JSON store is appropriate for a local assignment demo. It is not a production database or a multi-instance deployment store. Before public production use, replace it with a managed database, add individual mentor accounts/authorization, email verification and recovery, CSRF protection, durable session storage, backups, and deployment-specific API configuration.

## Structure

```text
SkillBridge/
├── index.html
├── css/style.css
├── js/app.js
├── js/profile.js
├── js/projects.js
├── server.js
└── vercel.json
```

`js/projects.js` contains project briefs and learning resources. `server.js` serves the UI and API using Node built-ins. `js/app.js` manages views, forms and API interactions. `css/style.css` contains the interface and responsive styles.

## Deployment note

The Node server is the supported runnable version. The included Vercel rewrite is for the earlier static prototype and does not provide the new authenticated API or persistent database. Configure serverless API handlers and a managed database before deploying this version to Vercel.

## Assignment walkthrough

1. Explain the gap between coursework and practical project experience.
2. Demonstrate project search, filters, and a project brief.
3. Start a roadmap, complete milestones, and show progress.
4. Save a project and update the profile, then refresh to show account persistence.
5. Submit an HTTPS project link and explain the mentor review flow.
6. Show Bangladesh-specific internship and career resources.
7. Describe tradeoffs: local JSON storage is for the demo; production should use managed persistence and a full account/mentor authorization model.
