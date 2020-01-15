export default {
    install(Vue, options) {
        var api = window.location.origin + "/api";
        if ( options !== undefined ) {
            if ( options.api !== undefined ) {
                api = options.api;
            }
        }
        Vue.prototype.alert = function(alert_type, alert_msg, alert_to) {
            this.$store.commit("alert", {type:alert_type, msg: alert_msg, to: alert_to});
        }
        Vue.prototype.backend = function(url, options) {
            var full_url = api + url;
            var args = {
                mode: "cors",
                redirect: "follow",
                credentials: 'include',
            }
            if ( options !== undefined ) {
                Object.assign(args, options);
            }
            var self = this;
            var next = this.$route.fullPath;

            return fetch(full_url, args)
                .then( rsp => {
                    var msg = "";
                    if ( rsp.status != 200 ) {
                        msg = "服务器异常，状态码: " + rsp.status + "<br/>请查阅服务器日志:<br/>calibre-webserver.log";
                        self.alert("error", msg);
                        throw msg;
                    }

                    try {
                        return rsp.json();
                    } catch ( err ) {
                        msg = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>calibre-webserver.log";
                        self.alert("error", msg);
                        throw msg;
                    }
                })
                .then( rsp => {
                    if ( rsp.err == 'not_installed' ) {
                        self.$router.push("/install").catch(()=>{});
                        throw "redirect to install page";
                    } else if ( rsp.err == 'not_invited' ) {
                        next = next ? "?next="+next : "";
                        if ( self.$route.path != "/welcome" ) {
                            self.$router.push("/welcome"+next).catch(()=>{});
                            throw "redirect to welcome page";
                        }
                    } else if ( rsp.err == 'user.need_login' ) {
                        self.$router.push("/login").catch(()=>{});
                        throw "redirect to login page";
                    } else if ( rsp.err == 'exception' ) {
                        self.$store.commit("alert", {type:"error", msg: rsp.msg, to: null});
                        throw "server exception";
                    }
                    return rsp;
                })
        }
    }
}


