export default {
    install(Vue, options)
    {
        var api = window.location.origin + "/api";
        if ( options !== undefined ) {
            if ( options.api !== undefined ) {
                api = options.api;
            }
        }
        Vue.prototype.backend = function(url) {
            var full_url = api + url;
            return fetch(full_url, {
                credentials: 'include',
                mode: "cors",
                redirect: "follow",
            })
        }
    }
}


