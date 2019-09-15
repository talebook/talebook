export default {
    install(Vue, options) {
        var api = window.location.origin + "/api";
        if ( options !== undefined ) {
            if ( options.api !== undefined ) {
                api = options.api;
            }
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
                .then(rsp=>rsp.json())
                .then(rsp => {
                    if ( rsp.err == 'not_installed' ) {
                        self.$router.push("/install").catch(()=>{});
                    } else if ( rsp.err == 'user.need_login' ) {
                        self.$router.push("/login").catch(()=>{});
                    }
                    return rsp;
                })
                .catch( err => {
                    console.log(err);
                    next = next ? "?next="+next : "";
                    if ( self.$route.path != "/welcome" ) {
                        this.$router.push("/welcome"+next).catch(()=>{});
                        throw "redirect to welcome page";
                    }
                }) ;
        }
        Vue.prototype.alert = function(alert_type, alert_msg) {
            this.$store.commit("alert", {type:alert_type, msg: alert_msg});
        }
    }
}


