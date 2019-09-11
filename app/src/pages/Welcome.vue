<template>
<v-row justify=center class='fill-center'>
    <v-col xs=12 sm=8 md=4>
        <v-card class="elevation-12">
            <v-toolbar dark color="primary">
            <v-toolbar-title align-center >请输入访问密码</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <v-form @submit.prevent="welcome_login" >
                    <v-text-field prepend-icon="lock" v-model="invite_code" required
                        label="邀请码" type="password" :error="err" :error-messages="err_msg" :loading="loading"></v-text-field>
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
    created() {
        this.$store.commit('navbar', false);
        this.$store.commit('loaded');
    },
    data: () => ({
        valid: true,
        form: null,
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
                    this.$router.push(this.$route.query.next || "/");
                    this.$store.commit("puremode", false);
                }
            });
        },
    },
}
</script>

