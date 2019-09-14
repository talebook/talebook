<template>
    <v-row align-center justify=center>
        <v-col xs=12 sm=8 md=4>
            <v-card class="elevation-12">
                <v-toolbar dark color="primary">
                    <v-toolbar-title>安装 Calibre-Webserver</v-toolbar-title>
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
    created() {
        this.$store.commit("navbar", false);
        this.$store.commit("loaded", true);
    },
    data: () => ({
        e1: 1,
        username: "admin",
        password: "",
        email: "",
        code: "",
        invite: false,
        title: "Calibre Webserver",
        rules: {
            user: v => v.length >= 5 || 'Min 6 characters',
            pass: v => v.length >= 8 || 'Min 8 characters',
            email: function (email) {
                var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                return re.test(email) || "Invalid email format";
            },
        },

    }),
    methods: {
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
            this.backend('/admin/install', {
                method: 'POST',
                body: data,
            }).then( rsp => rsp.json() )
            .then( rsp => {
                if ( rsp.err != 'ok' ) {
                    this.alert("error", rsp.msg);
                } else {
                    alert("安装成功，正在跳转到首页")
                    this.$store.commit("navbar", true);
                    this.$router.push("/");
                }
            });
        },
    },

}
</script>

