<template>
    <v-row justify="center" class="fill-center">
        <v-col xs="12" sm="8" md="4">
            <v-card v-if="show_login" class="elevation-12">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>欢迎访问</v-toolbar-title>
                    <v-spacer></v-spacer>
                    <v-btn v-if="$store.state.sys.allow.register" rounded color="green" to="/signup">注册</v-btn>
                </v-toolbar>
                <v-card-text>
                    <v-form @submit.prevent="do_login">
                        <v-text-field prepend-icon="person" v-model="username" label="用户名" type="text"></v-text-field>
                        <v-text-field prepend-icon="lock" v-model="password" label="密码" type="password" id="password"></v-text-field>
                        <p class="text-right">
                            <a @click="show_login = !show_login"> 忘记密码? </a>
                        </p>
                        <div align="center">
                            <v-btn type="submit" large rounded color="primary">登录</v-btn>
                        </div>
                    </v-form>
                </v-card-text>

                <v-card-text v-if="socials.length > 0">
                    <v-divider></v-divider>
                    <div align="center">
                        <br />
                        <small>使用社交网络账号登录</small>
                        <br />
                        <template v-for="s in socials">
                            <v-btn small outlined :key="s.text" :href="'/auth/login/' + s.value">{{ s.text }}</v-btn>
                            &nbsp;
                        </template>
                    </div>
                </v-card-text>
                <v-alert v-if="alert.msg" :type="alert.type">{{ alert.msg }}</v-alert>
            </v-card>

            <v-card v-else class="elevation-12">
                <v-toolbar dark color="red">
                    <v-toolbar-title>重置密码</v-toolbar-title>
                </v-toolbar>
                <v-card-text v-if="!show_login">
                    <v-form @submit.prevent="do_reset">
                        <v-text-field prepend-icon="person" v-model="username" label="用户名" type="text"></v-text-field>
                        <v-text-field
                            prepend-icon="email"
                            v-model="email"
                            label="注册邮箱"
                            type="text"
                            autocomplete="old-email"
                        ></v-text-field>
                    </v-form>
                    <div align="center">
                        <v-btn rounded color="" class="mr-5" @click="show_login = !show_login">返回</v-btn>
                        <v-btn rounded dark color="red" @click="do_reset">重置密码</v-btn>
                    </div>
                </v-card-text>
                <v-alert v-if="alert.msg" :type="alert.type">{{ alert.msg }}</v-alert>
            </v-card>
        </v-col>
    </v-row>
</template>

<script>
export default {
    data: () => ({
        username: "",
        password: "",
        email: "",
        show_login: true,
        alert: {
            type: "error",
            msg: "",
        },
    }),
    asyncData({ store }) {
        store.commit("navbar", false);
    },
    head: () => ({
        title: "登录"
    }),
    created() {
        this.$store.commit("navbar", false);
        this.$backend("/user/info").then((rsp) => {
            this.$store.commit("login", rsp);
        });
    },
    computed: {
        socials: function () {
            return this.$store.state.sys.socials;
        },
    },
    methods: {
        do_login: function () {
            var data = new URLSearchParams();
            data.append("username", this.username);
            data.append("password", this.password);
            this.$backend("/user/sign_in", {
                method: "POST",
                body: data,
            }).then((rsp) => {
                if (rsp.err != "ok") {
                    this.alert.type = "error";
                    this.alert.msg = rsp.msg;
                } else {
                    this.$store.commit("navbar", true);
                    this.$router.push("/");
                }
            });
        },
        do_reset: function () {
            var data = new URLSearchParams();
            data.append("username", this.username);
            data.append("email", this.email);
            this.$backend("/user/reset", {
                method: "POST",
                body: data,
            }).then((rsp) => {
                if (rsp.err == "ok") {
                    this.alert.type = "success";
                    this.alert.msg = "重置成功！请查阅密码通知邮件。";
                } else {
                    this.alert.type = "error";
                    this.alert.msg = rsp.msg;
                }
            });
        },
    },
};
</script>

<style>
.fill-center {
    margin-top: 6%;
}
</style>
