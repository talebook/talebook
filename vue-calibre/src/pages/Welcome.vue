<template>
<v-layout align-center justify-center>
    <v-flex xs12 sm8 md6>
        <v-card class="elevation-12">
            <v-toolbar dark color="primary">
            <v-toolbar-title align-center >请输入访问密码</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <v-form>
                    <v-text-field id="code" prepend-icon="lock" name="code" v-model="invite_code" required
                        label="邀请码" type="password" :error="err" :error-messages="err_msg" :loading="loading"></v-text-field>
                </v-form>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="welcome_login" color="primary">Login</v-btn>
                <v-spacer></v-spacer>
            </v-card-actions>

        </v-card>
    </v-flex>
</v-layout>
</template>

<script>
export default {
    created() {
        this.$store.commit('navbar', false);
        this.$store.commit('loaded');
    },
    data: () => ({
        err: false,
        err_msg: "",
        loading: false,
        invite_code: "",
    }),
    methods: {
        welcome_login: function() {
            this.loading = true;
            var data = new URLSearchParams();
            data.append('invite_code', this.invite_code);
            this.backend("/welcome", {
                method: 'POST',
                body: data,
            }).then( rsp => rsp.json() )
            .then( rsp => {
                this.loading = false;
                if ( rsp.err != 'ok' ) {
                    this.err = true;
                    this.err_msg = rsp.msg;
                } else {
                    this.err = false;
                    this.$router.push("/");
                    this.$store.commit("puremode", false);
                }
            });
        },
    },
}
</script>

