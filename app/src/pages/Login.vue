<template>
    <v-row justify=center class="fill-center">
      <v-col xs=12 sm=8 md=4>
        <v-card class="elevation-12">
            <v-toolbar dark color="primary">
                <v-toolbar-title>欢迎访问</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <v-form>
                    <v-text-field prepend-icon="person" v-model="username" label="用户名" type="text"></v-text-field>
                    <v-text-field prepend-icon="lock" v-model="password" label="密码" type="password" id="password" ></v-text-field>
                </v-form>
                <v-row>
                    <v-col>
                        <div align="center">
                            <v-btn large rounded color="orange" to="/signup">注册</v-btn>
                        </div>
                    </v-col>
                    <v-col>
                        <div align="center">
                            <v-btn large rounded color="primary" @click="do_login">登录</v-btn>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>

            <v-card-text v-if="login_with_social">
                <v-divider></v-divider>
                <div align="center">
                    <br/>
                    <small>使用社交网络账号登录</small>
                    <br/>
                    <v-btn small outlined href="/api/login/amazon">Amazon</v-btn>
                    &nbsp;
                    <v-btn small outlined href="/api/login/github">Github</v-btn>
                </div>
            </v-card-text>
            <v-alert v-if="failmsg" type="error">{{failmsg}}</v-alert>
        </v-card>
      </v-col>
    </v-row>
</template>

<script>
export default {
    created() {
        this.$store.commit("navbar", false);
        this.$store.commit("loaded", true);
    },
    data: () => ({
        username: "",
        password: "",
        login_with_social: true,
        failmsg: "",
    }),
    methods: {
        do_login: function() {
            var data = new URLSearchParams();
            data.append('username', this.username);
            data.append('password', this.password);
            this.backend('/user/sign_in', {
                method: 'POST',
                body: data,
            }).then( rsp => rsp.json() )
            .then( rsp => {
                if ( rsp.err != 'ok' ) {
                    this.failmsg = rsp.msg;
                } else {
                    this.$store.commit("puremode", false);
                    this.$router.push("/");
                }
            });
        }
    },
}
</script>

<style>
.fill-center {
    margin-top: 6%;
}
</style>

