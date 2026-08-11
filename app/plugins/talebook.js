import { useMainStore } from '@/stores/main';

export default defineNuxtPlugin((nuxtApp) => {
  const store = useMainStore();
  const activeRedirects = new Map();

  nuxtApp.$router.afterEach((to) => {
    for (const [targetPath, reached] of activeRedirects) {
      if (to.path === targetPath) {
        activeRedirects.set(targetPath, true);
      } else if (reached) {
        activeRedirects.delete(targetPath);
      }
    }
  });

  function showAlert(alert_type, alert_msg, alert_to) {
    store.setAlert({ type: alert_type, msg: alert_msg, to: alert_to });
    if (alert_type === 'success') {
      setTimeout(() => {
        store.closeAlert();
      }, 1300);
    }
  }

  // 统一处理后端返回的控制类错误信封（未安装/未邀请/未登录/异常），触发跳转或提示。
  function currentRoute() {
    return nuxtApp.runWithContext(() => useRoute());
  }

  async function redirectOnce(target, logMessage) {
    const targetPath = target.split('?')[0];
    const route = currentRoute();
    if (route.path === targetPath || activeRedirects.has(targetPath)) {
      return;
    }

    activeRedirects.set(targetPath, false);
    try {
      if (logMessage) console.log(logMessage);
      await nuxtApp.runWithContext(() => navigateTo(target, { redirectCode: 302 }));
    } catch (error) {
      activeRedirects.delete(targetPath);
      throw error;
    }
  }

  async function handleErrorEnvelope(data) {
    if (data.err === 'not_installed') {
      await redirectOnce('/install', '[Talebook] Redirecting to /install');
    } else if (data.err === 'not_invited') {
      const route = currentRoute();
      var next = route.fullPath;
      next = next ? '?next=' + next : '';
      await redirectOnce('/welcome' + next);
    } else if (data.err === 'user.need_login') {
      await redirectOnce('/login');
    } else if (data.err === 'exception') {
      store.setAlert({ type: 'error', msg: data.msg, to: null });
    }
  }

  async function backend(url, options) {
    if (url === undefined) {
      throw 'url is undefined ';
    }
    var args = {
      mode: 'cors', redirect: 'follow', credentials: 'include',
    };

    const config = useRuntimeConfig();
    let server = '';
        
    if (process.server) {
      const headers = useRequestHeaders(['cookie', 'host', 'x-forwarded-for', 'x-forwarded-proto', 'x-scheme']);
      server = config.public.api_url;
      args.headers = {
        'cookie': headers.cookie,
        'X-Forwarded-Host': headers.host,
        'X-Forwarded-For': headers['x-forwarded-for'],
        'X-Forwarded-Proto': headers['x-forwarded-proto'],
        'X-Scheme': headers['x-scheme'],
      };
    } else {
      server = window.location.origin;
    }

    var full_url = server + '/api' + url;

    if (options !== undefined) {
      Object.assign(args, options);
    }

    try {
      const rsp = await fetch(full_url, args);
      var msg = '';
      if (rsp.status === 413) {
        msg = '服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。';
        showAlert('error', msg);
        throw msg;
      }

      if (rsp.status === 502) {
        let status = null;
        try {
          const statusRsp = await fetch(server + '/status.json', { cache: 'no-store' });
          if (statusRsp.ok) {
            status = await statusRsp.json();
          }
        } catch (e) {
          status = null;
        }
        const alert = resolveStatusAlert(status);
        showAlert(alert.type, alert.msg);
        throw alert.msg;
      }

      if (rsp.status !== 200) {
        msg = '服务器异常，状态码: ' + rsp.status + '<br/>请查阅服务器日志:<br/>talebook.log';
        showAlert('error', msg);
        throw msg;
      }

      let data;
      try {
        data = await rsp.json();
      } catch (err) {
        msg = '服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log';
        showAlert('error', msg);
        throw msg;
      }

      await handleErrorEnvelope(data);
      return data;

    } catch (e) {
      // console.error(e)
      throw e;
    }
  }

  // 流式请求：返回 NDJSON 异步迭代器，调用方用 for await 逐条消费。
  // 约定首行为 meta（total/title/err 等），后续行为数据项。
  async function* backend_stream(url, options) {
    if (url === undefined) {
      throw 'url is undefined ';
    }
    var args = {
      mode: 'cors', redirect: 'follow', credentials: 'include',
    };

    const config = useRuntimeConfig();
    const server = import.meta.server ? config.public.api_url : window.location.origin;

    if (options !== undefined) {
      Object.assign(args, options);
    }

    const rsp = await fetch(server + '/api' + url, args);
    if (!rsp.ok) {
      throw new Error('stream request failed: ' + rsp.status);
    }
    // 流式接口返回 application/x-ndjson；若在流处理器运行前发生 @auth/@js 层错误
    // （如会话过期返回 {"err":"user.need_login"}），响应是普通 JSON，没有换行符，
    // parseNdjson 不会 yield 任何内容，页面会静默空白。此处先按普通 JSON 处理错误信封，
    // 复用 backend() 的跳转/提示逻辑。
    const contentType = rsp.headers.get('Content-Type') || '';
    if (!contentType.includes('ndjson')) {
      let data;
      try {
        data = await rsp.json();
      } catch (e) {
        return;
      }
      await handleErrorEnvelope(data);
      yield data;
      return;
    }
    yield* parseNdjson(rsp);
  }

  return {
    provide: {
      alert: showAlert,
      backend: backend,
      backend_stream: backend_stream
    }
  };
});

// 502 时展示的启动状态提示：由 docker/start.sh + webserver/self_check.py 写入的
// /status.json 提供 phase 与失败 step 的 code（枚举），文案只从下面这份固定白名单里取，
// 不拼接 status.json 里的任何自由文本，避免把后端日志/环境变量/路径带到页面上（v-html 渲染）。
const STATUS_CODE_HINTS = {
  permission_denied: '检测到 /data 目录写入失败，请检查挂载卷的 PUID/PGID 与目录权限设置。',
  nginx_config_invalid: 'Nginx 配置校验失败，请检查是否覆盖了自定义证书或配置文件。',
  syncdb_failed: '数据库初始化失败，请检查 /data/books 目录是否可写、磁盘空间是否充足。',
  migrate_failed: '数据库结构迁移失败，请检查 /data/books/calibre-webserver.db 是否可正常访问。',
  update_config_failed: '服务器配置写入失败，请检查 /data/books/settings 目录权限。',
};

const STATUS_STARTING_MSG = '服务器正在启动中，请稍候...';
const STATUS_FAILED_FALLBACK_MSG = '服务器启动失败。';
const STATUS_PAGE_LINK = '<br/><a href="/status_page.html" target="_blank">查看详细启动状态</a>';

// 根据 /status.json 的内容为 502 场景生成提示：拿不到该文件（老镜像/尚未生成）或
// phase 还在 starting，保留原有的通用"启动中"提示；phase 为 failed 时换成具体建议，
// 并附上跳转到 /status_page.html 的入口，用户不用进容器看日志。单独导出以便单元测试。
export function resolveStatusAlert(status) {
  if (!status || status.phase !== 'failed') {
    return { type: 'info', msg: STATUS_STARTING_MSG };
  }
  const failedStep = (status.steps || []).find((step) => step.status === 'failed');
  const hint = (failedStep && STATUS_CODE_HINTS[failedStep.code]) || STATUS_FAILED_FALLBACK_MSG;
  return { type: 'error', msg: hint + STATUS_PAGE_LINK };
}

// 解析 NDJSON（换行分隔的 JSON）流：逐行 yield 已解析的对象，跳过空行与非法行，
// 并正确拼接跨 chunk 被截断的行。单独导出以便单元测试。
export async function* parseNdjson(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch (e) {
        // 跳过不完整/非法的行
      }
    }
  }
}
