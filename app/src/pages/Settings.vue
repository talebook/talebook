<template>
    <v-row>
        <v-col xs=10 offset-xs1 >

    <v-tabs v-model="tab_active" color="primary" dark slider-color="yellow" >
        <v-tab key="system" ripple>系统设置</v-tab>
        <v-tab key="user" ripple>用户管理</v-tab>
        <v-tab key="message" ripple>消息管理</v-tab>

        <v-tab-item key="system" >
            <p>Todo: System Manage</p>
        </v-tab-item>

        <v-tab-item key="message">
            <p>Todo: Message Manage</p>
        </v-tab-item>
        <v-tab-item key="user">
            <p>Todo: User Manage</p>
        </v-tab-item>

    </v-tabs>

            <v-card v-for="card in cards" :key="card.title" >
                <v-card-actions>
                    <v-btn icon @click="card.show = !card.show">
                        <v-icon>{{ card.show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                    </v-btn>
            <v-card-title><h3>{{card.title}}</h3></v-card-title>
                </v-card-actions>
                <v-card-text v-show="card.show">
                    <template v-for="f in card.fields">
                    <v-textarea v-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-textarea>
                    <v-text-field v-else :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" type="text"></v-text-field>
                    </template>

                    <template v-for="g in card.groups" >
                    <v-checkbox v-model="g.value" :key="g.label" :label="g.label"></v-checkbox>
                    <template v-if="g.value">
                        <template v-for="f in g.fields">
                        <v-textarea v-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-textarea>
                        <v-text-field v-else :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" type="text"></v-text-field>
                        </template>
                    </template>
                    </template>
                </v-card-text>
            </v-card>
            <br/>
            <div class="text-xs-center">
                <v-btn color="primary" @click="save_settings">保存</v-btn>
            </div>
        </v-col>
    </v-row>
</template>

<script>
export default {
    created()  {
        this.$store.commit('navbar', true);
    },
    data: () => ({
        tab_active: "user",
        show1: false,
        show2: false,
        show3: false,
        enable_secret_login: false,
        enable_email_push: false,
        enable_local: false,
        enable_qq: false,
        enable_weixin: false,
        enable_weibo: false,
        enable_github: false,
        site_title: "",
        social_auth_github_key: "",
        path_library: "",

        settings: {
            smtp_server: "",
            smtp_username: "",
            smtp_password: "",
            smtp_title: "",
            smtp_text: "",

            enable_secret_login: false,
            enable_email_push: false,
            enable_local: false,
            enable_qq: false,
            enable_weixin: false,
            enable_weibo: false,
            enable_github: false,
            site_title: "",
            social_auth_github_key: "",
            path_library: "",
        },

        cards: [
            {
            show: false,
            title: "网站基础信息配置",
            fields: [
                { icon: "person", key: "site_title", label: "网站标题", },
            ],
            groups: [
            {
                key: "enable_secret_login",
                label: "开启私人图书馆模式",
                fields: [
                    { icon: "person", key: "login_pass", label: "私人访问密码" },
                ],
            },
            {
                key: "enable_email_push",
                label: "开启Kindle邮件推送",
                fields: [
                    { icon: "person", key: "smtp_server", label: "SMTP服务器" },
                    { icon: "person", key: "smtp_username", label: "用户名" },
                    { icon: "person", key: "smtp_password", label: "密码" },
                    { icon: "person", key: "smtp_title", label: "邮件标题" },
                    { icon: "person", key: "smtp_text", label: "邮件正文" },
                ],
            },
            ],
        },
        {
            show: false,
            title: "用户设置",
            groups: [
            {
                key: "enable_local",
                label: "允许游客以邮箱注册账号",
                fields: [
                    { icon: "person", key: "signup_msg", label: "注册欢迎词", },
                ],
            },
            {
                key: "enable_qq",
                label: "允许游客以QQ账号登录",
                fields: [
                    { icon: "person", key: "social_auth_qq_key", label: "QQ Auth Key", },
                    { icon: "person", key: "social_auth_qq_secret", label: "QQ Auth Secret", },
                ],
            },
            {
                key: "enable_weixin",
                label: "允许游客以Weixin账号登录",
                fields: [
                    { icon: "person", key: "social_auth_weixin_key", label: "Weixin Auth Key" },
                    { icon: "person", key: "social_auth_weixin_secret", label: "Weixin Auth Secret" },
                ],
            },
            {
                key: "enable_github",
                label: "允许游客以Github账号登录",
                fields: [
                    { icon: "person", key: "social_auth_github_key", label: "Github Auth Key" },
                    { icon: "person", key: "social_auth_github_secret", label: "Github Auth Secret" },
                ],
            },
            {
                key: "enable_weibo",
                label: "允许游客以Weibo账号登录",
                fields: [
                    { icon: "person", key: "social_auth_weibo_key", label: "Weibo Auth Key" },
                    { icon: "person", key: "social_auth_weibo_secret", label: "Weibo Auth Secret" },
                ],
            },
            ],
        },

        {
            show: false,
            title: '系统路径',
            fields: [
                { icon: "person", key: "path_library", label: "metadata.db书库的路径" },
            ],
        },

        ],
    }),
    methods: {
        save_settings: function() {
            alert( JSON.stringify(this.settings) );
        },
    },
  }
</script>

<style>

</style>
