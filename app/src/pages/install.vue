<template>
    <v-row align-center justify=center>
        <v-col xs=12 sm=8 md=4>
            <v-card class="elevation-12">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>安装 TaleBook</v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <v-form ref="form" @submit.prevent="do_intall">
                        <v-text-field required prepend-icon="home" v-model="title" label="网站标题" type="text"></v-text-field>
                        <v-text-field required prepend-icon="person" v-model="username" label="管理员用户名"   type="text" autocomplete="new-username" :rules="[rules.user]"  ></v-text-field>
                        <v-text-field required prepend-icon="lock"   v-model="password" label="管理员登录密码" type="text" autocomplete="new-password" :rules="[rules.pass]"  ></v-text-field>
                        <v-text-field required prepend-icon="email"  v-model="email"    label="管理员Email"    type="text" autocomplete="new-email"    :rules="[rules.email]" ></v-text-field>
                        <v-checkbox v-model="invite" label="开启私人图书馆模式"></v-checkbox>
                        <template v-if="invite">
                            <v-text-field required prepend-icon="lock"  v-model="code"    label="访问码"    type="text" autocomplete="new-code" ></v-text-field>
                        </template>
                    </v-form>
                    <v-alert type="info" v-if="tips" v-html="tips"></v-alert>
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn @click="do_install" color="primary">完成设置</v-btn>
                    <v-spacer></v-spacer>
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<script>
export default {
    data: () => ({
        e1: 1,
        username: "admin",
        password: "",
        email: "",
        code: "",
        invite: false,
        title: "TaleBook",
        tips: "",
        retry: 20,
        rules: {
            user: v => ( 20 >= v.length && v.length >= 5) || '6 ~ 20 characters',
            pass: v => ( 20 >= v.length && v.length >= 8) || '8 ~ 20 characters',
            email: function (email) {
                var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(email) || "Invalid email format";
            },
        },

    }),
    asyncData({ store }) {
        store.commit("navbar", false);
    },
    created() {
        this.$store.commit("navbar", false);
    },
    methods: {
        check_install: function() {
            fetch("/api/index").then( rsp => {
                if ( rsp.status == 200 ) {
                    this.tips += "API服务正常<br/>安装成功，跳转到主页";
                } else {
                    this.retry -= 1;
                    if ( this.retry > 0 ) {
                        setTimeout( () => {
                            this.check_install();
                        }, 1000);
                    } else {
                        this.tips += "超时，请刷新重试";
                    }
                    return;
                }

                // force refresh index.html
                fetch("/?r="+Math.random()).then( rsp => {
                    rsp.text();
                    this.$store.commit("navbar", true);
                    this.$router.push("/");
                });

            });
        },
        do_install: function() {
            if ( ! this.$refs.form.validate() ) {
                return false;
            }

            var data = new URLSearchParams();
            data.append('username', this.username);
            data.append('password', this.password);
            data.append('email', this.email);
            data.append('code', this.code);
            data.append('invite', this.invite);
            data.append('title', this.title);
            this.tips = "正在写入配置文件...";
            this.$backend('/admin/install', {
                method: 'POST',
                body: data,
            })
            .then( rsp => {
                if ( rsp.err != 'ok' ) {
                    this.$alert("error", rsp.msg);
                } else {
                    this.tips += "配置写入成功！<br/>正在检测服务器...";
                    setTimeout( () => {
                        this.check_install();
                    }, 5000);
                }
            });
        },
    },
}
</script>

