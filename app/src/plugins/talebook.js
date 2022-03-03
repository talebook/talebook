export default ({ app }, inject) =>  {
    inject("alert", function(alert_type, alert_msg, alert_to) {
            app.store.commit("alert", {type:alert_type, msg: alert_msg, to: alert_to});
        }
    )
    inject("backend", function(url, options) {
            if ( url === undefined)  {
                throw "url is undefined "
            }
            var args = {
                mode: "cors",
                redirect: "follow",
                credentials: 'include',
            }
            var server = "";
            if ( process.server ) {
                if ( app.context.req != undefined ) {
                    var headers = app.context.req.headers;
                    var scheme = headers["x-scheme"] ?? "http";
                    server = `${scheme}://${headers.host}`;
                    args.headers = {
                        "cookie": headers.cookie,
                        "X-Forwarded-For": headers["x-forwarded-for"],
                        "X-Scheme": headers["x-scheme"],
                    }
                }
            } else {
                server = window.location.origin;
            }

            var full_url = server + "/api" + url;

            if ( options !== undefined ) {
                Object.assign(args, options);
            }
            //console.trace();
            //console.log("request", full_url)
            return fetch(full_url, args)
                .then( rsp => {
                    const { res } = app.context;
                    var msg = "";
                    if ( rsp.status == 413) {
                        msg = "服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。";
                        app.$alert("error", msg);
                        throw msg;
                    }

                    if ( rsp.status == 502) {
                        msg = "服务器正在启动中...";
                        app.$alert("info", msg);
                        throw msg;
                    }

                    if ( rsp.status != 200 ) {
                        msg = "服务器异常，状态码: " + rsp.status + "<br/>请查阅服务器日志:<br/>talebook.log";
                        app.$alert("error", msg);
                        throw msg;
                    }

                    try {
                        return rsp.json();
                    } catch ( err ) {
                        msg = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log";
                        app.$alert("error", msg);
                        throw msg;
                    }
                })
                .then( rsp => {
                    const { route, redirect, res } = app.context;
                    if ( rsp.err == 'not_installed' ) {
                        redirect(301, "/install");
                    } else if ( rsp.err == 'not_invited' ) {
                        var next = route.fullPath;
                        next = next ? "?next="+next : "";
                        if ( route.path != "/welcome" ) {
                            redirect(301, "/welcome"+next);
                        }
                    } else if ( rsp.err == 'user.need_login' ) {
                        redirect(301, "/login");
                    } else if ( rsp.err == 'exception' ) {
                        if ( res !== undefined ) {
                            res.setHeader('Cache-Control', 'no-cache');
                        }
                        app.store.commit("alert", {type:"error", msg: rsp.msg, to: null});
                    }
                    return rsp;
                })
    })
}

