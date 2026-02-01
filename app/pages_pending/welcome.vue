<template>
<v-row justify=center class='fill-center'>
    <v-col xs=12 sm=8 md=4>
        <v-card class="elevation-12">
            <v-toolbar dark color="primary">
                <v-toolbar-title align-center >请输入访问密码</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <p class="py-6 body-3 text-center" >{{welcome}}</p>
                <v-form @submit.prevent="welcome_login" >
                    <v-text-field prepend-icon="lock" v-model="invite_code" required
                        label="访问密码" type="password" :error="is_err" :error-messages="msg" :loading="loading"></v-text-field>
                </v-form>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="welcome_login" color="primary">Login</v-btn>
                <v-spacer></v-spacer>
            </v-card-actions>

        </v-card>
    </v-col>
</v-row>
</template>

<script>
export default {
    data: () => ({
        valid: true,
        form: null,
        is_err: false,
        err: "ok",
        msg: "",
        welcome: "本站为私人图书馆，需输入密码才可进行访问",
        loading: false,
        invite_code: "",
    }),
    async asyncData({ app, res }) {
        app.store.commit('navbar', false);
        if ( res !== undefined ) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        return app.$backend("/welcome");
    },
    head: () => ({
        title: "私人图书馆"
    }),
    created() {
        this.$store.commit('navbar', false);
        if ( this.err == 'free' ) {
            this.$router.push(this.$route.query.next || "/");
        } else if ( this.err == 'not_installed' ) {
            this.$router.push("/install")
        }
    },
    methods: {
        welcome_login: function() {
            this.loading = true;
            var data = new URLSearchParams();
            data.append('invite_code', this.invite_code);
            this.$backend("/welcome", {
                method: 'POST',
                body: data,
            })
            .then( rsp => {
                this.loading = false;
                if ( rsp.err != 'ok' ) {
                    this.is_err = true;
                    this.msg = rsp.msg;
                } else {
                    this.is_err = false;
                    location.reload();
                }
            });
        },
    },
}
</script>

