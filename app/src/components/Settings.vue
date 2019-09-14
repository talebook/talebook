<template>
    <div>
        <v-card class="my-2 elevation-4" v-for="card in cards" :key="card.title" >
            <v-card-actions @click="card.show = !card.show">
                <v-btn icon>
                    <v-icon>{{ card.show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                </v-btn>
                <v-card-title><span class="subtitle-2">{{card.title}}</span></v-card-title>
            </v-card-actions>
            <v-card-text v-show="card.show">
                <template v-for="f in card.fields">
                    <v-checkbox v-if="f.type === 'checkbox' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-checkbox>
                    <v-textarea v-else-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-textarea>
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

                <template v-if="card.show_socials">
                    <v-combobox v-model="social.select" :items="social.items" label="选择要启用的社交网络账号" hide-selected multiple small-chips>
                        <template v-slot:selection="{ attrs, item, parent, selected }">
                            <v-chip v-bind="attrs" color="green lighten-3" :input-value="selected" label small >
                                <span class="pr-2"> {{ item.text }} </span>
                                <v-icon small @click="parent.selectItem(item)" >close</v-icon>
                            </v-chip>
                        </template>
                    </v-combobox>
                    <v-row v-for="s in social.select" :key="'social-'+s.value" >
                        <v-col cols=12 sm=2>
                            <v-subheader class="pa-0" :class="$vuetify.breakpoint.smAndUp?'float-right':''">配置{{s.text}} OAuth</v-subheader>
                        </v-col>
                        <v-col cols=12 sm=5>
                            <v-text-field small hide-details solo v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_KEY']" label="Key" type="text"></v-text-field>
                        </v-col>
                        <v-col cols=12 sm=5>
                            <v-text-field small hide-details solo v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_SECRET']" label="Secret" type="text"></v-text-field>
                        </v-col>
                    </v-row>
                </template>

            </v-card-text>
        </v-card>
        <br/>
        <div class="text-center">
            <v-btn color="primary" @click="save_settings">保存</v-btn>
        </div>
    </div>
</template>

<script>
export default {
    created() {
        this.$store.commit("loading");
        this.backend("/admin/settings")
        .then(rsp=>{
            this.settings = rsp.settings
            this.social = rsp.social
            this.$store.commit("loaded");
        });
    },
    data: () => ({
        combo_input: "",
        social: {
            select: [],
            items: [],
        },
        settings: { },

        cards: [
            {
            show: false,
            title: "基础配置",
            fields: [
                { icon: "home", key: "site_title", label: "网站标题", },
            ],
            groups: [
            {
                key: "INVITE_MODE",
                label: "开启私人图书馆模式",
                fields: [
                    { icon: "lock", key: "INVITE_CODE", label: "访问码" },
                    { icon: "person", key: "INVITE_MESSAGE", type: 'textarea', label: "提示语" },
                ],
            },
            ],
        },
        {
            show: false,
            title: "用户权限配置",
            fields: [
                { icon: "", key: "ALLOW_GUEST_DOWNLOAD", label: "允许任意下载（访客无需注册和登录）", type: 'checkbox' },
                { icon: "", key: "ALLOW_GUEST_PUSH", label: "允许任意推送Kindle（访客无需注册和登录）", type: 'checkbox' },
            ],
            groups: [
            {
                key: "ALLOW_REGISTER",
                label: "允许访客以邮箱注册账号",
                fields: [
                    { icon: "info", key: "SIGNUP_MAIL_TITLE", label: "激活邮件标题" },
                    { icon: "info", key: "SIGNUP_MAIL_CONTENT", label: "激活邮件正文", type: 'textarea' },
                    { icon: "info", key: "RESET_MAIL_TITLE", label: "重置密码邮件标题" },
                    { icon: "info", key: "RESET_MAIL_CONTENT", label: "重置密码邮件正文", type: 'textarea' },
                ],
            },
            ],
        },

        {
            show: false,
            title: '配置社交网络登录',
            fields: [ ],
            show_socials: true,
        },
        {
            show: false,
            title: "配置邮件服务器（邮箱注册、推送Kindle依赖此配置）",
            fields: [
                { icon: "email", key: "smtp_server", label: "SMTP服务器" },
                { icon: "person", key: "smtp_username", label: "SMTP用户名" },
                { icon: "lock", key: "smtp_password", label: "SMTP密码" },
            ],
        },
        {
            show: false,
            title: "高级配置项",
            fields: [
                { icon: "home", key: "static_host", label: "CDN域名" },
                { icon: "lock", key: "cookie_secret", label: "COOKIE随机密钥" },
                { icon: "", key: "autoreload", label: "开启Tornado自动重载", type: 'checkbox' },
            ],
        },

        ],
    }),
    methods: {
        save_settings: function() {
            this.backend("/admin/settings", {
                method: 'POST',
                body: JSON.stringify(this.settings),
            })
            .then( rsp => {
                if ( rsp.err != 'ok' ) {
                    this.alert('error', rsp.msg);
                } else {
                    this.alert('success', '保存成功！可能需要5~10秒钟生效！');
                }
            });
        },
    },
  }
</script>

