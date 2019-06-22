<template>
<v-layout align-center justify-center>
    <v-flex xs12 sm8 md6>
        <v-card class="elevation-12">
            <v-toolbar dark color="primary">
            <v-toolbar-title align-center >请输入访问密码</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <v-form>
                    <v-text-field id="password" prepend-icon="lock" name="password"
                        label="Password" type="password" :error="err" :error-messages="err_msg" :loading="loading"></v-text-field>
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
        this.$store.commit("puremode", true);
    },
    data: () => ({
        err: false,
        err_msg: "",
        loading: false,
    }),
    methods: {
        welcome_login: function() {
            this.loading = true;
            if ( ! this.err ) {
                this.err = true;
                this.err_msg = "这里是登录错误的提示。开发测试，请再点一次！";
            } else {
                this.err = false;
                this.$router.push("/");
                this.$store.commit("puremode", false);
            }
            this.loading = false;
        },
    },
}
</script>

