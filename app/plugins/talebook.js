import { useMainStore } from '@/stores/main'

export default defineNuxtPlugin((nuxtApp) => {
    const store = useMainStore()

    function showAlert(alert_type, alert_msg, alert_to) {
        store.setAlert({ type: alert_type, msg: alert_msg, to: alert_to });
        if (alert_type === 'success') {
            setTimeout(() => {
                store.closeAlert()
            }, 1300)
        }
    }

    async function backend(url, options) {
        if (url === undefined) {
            throw "url is undefined "
        }
        var args = {
            mode: "cors", redirect: "follow", credentials: 'include',
        }
        
        const config = useRuntimeConfig()
        let server = "";
        
        if (process.server) {
            const headers = useRequestHeaders(['cookie', 'host', 'x-forwarded-for', 'x-forwarded-proto', 'x-scheme'])
            server = config.public.api_url;
            args.headers = {
                "cookie": headers.cookie,
                "X-Forwarded-Host": headers.host,
                "X-Forwarded-For": headers['x-forwarded-for'],
                "X-Forwarded-Proto": headers['x-forwarded-proto'],
                "X-Scheme": headers['x-scheme'],
            }
        } else {
            server = window.location.origin;
        }

        var full_url = server + "/api" + url;

        if (options !== undefined) {
            Object.assign(args, options);
        }

        try {
            const rsp = await fetch(full_url, args)
            var msg = "";
            if (rsp.status === 413) {
                msg = "服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。";
                showAlert("error", msg);
                throw msg;
            }

            if (rsp.status === 502) {
                msg = "服务器正在启动中...";
                showAlert("info", msg);
                throw msg;
            }

            if (rsp.status !== 200) {
                msg = "服务器异常，状态码: " + rsp.status + "<br/>请查阅服务器日志:<br/>talebook.log";
                showAlert("error", msg);
                throw msg;
            }

            let data;
            try {
                data = await rsp.json();
            } catch (err) {
                msg = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log";
                showAlert("error", msg);
                throw msg;
            }

            if (data.err === 'not_installed') {
                console.log('[Talebook] Redirecting to /install')
                await nuxtApp.runWithContext(() => navigateTo("/install", { redirectCode: 301 }));
            } else if (data.err === 'not_invited') {
                const route = useRoute()
                var next = route.fullPath;
                next = next ? "?next=" + next : "";
                if (route.path !== "/welcome") {
                    await nuxtApp.runWithContext(() => navigateTo("/welcome" + next, { redirectCode: 301 }));
                }
            } else if (data.err === 'user.need_login') {
                await nuxtApp.runWithContext(() => navigateTo("/login", { redirectCode: 301 }));
            } else if (data.err === 'exception') {
                 store.setAlert({ type: "error", msg: data.msg, to: null });
            }
            return data;

        } catch (e) {
            // console.error(e)
            throw e
        }
    }

    return {
        provide: {
            alert: showAlert,
            backend: backend
        }
    }
})
