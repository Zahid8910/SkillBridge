const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const skillBridgeData = require('./js/projects.js');

const scrypt = promisify(crypto.scrypt);
const root = __dirname;
const dataDir = path.join(root, 'data');
const databasePath = path.join(dataDir, 'skillbridge.json');
const port = Number(process.env.PORT) || 3000;
const sessionTtl = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const authAttempts = new Map();
const mentorKey = process.env.MENTOR_REVIEW_KEY || (process.env.NODE_ENV === 'production' ? '' : 'local-mentor-demo-key');
let database;
let databaseWrites = Promise.resolve();

const demoProfile = {
  name: 'Demo Student', university: 'Your university', department: 'Computer Science & Engineering',
  year: '2nd year', skills: 'HTML, CSS, JavaScript', interests: 'Frontend development, UI/UX'
};

function send(response, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  response.end(payload);
}

function fail(response, status, message) {
  send(response, status, { error: message });
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(cookie => cookie.trim()).filter(Boolean).map(cookie => {
    const separator = cookie.indexOf('=');
    if (separator < 0) return [cookie, ''];
    try { return [cookie.slice(0, separator), decodeURIComponent(cookie.slice(separator + 1))]; }
    catch { return [cookie.slice(0, separator), '']; }
  }));
}

function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `sb_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

function currentUser(request) {
  const token = parseCookies(request.headers.cookie).sb_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  return database.users.find(user => user.id === session.userId) || null;
}

function createSession(user, response) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionTtl });
  response.setHeader('Set-Cookie', sessionCookie(token, sessionTtl / 1000));
}

function authRateAllowed(request) {
  const key = request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const state = authAttempts.get(key);
  if (!state || now - state.startedAt > 15 * 60 * 1000) {
    authAttempts.set(key, { startedAt: now, count: 1 });
    return true;
  }
  state.count += 1;
  return state.count <= 12;
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64 * 1024) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  try { return body ? JSON.parse(body) : {}; }
  catch { throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }); }
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeProfile(input, existing = demoProfile) {
  const profile = {};
  for (const key of ['name', 'university', 'department', 'year', 'skills', 'interests']) {
    profile[key] = cleanText(input[key], key === 'skills' ? 180 : key === 'interests' ? 120 : 100) || existing[key] || '';
  }
  if (profile.name.length < 2) throw Object.assign(new Error('Name must contain at least 2 characters.'), { status: 400 });
  if (!profile.university || !profile.department || !profile.year) throw Object.assign(new Error('University, department and academic year are required.'), { status: 400 });
  return profile;
}

async function saveDatabase() {
  const snapshot = JSON.stringify(database, null, 2);
  databaseWrites = databaseWrites.then(async () => {
    const temporaryPath = `${databasePath}.tmp`;
    await fs.writeFile(temporaryPath, snapshot, { mode: 0o600 });
    await fs.rename(temporaryPath, databasePath);
  });
  return databaseWrites;
}

async function initializeDatabase() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    database = JSON.parse(await fs.readFile(databasePath, 'utf8'));
    if (!database || !Array.isArray(database.users)) throw new Error('Invalid database structure.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const users = [];
    if (process.env.NODE_ENV !== 'production') {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = (await scrypt('SkillBridge2026!', salt, 64)).toString('hex');
      users.push({ id: crypto.randomUUID(), email: 'student@skillbridge.demo', salt, passwordHash, profile: demoProfile, bookmarks: [], roadmaps: [], submissions: [] });
    }
    database = { users };
    await saveDatabase();
  }
}

function projectById(projectId) {
  return skillBridgeData.projects.find(project => project.id === projectId);
}

function roadmapResponse(user) {
  user.roadmaps ||= user.roadmap ? [user.roadmap] : [];
  const roadmaps = user.roadmaps.map(roadmap => {
    const project = projectById(roadmap.projectId);
    const milestones = roadmap.milestones || [];
    const total = milestones.length;
    const completed = milestones.filter(item => item.completed).length;
    return { ...roadmap, milestones, project, completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
  }).filter(item => item.project);
  return { roadmaps };
}

function authorizedMentor(request) {
  const supplied = request.headers['x-mentor-key'];
  if (!mentorKey || typeof supplied !== 'string') return false;
  const expectedHash = crypto.createHash('sha256').update(mentorKey).digest();
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest();
  return crypto.timingSafeEqual(expectedHash, suppliedHash);
}

async function handleApi(request, response, url) {
  const route = url.pathname;
  const method = request.method;

  if (route === '/api/auth/session' && method === 'GET') {
    const user = currentUser(request);
    return send(response, 200, user ? { authenticated: true, user: { email: user.email, profile: user.profile } } : { authenticated: false });
  }

  if ((route === '/api/auth/register' || route === '/api/auth/login') && method === 'POST') {
    if (!authRateAllowed(request)) return fail(response, 429, 'Too many attempts. Wait a little and try again.');
    const body = await readBody(request);
    const email = cleanText(body.email, 254).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(response, 400, 'Enter a valid email address.');
    if (password.length < 10 || password.length > 128) return fail(response, 400, 'Password must be 10–128 characters.');

    if (route.endsWith('register')) {
      if (database.users.some(user => user.email === email)) return fail(response, 409, 'An account with this email already exists.');
      const name = cleanText(body.name, 60);
      if (name.length < 2) return fail(response, 400, 'Enter your name to create an account.');
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = { id: crypto.randomUUID(), email, salt, passwordHash, profile: { ...demoProfile, name }, bookmarks: [], roadmaps: [], submissions: [] };
      database.users.push(user);
      await saveDatabase();
      createSession(user, response);
      return send(response, 201, { user: { email: user.email, profile: user.profile } });
    }

    const user = database.users.find(item => item.email === email);
    if (!user) return fail(response, 401, 'Email or password is incorrect.');
    const attempt = await scrypt(password, user.salt, 64);
    const stored = Buffer.from(user.passwordHash, 'hex');
    if (attempt.length !== stored.length || !crypto.timingSafeEqual(attempt, stored)) return fail(response, 401, 'Email or password is incorrect.');
    createSession(user, response);
    return send(response, 200, { user: { email: user.email, profile: user.profile } });
  }

  if (route === '/api/auth/logout' && method === 'POST') {
    const token = parseCookies(request.headers.cookie).sb_session;
    if (token) sessions.delete(token);
    return send(response, 200, { success: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }

  if (route.startsWith('/api/mentor/')) {
    if (!authorizedMentor(request)) return fail(response, 401, 'Mentor key is missing or incorrect.');
    if (route === '/api/mentor/submissions' && method === 'GET') {
      const queue = database.users.flatMap(user => user.submissions.filter(item => item.status === 'submitted' || item.status === 'needs-revision').map(item => ({
        ...item, studentName: user.profile.name, projectTitle: projectById(item.projectId)?.title || 'Project'
      })));
      return send(response, 200, { submissions: queue });
    }
    const reviewMatch = route.match(/^\/api\/mentor\/submissions\/([\w-]+)$/);
    if (reviewMatch && method === 'PATCH') {
      const body = await readBody(request);
      const status = body.status;
      const feedback = cleanText(body.feedback, 2000);
      const mentorName = cleanText(body.mentorName, 80) || 'Mentor';
      if (!['approved', 'needs-revision'].includes(status)) return fail(response, 400, 'Choose approved or needs revision.');
      if (feedback.length < 8) return fail(response, 400, 'Add at least 8 characters of useful feedback.');
      for (const user of database.users) {
        const submission = user.submissions.find(item => item.id === reviewMatch[1]);
        if (!submission) continue;
        submission.status = status;
        submission.feedback = feedback;
        submission.mentorName = mentorName;
        submission.reviewedAt = new Date().toISOString();
        await saveDatabase();
        return send(response, 200, { submission });
      }
      return fail(response, 404, 'Submission not found.');
    }
    return fail(response, 404, 'Mentor endpoint not found.');
  }

  const user = currentUser(request);
  if (!user) return fail(response, 401, 'Sign in to use your SkillBridge workspace.');

  if (route === '/api/profile' && method === 'GET') return send(response, 200, { profile: user.profile });
  if (route === '/api/profile' && method === 'PUT') {
    const body = await readBody(request);
    try { user.profile = normalizeProfile(body, user.profile); }
    catch (error) { return fail(response, error.status || 400, error.message); }
    await saveDatabase();
    return send(response, 200, { profile: user.profile });
  }

  if (route === '/api/bookmarks' && method === 'GET') return send(response, 200, { bookmarks: user.bookmarks });
  if (route === '/api/bookmarks' && method === 'PUT') {
    const body = await readBody(request);
    if (!Array.isArray(body.bookmarks)) return fail(response, 400, 'Bookmarks must be an array of project IDs.');
    user.bookmarks = [...new Set(body.bookmarks.filter(id => typeof id === 'string' && projectById(id)))];
    await saveDatabase();
    return send(response, 200, { bookmarks: user.bookmarks });
  }

  if (route === '/api/roadmaps' && method === 'GET') return send(response, 200, roadmapResponse(user));
  if (route === '/api/roadmaps' && method === 'POST') {
    const body = await readBody(request);
    const project = projectById(body.projectId);
    if (!project) return fail(response, 404, 'Choose a project from the explorer.');
    user.roadmaps ||= user.roadmap ? [user.roadmap] : [];
    let roadmap = user.roadmaps.find(item => item.projectId === project.id);
    if (!roadmap) {
      roadmap = { projectId: project.id, startedAt: new Date().toISOString(), milestones: project.requirements.map((title, index) => ({ id: `milestone-${index + 1}`, title, completed: false })) };
      user.roadmaps.push(roadmap);
      await saveDatabase();
    }
    return send(response, 200, roadmapResponse(user));
  }
  const milestoneMatch = route.match(/^\/api\/roadmaps\/([\w-]+)\/milestones\/([\w-]+)$/);
  if (milestoneMatch && method === 'PATCH') {
    const body = await readBody(request);
    const roadmap = (user.roadmaps || []).find(item => item.projectId === milestoneMatch[1]);
    const milestone = roadmap?.milestones.find(item => item.id === milestoneMatch[2]);
    if (!milestone) return fail(response, 404, 'Roadmap milestone not found.');
    milestone.completed = Boolean(body.completed);
    await saveDatabase();
    return send(response, 200, roadmapResponse(user));
  }

  if (route === '/api/submissions' && method === 'GET') return send(response, 200, { submissions: user.submissions });
  if (route === '/api/submissions' && method === 'POST') {
    const body = await readBody(request);
    const project = projectById(body.projectId);
    if (!project) return fail(response, 400, 'Choose a valid project.');
    if (!(user.roadmaps || []).some(item => item.projectId === project.id)) return fail(response, 400, 'Start this project roadmap before submitting work.');
    let submissionUrl;
    try { submissionUrl = new URL(body.url); } catch { return fail(response, 400, 'Enter a valid HTTPS project or repository link.'); }
    if (submissionUrl.protocol !== 'https:' || !submissionUrl.hostname || submissionUrl.username || submissionUrl.password) return fail(response, 400, 'Submission links must use HTTPS.');
    const submission = {
      id: crypto.randomUUID(), projectId: project.id, url: submissionUrl.toString(),
      notes: cleanText(body.notes, 1000), status: 'submitted', feedback: '', mentorName: '',
      createdAt: new Date().toISOString(), reviewedAt: null
    };
    user.submissions.unshift(submission);
    await saveDatabase();
    return send(response, 201, { submission });
  }

  return fail(response, 404, 'API route not found.');
}

const mimeTypes = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml' };

async function serveStatic(request, response, url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return fail(response, 400, 'Invalid path.'); }
  if (pathname === '/data' || pathname.startsWith('/data/') || pathname.startsWith('/.git') || pathname === '/.env') return fail(response, 404, 'File not found.');
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, 'index.html')) return fail(response, 403, 'Forbidden.');
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY'
    });
    response.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') return fail(response, 404, 'File not found.');
    throw error;
  }
}

async function start() {
  await initializeDatabase();
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
      if (request.method !== 'GET' && request.method !== 'HEAD') return fail(response, 405, 'Method not allowed.');
      return await serveStatic(request, response, url);
    } catch (error) {
      console.error(error);
      if (!response.headersSent) fail(response, error.status || 500, error.status ? error.message : 'Unexpected server error.');
      else response.destroy();
    }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`SkillBridge running at http://127.0.0.1:${port}`);
    console.log(`Demo login: student@skillbridge.demo / SkillBridge2026!`);
    if (process.env.NODE_ENV !== 'production') console.log(`Local mentor key: ${mentorKey}`);
  });
}

start().catch(error => { console.error('Could not start SkillBridge:', error); process.exitCode = 1; });
