
import { createApp, createRouter, eventHandler, toNodeListener, handleCors, getRouterParam, getQuery, readBody } from 'h3';
import { listen } from 'listhen';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOCK_DIR = path.join(__dirname, 'e2e/mocks');

// State
let isInstalled = true;
let users = [];
let saveStarted = false;
let saveStatusPolls = 0;
let booksourceCheckRunning = false;
let booksourceCheckPolls = 0;
let shelfBookIds = new Set();
let readingStateByBookId = new Map();
let activeThemeName = '';

const builtinThemes = [
  {
    id: 'builtin-brass',
    name: 'brass',
    display_name: '黄铜主题',
    version: '1.0.0',
    author: 'Talebook',
    description: '暖褐炭灰打底，一线黄铜勾勒轮廓，衬线书名沉静内敛——像台灯下摊开的一册旧书，最宜夜里慢读细品。',
    installed_at: null,
    builtin: true,
    components: {
      AppHeader: 'builtin:brass/AppHeader',
      AppFooter: 'builtin:brass/AppFooter',
    },
  },
  {
    id: 'builtin-graphite',
    name: 'graphite',
    display_name: '石墨主题',
    version: '1.0.0',
    author: 'Talebook',
    description: '冷调蓝灰如石墨般沉着，墨蓝作唯一亮色，选中项亮起一道细边——信息井然有序，久看不觉刺眼。',
    installed_at: null,
    builtin: true,
    components: {
      AppHeader: 'builtin:graphite/AppHeader',
      AppFooter: 'builtin:graphite/AppFooter',
    },
  },
  {
    id: 'builtin-light-gray',
    name: 'light-gray',
    display_name: '浅灰主题',
    version: '1.0.0',
    author: 'Talebook',
    description: '通透的高级浅灰，低饱和配色搭紧凑侧栏，清爽而不喧宾夺主——日常打理书库，久对屏幕也轻松。',
    installed_at: null,
    builtin: true,
    components: {
      AppHeader: 'builtin:light-gray/AppHeader',
      AppFooter: 'builtin:light-gray/AppFooter',
    },
  },
  {
    id: 'builtin-warm-red',
    name: 'warm-red',
    display_name: '暖红主题',
    version: '1.0.0',
    author: 'Talebook',
    description: '微黄纸感的明亮底色，牛血红点题，侧栏以虚线分行如旧时图书馆的索引卡——带着纸页与目录的温度。',
    installed_at: null,
    builtin: true,
    components: {
      AppHeader: 'builtin:warm-red/AppHeader',
      AppFooter: 'builtin:warm-red/AppFooter',
    },
  },
  {
    id: 'builtin-minimal',
    name: 'minimal',
    display_name: '极简主题',
    version: '1.0.0',
    author: 'Talebook',
    description: '去尽多余装饰，只留文字与留白，小字号、高密度——明暗两色皆为一目十行的快速浏览而生。',
    installed_at: null,
    builtin: true,
    components: {
      AppHeader: 'builtin:minimal/AppHeader',
      AppFooter: 'builtin:minimal/AppFooter',
    },
  },
];

const listThemes = () => builtinThemes.map(theme => ({
  ...theme,
  components: { ...theme.components },
  active: activeThemeName === theme.name,
}));

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
  saveStarted = false;
  saveStatusPolls = 0;
  booksourceCheckRunning = false;
  booksourceCheckPolls = 0;
  shelfBookIds = new Set();
  readingStateByBookId = new Map();
  activeThemeName = '';
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
    allow: { register: true, download: true, push: true, read: true },
    upload: { chunk_enabled: true, chunk_threshold: 8 * 1024 * 1024, chunk_size: 4 * 1024 * 1024 }
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

router.get('/api/admin/trash/size', eventHandler(() => ({
  err: 'ok',
  sizes: { trash: 0, upload: 0 },
  trash_path: '/tmp/trash',
  upload_path: '/tmp/upload'
})));

router.get('/api/admin/update', eventHandler(() => ({
  err: 'ok',
  status: {
    current_version: 'mock-1.0.0',
    latest_version: '',
    has_update: false,
    latest_release_url: '',
    latest_release_name: '',
    latest_release_body: '',
    check_error: null,
    last_check_time: null
  }
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

router.post('/api/book/:id/convert', eventHandler(() => ({
  err: 'ok',
  msg: 'Conversion started'
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

router.get('/api/library', eventHandler(() => {
  const data = readJson('api_recent.json') || { title: '本地书库', total: 0, books: [] };
  const books = (data.books || []).map((book, index) => ({
    ...book,
    state: { read_state: index === 0 ? 2 : 0 },
  }));
  const lines = [
    JSON.stringify({ err: 'ok', title: '本地书库', total: books.length }),
    ...books.map(book => JSON.stringify(book)),
  ];
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}));

for (const filter of ['publisher', 'author', 'tag', 'format']) {
  router.get(`/api/${filter}`, eventHandler(() => ({
    err: 'ok',
    items: [],
  })));
}

router.get('/api/hot', eventHandler(() => {
  return readJson('api_hot.json') || { err: 'error', msg: 'mock not found' };
}));

const getFinishedBooks = () => {
  const books = readJson('books.json') || [];
  return books.slice(0, 1).map(book => ({
    ...book,
    state: { read_state: 2 },
  }));
};

router.get('/api/read-done', eventHandler(() => {
  const books = getFinishedBooks();
  return { err: 'ok', total: books.length, books };
}));

router.get('/api/reading', eventHandler(() => ({
  err: 'ok',
  total: 0,
  books: [],
})));

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

const getShelfBooks = () => {
  const books = readJson('books.json') || [];
  return books
    .filter(book => shelfBookIds.has(Number(book.id)))
    .map((book) => {
      const reading = readingStateByBookId.get(Number(book.id));
      return {
        ...book,
        state: {
          favorite: 0,
          favorite_date: null,
          wants: 1,
          wants_date: '2023-01-01T00:00:00',
          read_state: reading?.readState || 0,
          read_date: reading?.readDate || null,
          online_read: 0,
          download: 0,
        },
      };
    });
};

router.get('/api/shelf', eventHandler(() => {
  const shelfBooks = getShelfBooks();
  return {
    err: 'ok',
    title: '我的书架',
    total: shelfBooks.length,
    books: shelfBooks,
  };
}));

router.post('/api/book/:id/shelf', eventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  if (body && body.shelf) {
    shelfBookIds.add(id);
    return { err: 'ok', msg: '加入书架成功' };
  }
  shelfBookIds.delete(id);
  return { err: 'ok', msg: '移除书架成功' };
}));

router.get('/api/book/:id/readstate', eventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'));
  const reading = readingStateByBookId.get(id);
  return {
    err: 'ok',
    favorite: false,
    wants: shelfBookIds.has(id),
    read_state: reading?.readState || 0,
    read_date: reading?.readDate || null,
    favorite_date: null,
    wants_date: shelfBookIds.has(id) ? '2023-01-01T00:00:00' : null,
    online_read: 0,
    download: 0,
  };
}));

router.post('/api/book/:id/readstate', eventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const readState = Number(body?.read_state || 0);
  if (![0, 1, 2].includes(readState)) {
    return { err: 'params.invalid', msg: 'Invalid reading state' };
  }
  readingStateByBookId.set(id, {
    readState,
    readDate: new Date().toISOString(),
  });
  return {
    err: 'ok',
    msg: 'Reading state updated',
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

// Admin book sources
router.get('/api/admin/booksource/list', eventHandler(() => ({
  err: 'ok',
  count: 1,
  items: [
    {
      id: 1,
      name: '测试书源',
      url: 'http://x.com',
      group: '测试',
      enabled: true,
      check_status: 'ok',
      check_message: '',
      check_tags: [],
    },
  ],
  check_task: { running: booksourceCheckRunning },
})));

router.post('/api/admin/booksource/check', eventHandler(() => {
  booksourceCheckRunning = true;
  booksourceCheckPolls = 0;
  return { err: 'ok', running: true, checking: 1 };
}));

router.get('/api/admin/booksource/check/status', eventHandler(() => {
  // 首次轮询后结束检测，便于用例观察"检测中→完成"的状态切换
  if (booksourceCheckRunning) {
    booksourceCheckPolls += 1;
    if (booksourceCheckPolls >= 1) booksourceCheckRunning = false;
  }
  return { err: 'ok', running: booksourceCheckRunning };
}));

// Network library (book sources)
router.get('/api/network/sources', eventHandler(() => {
  return { err: 'ok', items: [{ id: 1, name: '测试书源', group: '测试' }] };
}));

router.get('/api/network/categories', eventHandler(() => {
  return {
    err: 'ok',
    items: [
      { name: '玄幻', url: 'http://x.com/category/xuanhuan?page={{page}}' },
      { name: '都市', url: 'http://x.com/category/dushi?page={{page}}' },
    ],
  };
}));

// 网络书库搜索改为任务化：创建任务返回 task_id，前端轮询 status 拿结果
let lastSearchKey = '';
router.get('/api/network/search', eventHandler((event) => {
  const query = getQuery(event);
  lastSearchKey = query.key || '';
  return { err: 'ok', task_id: 'mock-task', total: 1 };
}));

router.get('/api/network/search/status', eventHandler(() => {
  return {
    err: 'ok',
    task_id: 'mock-task',
    total: 1,
    done: 1,
    finished: true,
    pending: [],
    partial: [],
    results: [
      {
        source_id: 1,
        source_name: '测试书源',
        books: [
          {
            name: `${lastSearchKey}的故事`,
            author: '测试作者',
            intro: '一段网络小说简介',
            cover_url: '',
            book_url: 'http://x.com/book/1',
          },
        ],
      },
    ],
  };
}));

router.get('/api/network/book', eventHandler(() => {
  return {
    err: 'ok',
    book: {
      name: '测试网络小说',
      author: '测试作者',
      kind: '玄幻',
      last_chapter: '第3章 大结局',
      intro: '这是一本用于测试的网络小说。',
      cover_url: '',
      book_url: 'http://x.com/book/1',
    },
    toc_url: 'http://x.com/book/1/toc',
  };
}));

router.get('/api/network/toc', eventHandler(() => {
  return {
    err: 'ok',
    serialize_status: 'finished',
    chapters: [
      { name: '第1章 惊蛰', url: 'http://x.com/c/1', is_vip: false, update_time: '' },
      { name: '第2章 小镇', url: 'http://x.com/c/2', is_vip: false, update_time: '' },
      { name: '第3章 大结局', url: 'http://x.com/c/3', is_vip: false, update_time: '' },
    ],
  };
}));

router.get('/api/network/content', eventHandler(() => {
  return { err: 'ok', title: '第1章 惊蛰', content: '这是正文第一段。\n这是正文第二段。' };
}));

// 保存到本地：返回 tag，前端按 tag 轮询；状态先 running（含 done/total）后 completed
router.post('/api/network/save', eventHandler(() => {
  saveStarted = true;
  saveStatusPolls = 0;
  return { err: 'ok', tag: 'online_save:1:http://x.com/book/1', msg: '已开始后台保存，完成后将通知您' };
}));

router.get('/api/network/save/status', eventHandler(() => {
  if (!saveStarted) {
    return { err: 'ok', found: false };
  }
  saveStatusPolls += 1;
  if (saveStatusPolls < 2) {
    return { err: 'ok', found: true, status: 'running', progress: 40, done: 40, total: 100, book_id: 0, error: '' };
  }
  return { err: 'ok', found: true, status: 'completed', progress: 100, done: 100, total: 100, book_id: 1, error: '' };
}));

// Theme API — return empty state so layout doesn't open an error dialog
router.get('/api/themes/active', eventHandler(() => ({
  err: 'ok',
  theme: listThemes().find(theme => theme.active) || null,
})));

router.get('/api/themes', eventHandler(() => ({
  err: 'ok',
  themes: listThemes(),
})));

router.post('/api/themes/activate', eventHandler(async (event) => {
  const body = await readBody(event);
  const name = (body?.name || '').trim();
  if (!name) {
    activeThemeName = '';
    return { err: 'ok', msg: '已恢复默认主题' };
  }
  const theme = listThemes().find(item => item.name === name);
  if (!theme) {
    return { err: 'not_found', msg: '主题不存在' };
  }
  activeThemeName = name;
  return { err: 'ok', msg: `已激活主题：${name}`, theme: { ...theme, active: true } };
}));

app.use(router.handler);

listen(toNodeListener(app), { hostname: '0.0.0.0', port: Number(process.env.PORT) || 8000 });
