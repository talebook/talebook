
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
let isLoggedIn = true;
let inviteMode = false;
let isInvited = true;
let demoMode = false;
let showNetworkLibrary = true;
let users = [];
let saveStarted = false;
let saveStatusPolls = 0;
let booksourceCheckRunning = false;
let booksourceCheckPolls = 0;
let pluginRuns = [];
let shelfBookIds = new Set();
let readingStateByBookId = new Map();
let annotationsByBookId = new Map();
let annotationPermissionDenied = false;
let annotationPartialRollback = false;
let wereadRunId = 500;
let wereadConfigured = false;
let wereadRuns = new Map();
let activeThemeName = '';
let audiobookPublishedEdition = null;
let audiobookJobs = [];
let audiobookJobPolls = 0;
let audiobookProgress = null;
let audiobookManagedEditions = [];
let audiobookCapacityOk = true;
let audiobookWorkspace = null;
let podcastTokenHint = '';
let importSettings = {
  scan_upload_path: '/mock/scan/dir',
  import_mode: 'copy',
  auto_watch_enabled: false,
  directory_check: {
    status: 'ok',
    path: '/mock/scan/dir',
    readable: true,
    writable: true,
    in_allowed_roots: true,
    supported_file_count: 2,
    msg: '目录可用。发现 2 个支持格式文件。'
  },
  watch_status: { state: 'off', queued: 0, running: 0, failed: 0, last_scan_at: null }
};

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

const accessControlEnvelope = () => {
  if (!isInstalled) return { err: 'not_installed', msg: 'System not installed' };
  if (inviteMode && !isInvited) return { err: 'not_invited' };
  return null;
};

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
  isLoggedIn = body?.loggedIn !== false;
  inviteMode = !!body?.inviteMode;
  isInvited = body?.invited !== false;
  demoMode = !!(body && body.demoMode);
  showNetworkLibrary = body?.showNetworkLibrary !== false;
  console.log('[Mock] isInstalled set to:', isInstalled);
  users = [];
  saveStarted = false;
  saveStatusPolls = 0;
  booksourceCheckRunning = false;
  booksourceCheckPolls = 0;
  pluginRuns = [];
  opdsServiceEnabled = true;
  pluginInstallations = pluginInstallations.map(item => ({ ...item, enabled: true }));
  pluginConnections = pluginInstallations
    .filter(item => ['talebook.source.opds', 'talebook.source.legado'].includes(item.plugin_key))
    .map(installation => mockPluginConnection(installation));
  shelfBookIds = new Set();
  readingStateByBookId = new Map();
  annotationsByBookId = new Map([[1, mockAnnotations(1)]]);
  annotationPermissionDenied = !!body?.annotationPermissionDenied;
  annotationPartialRollback = !!body?.annotationPartialRollback;
  wereadRunId = 500;
  wereadConfigured = false;
  wereadRuns = new Map();
  activeThemeName = builtinThemes.some(theme => theme.name === body?.activeTheme)
    ? body.activeTheme
    : '';
  audiobookPublishedEdition = null;
  audiobookJobs = [];
  audiobookJobPolls = 0;
  audiobookProgress = null;
  importSettings = {
    scan_upload_path: '/mock/scan/dir',
    import_mode: 'copy',
    auto_watch_enabled: false,
    directory_check: {
      status: 'ok',
      path: '/mock/scan/dir',
      readable: true,
      writable: true,
      in_allowed_roots: true,
      supported_file_count: 2,
      msg: '目录可用。发现 2 个支持格式文件。'
    },
    watch_status: { state: 'off', queued: 0, running: 0, failed: 0, last_scan_at: null }
  };
  const backupCount = Number(body?.audiobookBackupCount || 1);
  audiobookManagedEditions = body?.audiobookVersions
    ? [
        {
          ...audiobookEdition(),
          id: 2,
          status: 'ready',
          revision_number: 2,
          created_at: '2026-07-19T10:00:00',
          published_at: null,
        },
        ...Array.from({ length: backupCount }, (_, index) => ({
          ...audiobookEdition(),
          id: 3 + index,
          status: 'historical',
          revision_number: Math.max(1, backupCount - index),
          created_at: `2026-07-${String(17 - index).padStart(2, '0')}T10:00:00`,
        })),
      ]
    : [];
  if (body?.audiobookVersions || body?.audiobookPublished) audiobookPublishedEdition = audiobookEdition();
  audiobookWorkspace = workspacePayload();
  audiobookCapacityOk = body?.audiobookCapacityOk !== false;
  podcastTokenHint = '';
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

const mockAnnotations = (bookId) => [
  {
    id: 101,
    book_id: Number(bookId),
    annotation_type: 'highlight',
    is_private: true,
    can_edit: true,
    cfi: null,
    chapter: '第一章 雾中的来客',
    quote_text: '雾把远处的灯塔藏进了清晨。',
    content: '这是从微信读书导入的章节级笔记。',
    created_at: '2026-08-14T10:00:00',
    updated_at: '2026-08-15T11:30:00',
    sources: [{
      source_name: 'weread',
      source_connection_id: 'mock-account',
      source_annotation_id: 'weread-101',
      source_run_id: 'sample-run-1',
      source_position: 'chapter:1',
      source_sync_status: 'synced',
    }],
  },
  {
    id: 102,
    book_id: Number(bookId),
    annotation_type: 'note',
    is_private: true,
    can_edit: true,
    cfi: 'epubcfi(/6/4!/4/2/2)',
    chapter: '第二章 灯塔来信',
    quote_text: '信纸边缘留下了一圈盐粒。',
    content: 'Talebook 原生笔记，拥有精确定位。',
    created_at: '2026-08-15T09:00:00',
    updated_at: '2026-08-15T09:00:00',
    sources: [],
  },
  {
    id: 103,
    book_id: Number(bookId),
    annotation_type: 'chapter_comment',
    is_private: false,
    can_edit: false,
    cfi: null,
    chapter: '第一章 雾中的来客',
    quote_text: '',
    content: '另一位读者留下的公开章评。',
    author_name: '读者甲',
    created_at: '2026-08-15T12:00:00',
    updated_at: '2026-08-15T12:00:00',
    sources: [{
      source_name: 'readest',
      source_connection_id: 'public-feed',
      source_annotation_id: 'readest-103',
      source_run_id: 'public-run',
      source_sync_status: 'synced',
    }],
  },
];

const audiobookChapters = [
  {
    id: 101,
    number: 1,
    source_key: 'Text/chapter-1.xhtml',
    title: '第一章 雾中的来客',
    duration_ms: 4200,
    size_bytes: 8444,
    audio_url: '/media/audio/1/chapter/1.mp3',
    timeline_url: '/api/audio/1/chapter/1/timeline',
  },
  {
    id: 102,
    number: 2,
    source_key: 'Text/chapter-2.xhtml',
    title: '第二章 灯塔来信',
    duration_ms: 4600,
    size_bytes: 9244,
    audio_url: '/media/audio/1/chapter/2.mp3',
    timeline_url: '/api/audio/1/chapter/2/timeline',
  },
];

const audiobookEdition = (bookId = 1) => ({
  id: 1,
  book_id: Number(bookId),
  status: 'published',
  engine: 'edgetts',
  config: { speed: 'x1.0', revision_number: 1 },
  has_script: true,
  revision_number: 1,
  revision_of_edition_id: null,
  chapter_count: 2,
  completed_count: 2,
  duration_ms: 8800,
  size_bytes: 17688,
  created_at: '2026-07-18T10:00:00',
  published_at: '2026-07-18T10:03:00',
  chapters: audiobookChapters,
});

const recentBook = (bookId) => {
  const data = readJson('api_recent.json');
  return (data?.books || []).find(book => Number(book.id) === Number(bookId));
};

const audiobookBook = (bookId = 1) => {
  const numericId = Number(bookId) || 1;
  const recent = recentBook(numericId);
  if (recent) return recent;
  const data = readJson(`api_book_${numericId}.json`);
  const book = data?.book;
  return book || {
    id: numericId,
    title: `Mock Book ${numericId}`,
    author: 'Mock Author',
    authors: ['Mock Author'],
    available_formats: ['epub'],
    files: [{ format: 'epub' }],
    img: `/get/cover/${numericId}.jpg`,
    thumb: `/get/thumb_60x80/${numericId}.jpg`,
  };
};

const audiobookBookFormats = (book) => {
  const values = book.available_formats?.length
    ? book.available_formats
    : (book.files || []).map(item => item.format);
  return new Set((values || []).map(item => String(item).toUpperCase()));
};

const audiobookJobPlan = (job) => {
  const completed = job.status === 'completed';
  const generating = job.status === 'generating' || job.status === 'finalizing';
  const chapters = [
    {
      number: 1,
      title: '第一章 雾中的来客',
      status: completed ? 'completed' : (generating ? 'generating' : 'pending'),
      total_segments: 2,
      completed_segments: completed ? 2 : (generating ? 1 : 0),
      cache_hits: completed ? 1 : 0,
      resumed: false,
      duration_ms: completed ? 4600 : 0,
      size_bytes: completed ? 9216 : 0,
    },
    {
      number: 2,
      title: '第二章 灯塔来信',
      status: completed ? 'completed' : 'pending',
      total_segments: 1,
      completed_segments: completed ? 1 : 0,
      cache_hits: 0,
      resumed: completed,
      duration_ms: completed ? 4200 : 0,
      size_bytes: completed ? 8472 : 0,
    },
  ];
  const chaptersCompleted = completed ? 2 : 0;
  const segmentsCompleted = completed ? 3 : (generating ? 1 : 0);
  const reviewStatus = job.mode === 'quick' ? 'skipped' : (job.data.confirmed ? 'done' : (job.status === 'awaiting_review' ? 'current' : 'pending'));
  const phaseStatus = (key) => {
    if (key === 'queue') return job.status === 'queued' ? 'current' : 'done';
    if (key === 'inspect') return job.status === 'queued' ? 'pending' : 'done';
    if (key === 'review') return reviewStatus;
    if (key === 'generate') return completed ? 'done' : (generating ? 'current' : 'pending');
    if (key === 'finalize') return completed ? 'done' : (job.status === 'finalizing' ? 'current' : 'pending');
    return completed ? 'done' : 'pending';
  };
  const phases = ['queue', 'inspect', 'review', 'generate', 'finalize', 'complete'].map(key => ({
    key,
    status: phaseStatus(key),
    started_at: key === 'queue' || phaseStatus(key) !== 'pending' ? '2026-07-18T10:00:00' : null,
    completed_at: ['done', 'skipped'].includes(phaseStatus(key)) ? '2026-07-18T10:03:00' : null,
    summary: key === 'queue'
      ? { attempts: 1 }
      : key === 'inspect'
        ? { chapters_total: 2 }
        : key === 'review'
          ? { mode: job.mode }
          : key === 'generate'
            ? { chapters_total: 2, chapters_completed: chaptersCompleted, segments_total: 3, segments_completed: segmentsCompleted, cache_hits: completed ? 1 : 0 }
            : { chapters_completed: chaptersCompleted },
  }));
  return {
    version: 1,
    detailed: true,
    overall_percent: Math.round(job.progress * 100),
    phases,
    summary: {
      chapters_total: 2,
      chapters_completed: chaptersCompleted,
      segments_total: 3,
      segments_completed: segmentsCompleted,
      cache_hits: completed ? 1 : 0,
      attempts: 1,
    },
    chapters,
  };
};

const audiobookJobPayload = (job) => {
  const book = audiobookBook(job.book_id);
  return {
    ...job,
    book: {
      id: book.id,
      title: book.title,
      author: book.author || (book.authors || []).join(', '),
      img: book.img,
      thumb: book.thumb || book.img,
    },
    plan: audiobookJobPlan(job),
  };
};

const makeSilentWav = () => {
  const sampleRate = 8000;
  const samples = sampleRate * 5;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  return bytes;
};

const silentWav = makeSilentWav();

router.get('/api/audios/home', eventHandler(() => {
  if (!audiobookPublishedEdition) {
    return { err: 'ok', enabled: true, continue_listening: [], recent: [], completed: [] };
  }
  const book = { ...audiobookBook(), edition: audiobookPublishedEdition, listening_progress: audiobookProgress };
  return {
    err: 'ok',
    enabled: true,
    continue_listening: audiobookProgress ? [book] : [],
    recent: [book],
    completed: [],
  };
}));

router.get('/api/book/:bookId/audios', eventHandler((event) => {
  const bookId = Number(getRouterParam(event, 'bookId'));
  const book = audiobookBook(bookId);
  const compatible = ['EPUB', 'TXT'].some(format => audiobookBookFormats(book).has(format));
  const publishedEdition = audiobookPublishedEdition && Number(audiobookPublishedEdition.book_id) === bookId
    ? audiobookPublishedEdition
    : null;
  return {
    err: 'ok',
    book,
    editions: [...(publishedEdition ? [publishedEdition] : []), ...audiobookManagedEditions],
    backup_retention: 3,
    generation: {
      enabled: true,
      compatible,
      permitted: true,
      can_generate: audiobookCapacityOk && compatible,
      can_manage: true,
      reason: compatible ? (audiobookCapacityOk ? '' : 'disk.low') : 'format.not_supported',
      health: compatible ? { ok: true, version: 'voicebook-tool 0.4.0', reason: '' } : null,
      capacity: { ok: audiobookCapacityOk, free_bytes: audiobookCapacityOk ? 10737418240 : 1073741824, minimum_bytes: 5368709120 },
      engines: ['edgetts', 'qwen3tts'],
      quality_options: ['standard'],
    },
  };
}));

router.delete('/api/book/:bookId/audios', eventHandler(() => {
  const activeJobs = audiobookJobs.filter(item => ['queued', 'inspecting', 'awaiting_review', 'generating', 'finalizing'].includes(item.status));
  const editions = (audiobookPublishedEdition ? 1 : 0) + audiobookManagedEditions.length;
  const chapters = audiobookPublishedEdition ? audiobookChapters.length : 0;
  const jobs = audiobookJobs.length;
  const progress = audiobookProgress ? 1 : 0;
  audiobookPublishedEdition = null;
  audiobookJobs = [];
  audiobookJobPolls = 0;
  audiobookProgress = null;
  audiobookManagedEditions = [];
  return {
    err: 'ok',
    deleted: {
      editions,
      chapters,
      jobs,
      progress,
      bookmarks: 0,
      sessions: 0,
      daily_stats: 0,
      podcast_audits: 0,
      podcast_preferences: 0,
      active_jobs_cancelled: activeJobs.length,
    },
  };
}));

router.post('/api/book/:bookId/audio-jobs', eventHandler(async (event) => {
  const body = await readBody(event);
  const bookId = Number(getRouterParam(event, 'bookId'));
  const book = audiobookBook(bookId);
  if (!['EPUB', 'TXT'].some(format => audiobookBookFormats(book).has(format))) {
    return { err: 'format.not_supported', msg: '生成有声书需要 EPUB 或 TXT 格式' };
  }
  const duplicate = audiobookJobs.find(item => (
    Number(item.book_id) === bookId && ['queued', 'inspecting', 'awaiting_review', 'generating', 'finalizing'].includes(item.status)
  ));
  if (duplicate) return { err: 'ok', job: duplicate, deduplicated: true };
  const job = {
    id: 1,
    book_id: bookId,
    edition_id: 1,
    creator_id: 1,
    mode: body?.mode || 'quick',
    status: 'queued',
    phase: 'QUEUED',
    priority: 0,
    config: { engine: body?.engine || 'edgetts', speed: body?.speed || 'x1.0' },
    chapter_selection: body?.chapters || '',
    progress: 0,
    data: {},
    created_at: '2026-07-18T10:00:00',
    updated_at: '2026-07-18T10:00:00',
  };
  audiobookJobs = [job];
  audiobookJobPolls = 0;
  return { err: 'ok', job, deduplicated: false };
}));

router.get('/api/audio-jobs', eventHandler(() => {
  if (audiobookJobs.length) {
    audiobookJobPolls += 1;
    const job = audiobookJobs[0];
    if (job.mode === 'advanced' && audiobookJobPolls >= 2 && !job.data.confirmed) {
      job.status = 'awaiting_review';
      job.phase = 'AWAITING_REVIEW';
      job.progress = 0.2;
      job.script_available = true;
    } else if ((job.mode === 'quick' || job.data.confirmed) && audiobookJobPolls >= 2) {
      job.status = 'completed';
      job.phase = 'COMPLETED';
      job.progress = 1;
      audiobookPublishedEdition ||= audiobookEdition(job.book_id);
      job.script_available = true;
      if (job.data.revision) {
        const candidate = audiobookManagedEditions.find(item => item.id === job.edition_id);
        if (candidate) candidate.status = 'ready';
      }
    } else if (job.status === 'queued') {
      job.status = 'generating';
      job.phase = 'GENERATING';
      job.progress = 0.35;
    }
  }
  return { err: 'ok', jobs: audiobookJobs.map(audiobookJobPayload) };
}));

router.patch('/api/audio-job/:jobId', eventHandler(async (event) => {
  const body = await readBody(event);
  const job = audiobookJobs[0];
  if (!job) return { err: 'not_found' };
  if (body?.action === 'cancel') {
    job.status = 'cancelled';
    job.phase = 'CANCELLED';
  } else if (body?.action === 'retry') {
    job.status = 'queued';
    job.phase = 'QUEUED';
    audiobookJobPolls = 0;
  }
  return { err: 'ok', job };
}));

const workspacePayload = () => ({
  revision: `mock-${audiobookJobPolls}`,
  characters: [
    { name: '旁白', position: '旁白', type: '人类', gender: '男', age: '中年', region: '中国', description: '沉稳', speed: 'x1.0', voice_overrides: '' },
    { name: '林夏', position: '女主角', type: '人类', gender: '女', age: '青年', region: '城市', description: '清亮', speed: 'x1.0', voice_overrides: '' },
  ],
  chapters: [
    { number: 1, title: '第一章 雾中的来客', volume: '', lines: ['[旁白] 海雾漫过码头。', '[林夏] 那封信终于来了。'] },
    { number: 2, title: '第二章 灯塔来信', volume: '', lines: ['[旁白] 灯塔在远处亮起。'] },
  ],
  editable: true,
  normalization: {
    version: 1,
    chapters_before: 4,
    chapters_after: 2,
    segments_before: 2,
    segments_after: 4,
    removed_chapter_count: 2,
    renamed_chapter_count: 2,
    removed_noncontent_block_count: 8,
    locator_unmapped_count: 0,
  },
  revision_info: {},
});

router.get('/api/audio-job/:jobId/workspace', eventHandler(() => ({
  err: 'ok',
  workspace: { ...audiobookWorkspace, editable: audiobookJobs[0]?.status === 'awaiting_review' },
  job: audiobookJobs[0],
})));
router.patch('/api/audio-job/:jobId/workspace', eventHandler(async (event) => {
  const body = await readBody(event);
  if (body?.kind === 'chapter' && String(body.text || '').includes('[未知角色]')) {
    return { err: 'script.invalid', msg: '章节脚本校验失败', errors: [{ line: 1, message: '未定义角色：未知角色' }] };
  }
  if (body?.kind === 'chapter') {
    const chapter = audiobookWorkspace.chapters.find(item => item.number === Number(body.chapter_number));
    chapter.lines = String(body.text || '').split('\n').filter(Boolean);
  }
  audiobookWorkspace.revision = `mock-${Date.now()}`;
  return { err: 'ok', workspace: audiobookWorkspace };
}));
router.post('/api/audio-job/:jobId/confirm', eventHandler(async (event) => {
  const body = await readBody(event);
  const job = audiobookJobs[0];
  job.status = 'queued';
  job.phase = 'QUEUED';
  job.data = {
    ...job.data,
    confirmed: true,
    revision: job.data.revision ? { ...job.data.revision, scope: body?.scope || 'book', chapter_number: body?.chapter_number } : undefined,
  };
  job.chapter_selection = body?.scope === 'chapter' ? String(body.chapter_number) : '';
  audiobookJobPolls = 0;
  return { err: 'ok', job };
}));

router.post('/api/audio/:editionId/revisions', eventHandler((event) => {
  const sourceId = Number(getRouterParam(event, 'editionId'));
  const editionId = Math.max(3, ...audiobookManagedEditions.map(item => item.id)) + 1;
  const edition = {
    ...audiobookEdition(),
    id: editionId,
    status: 'draft',
    revision_number: Math.max(
      audiobookPublishedEdition?.revision_number || 1,
      ...audiobookManagedEditions.map(item => item.revision_number || 1),
    ) + 1,
    revision_of_edition_id: sourceId,
    created_at: '2026-08-03T10:00:00',
    published_at: null,
  };
  edition.config = { ...edition.config, revision_number: edition.revision_number, revision_of_edition_id: sourceId };
  audiobookManagedEditions.unshift(edition);
  const job = {
    id: 1,
    book_id: 1,
    edition_id: editionId,
    creator_id: 1,
    mode: 'advanced',
    status: 'awaiting_review',
    phase: 'AWAITING_REVIEW',
    priority: 0,
    config: edition.config,
    chapter_selection: '',
    progress: 0.2,
    script_available: true,
    data: { revision: { source_edition_id: sourceId, structural_changed: false } },
    created_at: '2026-08-03T10:00:00',
    updated_at: '2026-08-03T10:00:00',
  };
  audiobookJobs = [job];
  audiobookJobPolls = 0;
  audiobookWorkspace = {
    ...workspacePayload(),
    normalization: {},
    revision_info: job.data.revision,
  };
  return { err: 'ok', edition, job };
}));

router.delete('/api/book/:bookId/audio-backups', eventHandler(() => {
  const historical = audiobookManagedEditions.filter(item => item.status === 'historical');
  const deleted = historical.slice(3);
  const deletedIds = new Set(deleted.map(item => item.id));
  audiobookManagedEditions = audiobookManagedEditions.filter(item => !deletedIds.has(item.id));
  return { err: 'ok', retention: 3, deleted_count: deleted.length, deleted_edition_ids: [...deletedIds], freed_bytes: deleted.length * 17688 };
}));

router.get('/api/audio/:editionId', eventHandler(() => ({
  err: 'ok',
  manifest: audiobookPublishedEdition || audiobookEdition(),
  progress: audiobookProgress,
})));
router.patch('/api/audio/:editionId', eventHandler(async (event) => {
  const body = await readBody(event);
  if (!['publish', 'rollback', 'delete'].includes(body?.action)) return { err: 'params.invalid' };
  const editionId = Number(getRouterParam(event, 'editionId'));
  const edition = audiobookManagedEditions.find(item => item.id === editionId);
  audiobookManagedEditions = audiobookManagedEditions.filter(item => item.id !== editionId);
  if (edition && body.action !== 'delete') {
    if (audiobookPublishedEdition) audiobookManagedEditions.unshift({ ...audiobookPublishedEdition, status: 'historical' });
    audiobookPublishedEdition = { ...edition, status: 'published', published_at: '2026-08-03T10:10:00' };
  }
  return { err: 'ok', edition: edition ? { ...edition, status: body.action === 'delete' ? 'deleted' : 'published' } : (audiobookPublishedEdition || audiobookEdition()) };
}));
router.get('/api/audio/:editionId/chapter/:number/timeline', eventHandler((event) => {
  const number = Number(getRouterParam(event, 'number'));
  return {
    err: 'ok',
    timeline: {
      chapter_number: number,
      segments: [
        { id: `c${number}-s1`, start_ms: 0, end_ms: 2100, text: '海雾漫过码头，灯塔在远处明灭。', locator: { href: `Text/chapter-${number}.xhtml`, css_selector: '#p-1' } },
        { id: `c${number}-s2`, start_ms: 2100, end_ms: 4200, text: '那封等待多年的信，终于到了。', locator: { href: `Text/chapter-${number}.xhtml`, css_selector: '#p-2' } },
      ],
    },
  };
}));
router.post('/api/audio/:editionId/sessions', eventHandler(() => ({ err: 'ok', session_id: 'abcdef123456' })));
router.patch('/api/audio-session/:sessionId', eventHandler(async (event) => {
  const body = await readBody(event);
  audiobookProgress = {
    chapter_id: body.chapter_id,
    position_ms: body.position_ms,
    segment_id: body.segment_id,
    listened_ms: body.listened_delta_ms,
    finished: body.completed,
    version: Number(body.version || 0) + 1,
  };
  return { err: 'ok', version: audiobookProgress.version };
}));

router.get('/api/audio-voices', eventHandler(() => ({
  err: 'ok',
  catalog: {
    scene_definitions: [{ id: 'narration', name: '旁白', text: '夜色渐深，灯火亮了起来。' }],
    voices: [
      { engine: 'edgetts', voice_id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', preview_available: false },
      { engine: 'edgetts', voice_id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', preview_available: false },
    ],
  },
})));

router.get('/api/me/podcast-subscription', eventHandler(() => ({
  err: 'ok',
  subscription: podcastTokenHint ? { active: true, token_hint: podcastTokenHint } : null,
})));
router.post('/api/me/podcast-subscription', eventHandler(() => {
  podcastTokenHint = 'e2e123';
  return { err: 'ok', feed_url: 'http://127.0.0.1:8080/podcast/v1/mock-token/feed.xml', token_hint: podcastTokenHint };
}));
router.delete('/api/me/podcast-subscription', eventHandler(() => {
  podcastTokenHint = '';
  return { err: 'ok' };
}));

router.get('/media/audio/:editionId/chapter/:number.mp3', eventHandler((event) => {
  const range = event.node.req.headers.range;
  const headers = { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes' };
  if (!range) return new Response(silentWav, { status: 200, headers: { ...headers, 'Content-Length': String(silentWav.length) } });
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  const start = match ? Number(match[1]) : 0;
  const end = match && match[2] ? Math.min(Number(match[2]), silentWav.length - 1) : silentWav.length - 1;
  const body = silentWav.subarray(start, end + 1);
  return new Response(body, {
    status: 206,
    headers: { ...headers, 'Content-Length': String(body.length), 'Content-Range': `bytes ${start}-${end}/${silentWav.length}` },
  });
}));

router.get('/api/user/info', eventHandler(() => accessControlEnvelope() || ({
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
    show_network_library: showNetworkLibrary,
    allow: { register: true, download: true, push: true, read: true },
    upload: { chunk_enabled: true, chunk_threshold: 8 * 1024 * 1024, chunk_size: 4 * 1024 * 1024 },
    demo_mode: demoMode
  },
  user: {
    is_login: isLoggedIn,
    is_admin: isLoggedIn,
    nickname: isLoggedIn ? 'Admin' : '',
    avatar: '',
    kindle_email: isLoggedIn ? 'test@kindle.com' : ''
  }
})));

router.get('/api/user/sign_out', eventHandler(() => {
  isLoggedIn = false;
  return { err: 'ok', msg: '你已成功退出登录。' };
}));

router.get('/api/captcha/config', eventHandler(() => ({
  err: 'ok',
  config: { enabled: false, scenes: {} },
})));

router.get('/api/user/messages', eventHandler(() => accessControlEnvelope() || ({
  err: 'ok',
  total: 0,
  messages: []
})));

const mockBookCover = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="240" viewBox="0 0 180 240">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#23384a"/><stop offset="1" stop-color="#bd752e"/></linearGradient></defs>
  <rect width="180" height="240" rx="10" fill="url(#g)"/><path d="M22 28h136M22 210h136" stroke="#f7e8cd" stroke-width="2" opacity=".7"/>
  <text x="90" y="116" text-anchor="middle" fill="#fff9ef" font-family="serif" font-size="27">百年孤独</text><text x="90" y="148" text-anchor="middle" fill="#f7e8cd" font-family="sans-serif" font-size="12">TALEBOOK</text>
</svg>`;

router.get('/get/cover/:id', eventHandler(() => (
  new Response(mockBookCover, { headers: { 'Content-Type': 'image/svg+xml' } })
)));

router.get('/get/thumb_60x80/:id', eventHandler(() => (
  new Response(mockBookCover, { headers: { 'Content-Type': 'image/svg+xml' } })
)));

router.get('/api/index', eventHandler(() => {
  console.log('[Mock] GET /api/index, isInstalled:', isInstalled);
  const accessError = accessControlEnvelope();
  if (accessError) return accessError;
  return readJson('api_index.json') || { err: 'error', msg: 'mock not found' };
}));

router.get('/api/welcome', eventHandler(() => {
  if (!inviteMode || isInvited) return { err: 'free', msg: 'No invitation required' };
  return { err: 'ok', msg: '', welcome: '请输入访问码' };
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
    SHOW_NETWORK_LIBRARY: showNetworkLibrary,
    SOCIALS: [],
    FRIENDS: [],
    smtp_server: 'smtp.example.com',
    smtp_username: 'user',
    smtp_password: 'password',
    smtp_encryption: 'SSL',
    AUDIOBOOK_BACKUP_RETENTION: 3,
    META_ALL_SOURCES: ['douban_v2', 'baidu', 'xinhua', 'booksource', 'ai'],
    META_SELECTED_SOURCES: ['douban_v2', 'baidu', 'booksource']
  }
})));

router.post('/api/admin/settings', eventHandler(async (event) => {
  const body = await readBody(event);
  if (body?.SHOW_NETWORK_LIBRARY !== undefined) {
    showNetworkLibrary = body.SHOW_NETWORK_LIBRARY !== false;
  }
  return { err: 'ok', msg: 'Settings saved' };
}));

router.post('/api/admin/testmail', eventHandler(() => ({
  err: 'ok',
  msg: 'Test email sent'
})));

router.get('/api/admin/log', eventHandler((event) => {
  const query = getQuery(event);
  const lines = Number(query.lines) || 500;
  const allLines = [
    '[I 260101 12:00:00 admin:1] mock info line',
    '[W 260101 12:00:01 admin:2] mock warning line',
    '[E 260101 12:00:02 admin:3] mock error line'
  ];
  return {
    err: 'ok',
    lines: allLines.slice(0, lines),
    total: allLines.length,
    file: '/data/log/talebook.log'
  };
}));

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
        total: 2,
        items: [
          {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            is_admin: true,
            is_active: true,
            is_demo: false,
            access_time: '2023-01-01 12:00:00',
            create_time: '2023-01-01 12:00:00',
            extra: {
              login_ip: '127.0.0.1',
              visit_history: Array(10).fill('mock-book-id'),
              read_history: Array(1).fill('mock-book-id'),
              download_history: Array(3).fill('mock-book-id'),
              upload_history: Array(24).fill('mock-book-id')
            },
            can_login: true,
            can_upload: true,
            can_read: true
          },
          {
            id: 2,
            username: 'demo',
            email: 'demo@example.com',
            is_admin: false,
            is_active: true,
            is_demo: true,
            access_time: '2023-01-01 12:00:00',
            create_time: '2023-01-01 12:00:00',
            extra: {},
            can_login: true,
            can_upload: false,
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

router.get('/api/book/:id/refer', eventHandler(() => {
  const frames = [
    { err: 'ok' },
    {
      title: 'Mock Metadata Result',
      author: 'Mock Author',
      author_sort: 'Mock Author',
      source: 'Online Source A',
      website: 'https://example.com/book/1',
      cover_url: '',
      provider_key: 'BookSource',
      provider_value: 'signed-token',
      comments: 'Mock metadata introduction'
    },
    {
      event: 'summary',
      failures: [{ source: 'Online Source B', code: 'timeout', message: '查询超时' }],
      total: 2,
      completed: 1
    }
  ];
  return new Response(frames.map(frame => JSON.stringify(frame)).join('\n') + '\n', {
    headers: { 'Content-Type': 'application/x-ndjson' }
  });
}));

// Admin Imports
app.use('/api/admin/scan/list', eventHandler(() => ({
  err: 'ok',
  scan_dir: importSettings.scan_upload_path,
  import_mode: importSettings.import_mode,
  auto_watch_enabled: importSettings.auto_watch_enabled,
  watch_status: importSettings.watch_status,
  summary: { done: 5, todo: 2, failed: 0 },
  total: 2,
  items: [
    { id: 1, status: 'new', path: '/books/new1.epub', title: 'New Book 1', author: 'Author 1', create_time: '2023-01-02' },
    { id: 2, status: 'exist', path: '/books/exist.epub', title: 'Existing Book', author: 'Author 2', create_time: '2023-01-01' }
  ]
})));

router.get('/api/admin/import/settings', eventHandler(() => ({
  err: 'ok',
  settings: importSettings
})));

router.post('/api/admin/import/settings', eventHandler(async (event) => {
  const body = await readBody(event);
  importSettings = {
    ...importSettings,
    scan_upload_path: body.scan_upload_path,
    import_mode: body.import_mode,
    auto_watch_enabled: !!body.auto_watch_enabled,
    directory_check: {
      status: 'ok',
      path: body.scan_upload_path,
      readable: true,
      writable: body.scan_upload_path !== '/mock/read-only',
      in_allowed_roots: true,
      supported_file_count: 3,
      msg: body.scan_upload_path === '/mock/read-only'
        ? '目录不可写，仍可读取导入；剪切模式将不可用。'
        : '目录可用。发现 3 个支持格式文件。'
    },
    watch_status: body.auto_watch_enabled
      ? { state: 'scanning', queued: 0, running: 0, failed: 0, last_scan_at: null }
      : { state: 'off', queued: 0, running: 0, failed: 0, last_scan_at: null }
  };
  return { err: 'ok', msg: '导入设置已保存', settings: importSettings };
}));

router.post('/api/admin/import/directory/check', eventHandler(async (event) => {
  const body = await readBody(event);
  const targetPath = body.path || '/mock/scan/dir';
  if (targetPath === '/mock/missing') {
    return {
      err: 'ok',
      msg: '目录不存在，请检查路径或先在服务器上创建目录。',
      directory: {
        status: 'error',
        path: targetPath,
        readable: false,
        writable: false,
        in_allowed_roots: true,
        supported_file_count: 0,
        msg: '目录不存在，请检查路径或先在服务器上创建目录。'
      }
    };
  }
  return {
    err: 'ok',
    msg: targetPath === '/mock/read-only'
      ? '目录不可写，仍可读取导入；剪切模式将不可用。'
      : '目录可用。发现 3 个支持格式文件。',
    directory: {
      status: targetPath === '/mock/read-only' ? 'warning' : 'ok',
      path: targetPath,
      readable: true,
      writable: targetPath !== '/mock/read-only',
      in_allowed_roots: true,
      supported_file_count: 3,
      msg: targetPath === '/mock/read-only'
        ? '目录不可写，仍可读取导入；剪切模式将不可用。'
        : '目录可用。发现 3 个支持格式文件。'
    }
  };
}));

router.get('/api/admin/import/directory/list', eventHandler((event) => {
  const query = getQuery(event);
  const currentPath = query.path || '/mock/scan/dir';
  return {
    err: 'ok',
    path: currentPath,
    parent: currentPath === '/mock/scan/dir' ? '' : '/mock/scan/dir',
    allowed_roots: ['/mock/scan/dir'],
    items: [
      { name: 'incoming', path: '/mock/scan/dir/incoming', readable: true, writable: true, is_symlink: false, in_allowed_roots: true },
      { name: 'read-only', path: '/mock/read-only', readable: true, writable: false, is_symlink: false, in_allowed_roots: true }
    ]
  };
}));

router.get('/api/admin/import/watch/status', eventHandler(() => ({
  err: 'ok',
  watch_status: importSettings.watch_status
})));

router.post('/api/admin/scan/run', eventHandler(() => ({
  err: 'ok',
  msg: 'Scan started'
})));

router.get('/api/admin/scan/status', eventHandler(() => ({
  err: 'ok',
  status: { new: 0 },
  summary: { done: 5, todo: 2, failed: 0 }
})));

router.post('/api/admin/import/run', eventHandler(() => ({
  err: 'ok',
  msg: 'Import started'
})));

router.get('/api/admin/import/status', eventHandler(() => ({
  err: 'ok',
  status: { ready: 0 },
  summary: { done: 6, todo: 1, failed: 0 }
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

const libraryFilterItems = {
  publisher: Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    name: `测试出版社${index + 1}`,
    count: 120 - index,
  })),
  author: Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    name: `测试作者${index + 1}`,
    count: 120 - index,
  })),
  tag: Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    name: `测试标签${index + 1}`,
    count: 120 - index,
  })),
  format: [
    { id: 'EPUB', name: 'EPUB', count: 96 },
    { id: 'PDF', name: 'PDF', count: 18 },
    { id: 'MOBI', name: 'MOBI', count: 6 },
  ],
};

for (const filter of ['publisher', 'author', 'tag', 'format']) {
  router.get(`/api/${filter}`, eventHandler(() => ({
    err: 'ok',
    items: libraryFilterItems[filter],
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

router.get('/api/user/devices', eventHandler(() => {
  const defaultPorts = { boox: 8085 };
  const deviceTypes = pluginInstallations
    .filter(installation => installation.enabled && installation.status === 'active')
    .filter(installation => installation.definition.capabilities.includes('integrations.push'))
    .map((installation) => {
      const value = installation.definition.ui.device_type;
      return {
        text: installation.definition.name,
        value,
        default_port: defaultPorts[value] || 12121,
      };
    });
  return { err: 'ok', devices: [], device_types: deviceTypes };
}));

// The book detail page probes TXT parsing state for every format. Keep the
// mock response successful so that this background probe does not open the
// application's global error dialog during unrelated browser flows.
router.get('/api/book/txt/init', eventHandler(() => ({
  err: 'ok',
  msg: '未解析',
})));

router.get('/api/book/:id/annotations', eventHandler((event) => {
  if (annotationPermissionDenied) return { err: 'params.book.invalid', msg: '无权访问' };
  const bookId = Number(getRouterParam(event, 'id'));
  const query = getQuery(event);
  let annotations = annotationsByBookId.get(bookId) || [];
  if (query.source_name) {
    annotations = annotations.filter(annotation => {
      if (query.source_name === 'talebook') return !annotation.sources.length;
      return annotation.sources.some(source => source.source_name === query.source_name);
    });
  }
  return { err: 'ok', annotations };
}));

router.delete('/api/book/:id/annotations/:annotationId', eventHandler((event) => {
  const bookId = Number(getRouterParam(event, 'id'));
  const annotationId = Number(getRouterParam(event, 'annotationId'));
  const annotations = annotationsByBookId.get(bookId) || [];
  const annotation = annotations.find(item => item.id === annotationId);
  if (!annotation?.can_edit) return { err: 'annotation.not_found', msg: '笔记不存在' };
  annotationsByBookId.set(bookId, annotations.filter(item => item.id !== annotationId));
  return { err: 'ok', deleted: 1 };
}));

router.delete('/api/annotations', eventHandler((event) => {
  const query = getQuery(event);
  const bookId = Number(query.book_id);
  const annotations = annotationsByBookId.get(bookId) || [];
  let deleted = 0;
  for (const annotation of annotations) {
    annotation.sources = annotation.sources.filter(source => {
      const matches = source.source_name === query.source_name
        && source.source_connection_id === String(query.source_connection_id || '')
        && (!query.source_run_id || source.source_run_id === query.source_run_id);
      if (matches && (!annotationPartialRollback || deleted === 0)) {
        deleted += 1;
        return false;
      }
      return true;
    });
  }
  return { err: 'ok', sources_deleted: deleted, annotations_deleted: 0 };
}));

const wereadConnection = () => ({
  id: 88,
  installation_id: 6,
  owner_type: 'user',
  owner_id: 1,
  role: 'default',
  name: '微信读书',
  enabled: true,
  secret: { configured: wereadConfigured, mask: wereadConfigured ? '••••test' : '' },
});

router.post('/api/plugins/connections', eventHandler(async (event) => {
  const body = await readBody(event);
  if (body?.plugin_key !== 'talebook.combo.weread') return { err: 'plugin.not_found', msg: 'plugin not found' };
  if (body?.credentials?.api_key) wereadConfigured = true;
  return { err: 'ok', connection: wereadConnection() };
}));

router.get('/api/plugins/talebook.combo.weread', eventHandler(() => ({
  err: 'ok',
  plugin: { plugin_key: 'talebook.combo.weread', extra_features: {} },
  connections: wereadConfigured ? [wereadConnection()] : [],
  runs: [...wereadRuns.values()].map(value => value.run),
})));

router.get('/api/plugins/tools/books', eventHandler(() => ({
  err: 'ok',
  books: [{ id: 1, title: '测试书', authors: ['测试作者'], formats: ['EPUB', 'TXT'] }],
})));

router.post('/api/plugins/:pluginKey/features/:action', eventHandler(async (event) => {
  const pluginKey = getRouterParam(event, 'pluginKey');
  const action = getRouterParam(event, 'action');
  if (pluginKey !== 'talebook.combo.weread') return { err: 'plugin.not_found', msg: 'plugin not found' };
  const body = await readBody(event);
  if (body?.credentials?.api_key) wereadConfigured = true;
  const data = {
    search: {
      hasMore: 0,
      results: [{ title: '电子书', books: [{ bookInfo: { bookId: '3300045871', title: '活着', author: '余华', newRating: 920, deepLink: 'weread://bookDetail?bookId=3300045871' } }] }],
    },
    shelf: {
      books: [{ bookId: '3300045871', title: '活着', author: '余华', finishReading: 1, secret: 0 }],
      albums: [{ albumInfo: { albumId: 'audio-1', name: '三体广播剧', authorName: '刘慈欣', finishStatus: '已完结' }, albumInfoExtra: { secret: 1 } }],
      mp: { show: 1 },
    },
    statistics: { totalReadTime: 7260, readDays: 4, dayAverageReadTime: 1815, readStat: [{ stat: '读过', counts: '3本' }] },
    notebooks: { totalBookCount: 1, totalNoteCount: 3, books: [{ bookId: '3300045871', book: { title: '活着', author: '余华' }, noteCount: 1, reviewCount: 1, bookmarkCount: 1 }] },
    book_info: { bookId: '3300045871', title: '活着', author: '余华', publisher: '作家出版社', intro: '关于活着本身的故事。' },
    chapters: { chapters: [{ chapterUid: 12, title: '第一章' }] },
    progress: { book: { progress: 68, recordReadingTime: 3600 } },
    highlights: { updated: [{ bookmarkId: 'b1', markText: '人是为活着本身而活着的' }] },
    my_reviews: { reviews: [{ reviewId: 'r1', review: { content: '这句话值得反复读' } }] },
    popular_highlights: { items: [{ bookmarkId: 'p1', chapterUid: 12, range: '10-20', markText: '最初我们来到这个世界', totalCount: 128 }] },
    underline_stats: { underlines: [{ range: '10-20', count: 128, score: 99 }] },
    highlight_reviews: { reviews: [{ range: '10-20', pageReviews: [{ reviewId: 'thought-1', review: { content: '这句话很有力量', author: { name: '读者乙' } } }] }] },
    review_detail: { reviewId: 'thought-1', review: { content: '这句话很有力量', author: { name: '读者乙' } } },
    public_reviews: { reviews: [{ review: { reviewId: 'pr1', review: { content: '很有力量的一本书', author: { name: '读者甲' } } } }] },
    recommendations: { books: [{ bookId: 'book-2', title: '许三观卖血记', author: '余华', reason: '相似主题' }] },
    similar: { booksimilar: { books: [{ book: { bookInfo: { bookId: 'book-3', title: '兄弟', author: '余华' } } }] } },
    friends_reading: { items: [{ book: { bookId: 'book-4', title: '三体', author: '刘慈欣' } }] },
  }[action];
  if (!data) return { err: 'feature.not_found', msg: 'feature not found' };
  return {
    err: 'ok',
    connection: wereadConnection(),
    data,
  };
}));

router.post('/api/plugins/connections/:id/:action', eventHandler(async (event) => {
  const body = await readBody(event);
  const action = getRouterParam(event, 'action');
  wereadRunId += 1;
  let run = { id: wereadRunId, connection_id: 88, action, status: 'succeeded', counts: { fetched: 0 } };
  let items = [];
  if (action === 'preview') {
    run = { ...run, status: 'failed', counts: { fetched: 2, conflicts: 2 } };
    items = [{
        external_id: 'weread:3300045871:bookmark:b1',
        entity_type: 'annotation',
        status: 'conflict',
        data: {
          source_book_id: '3300045871',
          book: { provider_id: '3300045871', title: '活着', author: '余华' },
          match_status: 'confirmation_required',
          candidates: [{ book_id: 1, title: '活着', author: '余华', confidence: 0.94 }],
        },
      }];
  } else if (action === 'run') {
    const imported = {
      id: 102,
      book_id: 1,
      annotation_type: 'highlight',
      is_private: true,
      can_edit: true,
      cfi: null,
      chapter: '第一章',
      quote_text: '人是为活着本身而活着的',
      content: '',
      created_at: '2026-08-17T12:00:00',
      updated_at: '2026-08-17T12:00:00',
      sources: [{ source_name: 'weread', source_connection_id: '88', source_run_id: String(wereadRunId) }],
    };
    annotationsByBookId.set(1, [...(annotationsByBookId.get(1) || []).filter(item => item.id !== 102), imported]);
    run = { ...run, counts: { fetched: 2, written: 2, updated: 0, skipped: 0, failed: 0, conflicts: 0 } };
  }
  wereadRuns.set(run.id, { run, items, inputData: body?.input_data || {} });
  return { err: 'ok', run };
}));

router.get('/api/plugins/runs/:id', eventHandler((event) => {
  const value = wereadRuns.get(Number(getRouterParam(event, 'id')));
  return value ? { err: 'ok', run: value.run, items: value.items } : { err: 'plugin.run_missing', msg: 'Run not found' };
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

const pluginDefinitions = [
  {
    id: 2,
    plugin_key: 'talebook.source.opds',
    name: 'Generic OPDS',
    description: '管理已保存的 OPDS 目录，并浏览、搜索与批量导入。',
    version: '1.0.0',
    runtime_kind: 'builtin',
    categories: ['book_sources'],
    capabilities: ['book_sources.browse', 'book_sources.search', 'book_sources.acquire'],
    actions: ['test'],
    permissions: ['books.read', 'books.write', 'network.read'],
    connection_owners: ['instance'],
    ui: { icon: 'mdi-rss-box', manage_dialog: 'opds', manage_label_key: 'pluginManagement.browse', primary_action: 'browse', service_toggle: 'opds' },
  },
  {
    id: 3,
    plugin_key: 'talebook.source.legado',
    name: 'Legado 在线书源',
    description: '管理、导入、搜索、阅读与体检兼容 Legado 的在线书源。',
    version: '1.0.0',
    runtime_kind: 'builtin',
    categories: ['book_sources'],
    capabilities: ['book_sources.browse', 'book_sources.search', 'book_sources.acquire'],
    actions: ['test'],
    permissions: ['books.read', 'books.write', 'network.read'],
    connection_owners: ['instance'],
    ui: { icon: 'mdi-book-cog-outline', manage_dialog: 'legado', manage_label_key: 'pluginManagement.manage', primary_action: 'manage' },
  },
  {
    id: 4,
    plugin_key: 'talebook.source.watch-folder',
    name: 'Watch Folder',
    description: '扫描白名单内的本地目录，以内容 hash 增量发现待审电子书。',
    version: '1.0.0',
    runtime_kind: 'file',
    categories: ['book_sources'],
    capabilities: ['book_sources.browse', 'book_sources.acquire'],
    actions: ['test', 'preview', 'run', 'retry', 'rollback'],
    permissions: ['books.read', 'books.write'],
    connection_owners: ['instance'],
    config_schema: {
      type: 'object',
      required: ['path'],
      properties: {
        target_library: { type: 'string', default: 'main' },
        formats: { type: 'array', default: ['epub', 'pdf'] },
        path: { type: 'string' },
        recursive: { type: 'boolean', default: true },
      },
    },
    auth_schema: { type: 'object', properties: {} },
    ui: { icon: 'mdi-folder-eye-outline', manage_kind: 'book_source', primary_action: 'configure' },
  },
  {
    id: 5,
    plugin_key: 'talebook.combo.open-library',
    name: 'Open Library',
    description: '按 ISBN 获取元数据与可用评分，并生成逐字段安全候选。',
    version: '1.0.0',
    runtime_kind: 'builtin',
    categories: ['metadata', 'reviews'],
    capabilities: ['metadata.lookup', 'reviews.lookup'],
    actions: ['test', 'preview', 'run', 'retry', 'rollback'],
    auth_schema: { type: 'object', properties: {} },
    config_schema: { type: 'object', properties: { queries: { type: 'array' } } },
    permissions: ['books.read', 'plugin_records.write', 'network.read'],
    connection_owners: ['instance'],
    ui: { icon: 'mdi-library-outline', primary_action: 'configure' },
  },
  {
    id: 6,
    plugin_key: 'talebook.combo.weread',
    name: '微信读书',
    description: '搜索、书架、统计、笔记、社区与推荐，并可将个人笔记导入 Talebook。',
    version: '1.2.0',
    runtime_kind: 'builtin',
    categories: ['integrations', 'metadata', 'annotations'],
    capabilities: ['integrations.search', 'integrations.books', 'integrations.shelf', 'integrations.statistics', 'integrations.community', 'integrations.recommendations', 'metadata.lookup', 'annotations.import'],
    actions: ['test', 'preview', 'run', 'retry', 'rollback'],
    permissions: ['books.read', 'books.write', 'profile.read', 'annotations.write'],
    connection_owners: ['user'],
    ui: { icon: 'mdi-book-open-page-variant', manage_route: '/plugins/weread', manage_label_key: 'pluginManagement.openWorkbench' },
  },
  {
    id: 7,
    plugin_key: 'talebook.meta.calibre',
    name: 'Google Books / Amazon',
    description: '通过 Calibre 元数据能力查询 Google Books 与 Amazon。',
    version: '1.0.0',
    runtime_kind: 'builtin',
    categories: ['metadata'],
    capabilities: ['metadata.lookup'],
    actions: ['test'],
    auth_schema: { type: 'object', properties: {} },
    config_schema: { type: 'object', properties: { sources: { type: 'array', items: { type: 'string' } } } },
    permissions: ['books.read', 'network.read'],
    connection_owners: ['instance'],
    ui: { icon: 'mdi-google', primary_action: 'configure' },
  },
  {
    id: 8,
    plugin_key: 'talebook.tool.txt-fixer',
    name: 'TXT 编码修复',
    description: '检测并修复 TXT 编码问题。',
    version: '1.0.0',
    runtime_kind: 'builtin',
    categories: ['integrations'],
    capabilities: ['integrations.tool'],
    actions: ['test'],
    auth_schema: { type: 'object', properties: {} },
    config_schema: { type: 'object', properties: { trigger: { type: 'string', enum: ['manual', 'auto'] } } },
    permissions: ['books.read', 'books.write'],
    connection_owners: ['instance'],
    ui: { icon: 'mdi-file-restore-outline', manage_route: '/plugins/txt-fixer', manage_label_key: 'pluginManagement.openTool' },
  },
  {
    id: 9,
    plugin_key: 'talebook.push.boox',
    name: 'BOOX',
    description: '通过局域网把书籍推送到 BOOX 设备。',
    version: '1.0.0',
    runtime_kind: 'builtin',
    categories: ['integrations'],
    capabilities: ['integrations.push'],
    actions: ['test'],
    auth_schema: { type: 'object', properties: {} },
    config_schema: { type: 'object', properties: { device_url: { type: 'string' } } },
    permissions: ['books.read', 'network.write'],
    connection_owners: ['user'],
    ui: { icon: 'mdi-tablet-android', manage_route: '/user/detail?tab=devices', manage_label_key: 'pluginManagement.manageDevices', primary_action: 'configure', device_type: 'boox' },
  },
];
let pluginInstallations = pluginDefinitions.map((definition, index) => ({
  id: index + 1,
  plugin_key: definition.plugin_key,
  version: definition.version,
  enabled: true,
  status: 'active',
  definition,
}));
const mockPluginConnection = installation => ({
  id: installation.id,
  installation_id: installation.id,
  owner_type: 'instance',
  owner_id: 0,
  name: '内置连接',
  enabled: true,
  health: 'unknown',
  health_message: '',
  secret: { configured: false, mask: '' },
  config: {},
});
let pluginConnections = pluginInstallations
  .filter(installation => ['talebook.source.opds', 'talebook.source.legado'].includes(installation.plugin_key))
  .map(installation => mockPluginConnection(installation));
let opdsServiceEnabled = true;

router.get('/api/admin/plugins', eventHandler(() => ({
  err: 'ok',
  definitions: pluginDefinitions,
  installations: pluginInstallations,
  builtin_state: {
    'talebook.source.opds': { configured: 1, enabled: 1, service_enabled: opdsServiceEnabled },
    'talebook.source.legado': { configured: 1, enabled: 1 },
  },
})));

router.get('/api/admin/plugins/connections', eventHandler(() => ({
  err: 'ok', connections: pluginConnections, user_connection_health: [],
})));

router.post('/api/admin/plugins/connections', eventHandler(async (event) => {
  const body = await readBody(event);
  const installation = pluginInstallations.find(item => item.id === Number(body.installation_id));
  const existing = pluginConnections.find(item => item.installation_id === installation.id && item.name === body.name);
  const connection = {
    ...(existing || mockPluginConnection(installation)),
    id: existing?.id || Math.max(0, ...pluginConnections.map(item => item.id)) + 1,
    name: body.name || 'default',
    config: body.config || {},
    scopes: body.scopes || [],
    secret: { configured: Object.keys(body.credentials || {}).length > 0, mask: '' },
  };
  pluginConnections = [...pluginConnections.filter(item => item.id !== connection.id), connection];
  return { err: 'ok', connection };
}));

router.post('/api/admin/plugins/installations/:id/state', eventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  const body = await readBody(event);
  pluginInstallations = pluginInstallations.map(item => item.id === id ? { ...item, enabled: Boolean(body.enabled) } : item);
  return { err: 'ok', installation: pluginInstallations.find(item => item.id === id) };
}));

router.post('/api/admin/plugins/opds-service', eventHandler(async (event) => {
  const body = await readBody(event);
  opdsServiceEnabled = Boolean(body.enabled);
  return { err: 'ok', enabled: opdsServiceEnabled };
}));

router.get('/api/admin/plugins/runs', eventHandler(() => ({ err: 'ok', runs: pluginRuns })));

router.get('/api/admin/plugins/runs/:id', eventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'));
  const run = pluginRuns.find(item => item.id === id);
  const items = run?.action === 'preview'
    ? [{
        id: 1,
        run_id: run.id,
        external_id: 'watch-folder-book',
        entity_type: 'book_source',
        status: 'previewed',
        operation: 'preview',
        error_code: '',
        data: {
          format: 'epub',
          source: 'Watch Folder',
          access: 'download',
          license: '本地文件；许可由管理员确认',
          target_library: 'main',
        },
      }]
    : [];
  return run ? { err: 'ok', run, items } : { err: 'plugin.run_missing', msg: 'Run not found' };
}));

router.post('/api/admin/plugins/connections/:id/:action', eventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'));
  const action = getRouterParam(event, 'action');
  const run = {
    id: pluginRuns.length + 1,
    connection_id: id,
    action,
    status: 'succeeded',
    counts: { written: 0, updated: 0, skipped: 0, failed: 0, conflicts: 0 },
    duration_ms: 12,
    created_at: new Date().toISOString(),
  };
  pluginRuns = [run, ...pluginRuns];
  return { err: 'ok', run };
}));

router.get('/api/admin/opds/sources', eventHandler(() => ({
  err: 'ok',
  count: 1,
  items: [{ id: 1, name: '测试 OPDS', url: 'https://example.com/opds', description: '', active: true }],
})));

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
router.get('/api/book-sources', eventHandler(() => {
  return { err: 'ok', items: [{ id: 1, source_key: 'legado:1', name: '测试书源', group: '测试' }] };
}));

router.get('/api/book-sources/categories', eventHandler(() => {
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
router.get('/api/book-sources/search', eventHandler((event) => {
  const query = getQuery(event);
  lastSearchKey = query.key || '';
  return { err: 'ok', task_id: 'mock-task', total: 1 };
}));

router.get('/api/book-sources/search/status', eventHandler(() => {
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
        source_id: 'legado:1',
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

router.get('/api/book-sources/book', eventHandler(() => {
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
      downloadable: true,
    },
    toc_url: 'http://x.com/book/1/toc',
    download_mode: 'by_chapters',
  };
}));

router.get('/api/book-sources/toc', eventHandler(() => {
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

router.get('/api/book-sources/content', eventHandler(() => {
  return { err: 'ok', title: '第1章 惊蛰', content: '这是正文第一段。\n这是正文第二段。' };
}));

// 保存到本地：返回 tag，前端按 tag 轮询；状态先 running（含 done/total）后 completed
router.post('/api/book-sources/save', eventHandler(() => {
  saveStarted = true;
  saveStatusPolls = 0;
  return { err: 'ok', tag: 'online_save:1:http://x.com/book/1', msg: '已开始后台保存，完成后将通知您' };
}));

router.get('/api/book-sources/save/status', eventHandler(() => {
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
router.get('/api/themes/active', eventHandler(() => accessControlEnvelope() || ({
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
