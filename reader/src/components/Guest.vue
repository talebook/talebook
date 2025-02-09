<template>
    <!-- 未登录的游客状态  -->
    <v-card title="登录到书评系统">
        <v-divider></v-divider>
        <v-card-item>
            <!-- 登录 -->
            <v-form v-if="mode == 'login'" @submit.prevent="do_login">
                <v-text-field prepend-icon="mdi-email" v-model="email" label="邮箱" type="text" autocomplete="old-email"></v-text-field>
                <v-text-field prepend-icon="mdi-lock" v-model="password" label="密码" type="password"></v-text-field>
                <v-btn type="submit" color="primary">登录</v-btn>
            </v-form>

            <!-- 重置 -->
            <v-form v-else-if="mode == 'forget'" @submit.prevent="do_reset">
                <v-text-field prepend-icon="mdi-email" v-model="email" label="邮箱" type="text" autocomplete="old-email"></v-text-field>
                <v-btn type="submit" color="red">重置密码</v-btn>
            </v-form>

            <!-- 注册 -->
            <v-form ref="form" v-else-if="mode == 'signup'" @submit.prevent="do_signup">
                <v-text-field required prepend-icon="mdi-email" v-model="email" label="邮箱" type="text"
                    autocomplete="new-email" :rules="[rules.email]"></v-text-field>
                <v-text-field required prepend-icon="mdi-guy-fawkes-mask" v-model="nickname" label="昵称" type="text"
                    autocomplete="new-nickname" :rules="[rules.nick]"></v-text-field>
                <v-btn type="submit" color="green">注册</v-btn>
                <p class="text-small"> * 账号密码将随机生成，并发往邮箱</p>
            </v-form>

        </v-card-item>

        <v-alert v-if="alert.msg" :type="alert.type">{{ alert.msg }}</v-alert>

        <v-divider></v-divider>

        <v-card-actions>
            <v-btn v-if="mode == 'login'" @click="mode = 'forget'" text="忘记密码?"></v-btn>
            <v-btn v-if="mode != 'login'" @click="mode = 'login'" text="登录账号"></v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="mode = 'signup'" text="快速注册"></v-btn>
        </v-card-actions>


    </v-card>
</template>

<script>
export default {
    data: () => ({
        mode: 'login',

        email: "",
        password: "",
        password2: "",
        nickname: "",
        failmsg: "",
        validmsg: "",
        rules: {
            nick: v => v.length >= 2 || '昵称需至少包含两个字符',
            email: function (email) {
                var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(email) || "无效的邮箱地址";
            },
        },

        alert: {
            type: "error",
            msg: "",
        },
    }),
    head: () => ({
        title: "登录"
    }),
    computed: {
    },
    props: ['server'],
    methods: {
        do_login: function () {
            var data = new URLSearchParams();
            data.append("email", this.email);
            data.append("password", this.password);
            fetch(this.server + "/user/sign_in", {
                method: "POST",
                body: data,
            }).then((rsp) => {
                if (rsp.err != "ok") {
                    this.alert.type = "error";
                    this.alert.msg = rsp.msg;
                }
            });
        },
        do_reset: function () {
            var data = new URLSearchParams();
            data.append("email", this.email);
            fetch(this.server + "/user/reset", {
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
        do_signup: function () {
            if (!this.$refs.form.validate()) {
                return false;
            }

            var data = new URLSearchParams();
            data.append('email', this.email);
            data.append('nickname', this.nickname);
            fetch(this.server + '/user/sign_up', {
                method: 'POST',
                body: data,
            }).then(rsp => {
                if (rsp.err != 'ok') {
                    this.failmsg = rsp.msg;
                } else {
                    this.$store.commit("navbar", true);
                    this.$router.push("/");
                }
            });
        }
    },
}

</script>
