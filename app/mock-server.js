
import { createApp, createRouter, eventHandler, toNodeListener, handleCors, getRouterParam, getQuery, readBody } from 'h3';
import { listen } from 'listhen';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_DIR = path.join(__dirname, 'test/e2e/mocks');

// State
let isInstalled = true;
let users = [];

const app = createApp();
const router = createRouter();

app.use(eventHandler((event) => {
  handleCors(event, {
    origin: '*',
    methods: '*',
    allowHeaders: '*'
  });
}));

// Control API for tests
router.post('/_test/reset', eventHandler(async (event) => {
  const body = await readBody(event);
  console.log('[Mock] Reset called with:', body);
  if (body && body.installed !== undefined) {
    isInstalled = body.installed;
  } else {
    isInstalled = true;
  }
  console.log('[Mock] isInstalled set to:', isInstalled);
  users = [];
  return { status: 'ok' };
}));

// Helper to read json
const readJson = (filename) => {
  try {
    const filePath = path.join(MOCK_DIR, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
  }
  return null;
};

router.get('/api/user/info', eventHandler(() => ({
  err: 'ok',
  sys: {
    title: 'Talebook Mock',
    books: 100,
    authors: 50,
    publishers: 20,
    tags: 10,
    formats: 3,
    version: '1.0.0',
    users: 5,
    friends: [],
    allow: { register: true, download: true, push: true, read: true }
  },
  user: {
    is_login: true,
    is_admin: true,
    nickname: 'Admin',
    avatar: '',
    kindle_email: 'test@kindle.com'
  }
})));

router.get('/api/user/messages', eventHandler(() => ({
  err: 'ok',
  total: 0,
  messages: []
})));

router.get('/get/cover/:id', eventHandler((event) => {
  // Return a 1x1 pixel transparent gif or just 200 OK
  // Or maybe redirect to a placeholder
  return new Response('fake-image', { headers: { 'Content-Type': 'image/jpeg' } });
}));

router.get('/api/index', eventHandler(() => {
  console.log('[Mock] GET /api/index, isInstalled:', isInstalled);
  if (!isInstalled) {
    return { err: 'not_installed', msg: 'System not installed' };
  }
  return readJson('api_index.json') || { err: 'error', msg: 'mock not found' };
}));

router.post('/api/admin/install', eventHandler(async (event) => {
  const body = await readBody(event); // or parse multipart/form-data if needed
  // Simple mock
  isInstalled = true;
  return { err: 'ok', msg: 'Install success' };
}));

// Admin Settings
router.get('/api/admin/settings', eventHandler(() => ({
  err: 'ok',
  site_url: 'http://localhost:8000',
  sns: [
    { value: 'github', text: 'GitHub', link: 'https://github.com/settings/applications/new' },
    { value: 'google', text: 'Google', link: 'https://console.developers.google.com/' }
  ],
  settings: {
    site_title: 'Talebook Mock',
    ALLOW_REGISTER: true,
    SOCIALS: [],
    FRIENDS: [],
    smtp_server: 'smtp.example.com',
    smtp_username: 'user',
    smtp_password: 'password',
    smtp_encryption: 'SSL'
  }
})));

router.post('/api/admin/settings', eventHandler(() => ({
  err: 'ok',
  msg: 'Settings saved'
})));

router.post('/api/admin/testmail', eventHandler(() => ({
  err: 'ok',
  msg: 'Test email sent'
})));

// Admin Users - Use app.use to handle query params
app.use('/api/admin/users', eventHandler((event) => {
  if (event.method === 'GET') {
    return {
      err: 'ok',
      users: {
        total: 1,
        items: [
          {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            is_admin: true,
            is_active: true,
            access_time: '2023-01-01 12:00:00',
            create_time: '2023-01-01 12:00:00',
            extra: { login_ip: '127.0.0.1' },
            can_login: true,
            can_upload: true,
            can_read: true
          }
        ]
      }
    };
  }
  if (event.method === 'POST') {
    return { err: 'ok', msg: 'User updated' };
  }
}));

// Admin Books
app.use('/api/admin/book/list', eventHandler(() => {
  const books = readJson('books.json') || [];
  return {
    err: 'ok',
    total: books.length,
    items: books
  };
}));

router.get('/api/admin/book/fill', eventHandler(() => ({
  err: 'ok',
  status: { total: 100, done: 10, fail: 0, skip: 90 }
})));

router.post('/api/admin/book/fill', eventHandler(() => ({
  err: 'ok',
  msg: 'Auto fill started'
})));

router.post('/api/admin/book/delete', eventHandler(() => ({
  err: 'ok',
  msg: 'Books deleted'
})));

router.post('/api/book/:id/delete', eventHandler(() => ({
  err: 'ok',
  msg: 'Book deleted'
})));

router.post('/api/book/:id/edit', eventHandler(() => ({
  err: 'ok',
  msg: 'Book updated'
})));

// Admin Imports
app.use('/api/admin/scan/list', eventHandler(() => ({
  err: 'ok',
  scan_dir: '/mock/scan/dir',
  summary: { done: 5, todo: 2 },
  total: 2,
  items: [
    { id: 1, status: 'new', path: '/books/new1.epub', title: 'New Book 1', author: 'Author 1', create_time: '2023-01-02' },
    { id: 2, status: 'exist', path: '/books/exist.epub', title: 'Existing Book', author: 'Author 2', create_time: '2023-01-01' }
  ]
})));

router.post('/api/admin/scan/run', eventHandler(() => ({
  err: 'ok',
  msg: 'Scan started'
})));

router.get('/api/admin/scan/status', eventHandler(() => ({
  err: 'ok',
  status: { new: 0 },
  summary: { done: 5, todo: 2 }
})));

router.post('/api/admin/import/run', eventHandler(() => ({
  err: 'ok',
  msg: 'Import started'
})));

router.get('/api/admin/import/status', eventHandler(() => ({
  err: 'ok',
  status: { ready: 0 },
  summary: { done: 6, todo: 1 }
})));

router.post('/api/admin/scan/delete', eventHandler(() => ({
  err: 'ok',
  msg: 'Record deleted'
})));

router.get('/api/recent', eventHandler(() => {
  return readJson('api_recent.json') || { err: 'error', msg: 'mock not found' };
}));

router.get('/api/hot', eventHandler(() => {
  return readJson('api_hot.json') || { err: 'error', msg: 'mock not found' };
}));

// Search
router.get('/api/search', eventHandler((event) => {
  const query = getQuery(event);
  const name = query.name || '';
  const books = readJson('books.json') || [];
  const filtered = books.filter(b => b.title.includes(name));
  return {
    err: 'ok',
    title: `搜索：${name}`,
    total: filtered.length,
    books: filtered
  };
}));

// Book Detail
router.get('/api/book/:id', eventHandler((event) => {
  const id = getRouterParam(event, 'id');
  console.log(`[Mock] Book request id: ${id}`);
    
  // Check if it is a detail request (number)
  if (/^\d+$/.test(id)) {
    const data = readJson(`api_book_${id}.json`);
    if (data) return data;
    return { err: 'not_found', msg: 'Book not found' };
  }
    
  return { err: 'ok', msg: 'mock action' };
}));

app.use(router.handler);

listen(toNodeListener(app), { hostname: '0.0.0.0', port: 8000 });
