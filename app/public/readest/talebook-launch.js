const BOOK_ID_PATTERN = /^[1-9][0-9]*$/;
const BOOTSTRAP_SCHEMA = 'talebook.reader.bootstrap.v1';

export class ReadestLaunchError extends Error {
  constructor(message, { login = false } = {}) {
    super(message);
    this.name = 'ReadestLaunchError';
    this.login = login;
  }
}

export function parseReadestBookId(search) {
  const bookId = new URLSearchParams(search).get('bookId') || '';
  return BOOK_ID_PATTERN.test(bookId) ? bookId : null;
}

function localNavigationPath(value, fallback) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export function validateReadestBootstrap(payload, { bookId, origin }) {
  if (!payload || typeof payload !== 'object') throw new ReadestLaunchError('阅读器启动响应无效');
  if (payload.err !== 'ok') throw new ReadestLaunchError(payload.msg || payload.err || '暂时无法启动 Readest');
  if (payload.schema !== BOOTSTRAP_SCHEMA || payload.engine !== 'readest') {
    throw new ReadestLaunchError('阅读器启动协议不兼容');
  }
  if (String(payload.book?.id) !== String(bookId) || payload.book?.format !== 'epub') {
    throw new ReadestLaunchError('书籍格式或标识不匹配');
  }
  const revision = typeof payload.book?.revision === 'string' ? payload.book.revision : '';
  if (!revision) throw new ReadestLaunchError('书籍版本标识无效');
  if (payload.resource?.mime !== 'application/epub+zip' || payload.resource?.range !== true) {
    throw new ReadestLaunchError('EPUB 资源契约不完整');
  }

  const resource = new URL(payload.resource?.url || '', origin);
  if (resource.origin !== origin || resource.pathname !== `/read/resource/${bookId}.epub`) {
    throw new ReadestLaunchError('EPUB 资源不是受信任的同源地址');
  }
  if (resource.searchParams.get('revision') !== revision) {
    throw new ReadestLaunchError('EPUB 资源版本与书籍不一致');
  }

  return {
    resource: resource.href,
    back: localNavigationPath(payload.navigation?.back, `/book/${bookId}`),
    fallback: localNavigationPath(payload.navigation?.fallback, `/read/${bookId}?reader=candle`),
  };
}

export function buildReadestReaderUrl(bootstrap, { bookId, origin }) {
  const validated = validateReadestBootstrap(bootstrap, { bookId, origin });
  const target = new URL('/readest/reader.html', origin);
  target.searchParams.set('file', validated.resource);
  target.searchParams.set('moke', '1');
  target.searchParams.set('mokeBookId', String(bookId));
  target.searchParams.set('mokeReturnTo', validated.back);
  return { target: target.href, ...validated };
}

export async function fetchReadestBootstrap({ bookId, origin, fetchImpl = fetch }) {
  const response = await fetchImpl(`/api/book/${bookId}/reader-bootstrap?engine=readest`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    redirect: 'follow',
  });
  const contentType = response.headers.get('content-type') || '';
  if (response.redirected && new URL(response.url, origin).pathname === '/login') {
    throw new ReadestLaunchError('登录状态已失效，请重新登录', { login: true });
  }
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ReadestLaunchError('阅读器启动接口返回了非 JSON 响应');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ReadestLaunchError('无法解析阅读器启动响应');
  }
  if (!response.ok || payload?.err !== 'ok') {
    throw new ReadestLaunchError(payload?.msg || payload?.err || `阅读器启动失败（HTTP ${response.status}）`);
  }
  return payload;
}

function configureActions(document, bookId, navigation = {}) {
  const back = document.querySelector('[data-action="back"]');
  const fallback = document.querySelector('[data-action="fallback"]');
  const retry = document.querySelector('[data-action="retry"]');
  if (back) back.href = navigation.back || `/book/${bookId}`;
  if (fallback) fallback.href = navigation.fallback || `/read/${bookId}?reader=candle`;
  if (retry) retry.href = `/readest/talebook-launch.html?bookId=${encodeURIComponent(bookId)}`;
}

export async function runReadestLauncher({ window, document, fetchImpl = fetch }) {
  const bookId = parseReadestBookId(window.location.search);
  const status = document.querySelector('[data-launch-status]');
  const actions = document.querySelector('[data-launch-actions]');
  const login = document.querySelector('[data-action="login"]');
  const heading = document.querySelector('[data-launch-heading]');
  const spinner = document.querySelector('[data-launch-spinner]');
  const showError = (message) => {
    if (status) status.textContent = message;
    if (heading) heading.textContent = '暂时无法使用 Readest';
    if (spinner) spinner.hidden = true;
    if (actions) actions.hidden = false;
    document.title = '暂时无法使用 Readest';
  };

  if (!bookId) {
    showError('书籍参数无效，请返回书库后重试');
    return false;
  }

  configureActions(document, bookId);
  try {
    const payload = await fetchReadestBootstrap({ bookId, origin: window.location.origin, fetchImpl });
    const launch = buildReadestReaderUrl(payload, { bookId, origin: window.location.origin });
    configureActions(document, bookId, launch);
    window.location.replace(launch.target);
    return true;
  } catch (error) {
    const launchError = error instanceof ReadestLaunchError
      ? error
      : new ReadestLaunchError('连接阅读器失败，请重试或改用 Candle');
    showError(launchError.message);
    if (login) login.hidden = !launchError.login;
    return false;
  }
}

if (typeof window !== 'undefined' && document.documentElement.hasAttribute('data-talebook-readest-launcher')) {
  void runReadestLauncher({ window, document });
}
