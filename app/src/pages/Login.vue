<template>
    <v-content>
      <v-container fluid fill-height>
        <v-layout align-center justify-center>
          <v-flex xs12 sm8 md4>
            <v-card class="elevation-12">

                <v-toolbar dark color="primary">
                    <v-toolbar-title>欢迎访问文渊阁</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <v-form>
                        <v-text-field prepend-icon="person" v-model="username" label="用户名" type="text"></v-text-field>
                        <v-text-field prepend-icon="lock" v-model="password" label="密码" type="password" id="password" ></v-text-field>
                    </v-form>
                    <div align="center">
                    <v-btn large round color="primary" @click="do_login">登录</v-btn>
                    </div>
                </v-card-text>

                <v-card-text v-if="login_with_social">
                    <v-divider></v-divider>
                    <div align="center">
                        <br/>
                        <small>使用社交网络账号登录</small>
                        <br/>
                        <v-btn small outline href="/api/login/amazon">Amazon</v-btn>
                        <v-btn small outline href="/api/login/github">Github</v-btn>
                    </div>
                </v-card-text>
                <v-alert :value="failmsg" type="error">{{failmsg}}</v-alert>

            </v-card>
            <div style="padding: 60px"></div>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
</template>

<script>
export default {
    created() {
        this.$store.commit("puremode", true);
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

