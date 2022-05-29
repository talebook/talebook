<template>
    <div>
        <v-card class="my-2 elevation-4" v-for="card in cards" :key="card.title" >
            <v-card-title @click="card.show = !card.show">
                <v-btn @click.once="card.show = !card.show" icon>
                    <v-icon>{{ card.show ? 'keyboard_arrow_down' : 'keyboard_arrow_up' }}</v-icon>
                </v-btn>
                {{card.title}}
            </v-card-title>
    
            <v-card-text v-show="card.show">
                <p v-if="card.subtitle" class="">{{card.subtitle}}</p>

                <template v-if="card.tips">
                    <p v-for="t in card.tips" :key="t.text">{{t.text}} <a v-if="t.link" target="_blank" :href="t.link">链接</a></p>
                </template>

                <template v-for="f in card.fields">
                    <v-checkbox small hide-details v-if="f.type === 'checkbox' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-checkbox>
                    <v-textarea outlined v-else-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-textarea>
                    <v-text-field v-else :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" type="text"></v-text-field>
                </template>
                <template v-for="b in card.buttons">
                    <v-btn :key="b.label" @click="run(b.action)" color="primary"><v-icon>{{b.icon}}</v-icon>{{b.label}}</v-btn>
                </template>

                <template v-for="g in card.groups" >
                    <v-checkbox small hide-details v-model="settings[g.key]" :key="g.label" :label="g.label"></v-checkbox>
                    <template v-if="settings[g.key]">
                        <template v-for="f in g.fields">
                            <v-textarea outlined v-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" ></v-textarea>
                            <v-text-field v-else :prepend-icon="f.icon" v-model="settings[f.key]" :key="f.key" :label="f.label" type="text"></v-text-field>
                        </template>
                    </template>
                </template>

                <template v-if="card.show_friends">
                    <v-row v-for="(friend, idx) in settings.FRIENDS" :key="'friend-'+friend.href">
                        <v-col class='py-0' cols=3>
                            <v-text-field flat small hide-details single-line v-model="friend.text" label="名称" type="text"></v-text-field>
                        </v-col>
                        <v-col class='pa-0' cols=9>
                            <v-text-field flat small hide-details single-line v-model="friend.href" label="链接" type="text"
                                append-outer-icon="delete" @click:append-outer="settings.FRIENDS.splice(idx, 1)" ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col align="center">
                            <v-btn color="primary" @click="settings.FRIENDS.push({text:'', href: ''})"><v-icon>add</v-icon>添加</v-btn>
                        </v-col>
                    </v-row>
                </template>

                <template v-if="card.show_socials">
                    <p>所启用的社交网络将会在登录页面自动显示按钮。</p>
                    <v-combobox v-model="settings.SOCIALS" :items="sns_items" label="选择要启用的社交网络账号" hide-selected multiple small-chips>
                        <template v-slot:selection="{ attrs, item, parent, selected }">
                            <v-chip v-bind="attrs" color="green lighten-3" :input-value="selected" label small >
                                <span class="pr-2"> {{ item.text }} </span>
                                <v-icon small @click="parent.selectItem(item)" >close</v-icon>
                            </v-chip>
                        </template>
                    </v-combobox>
                    <v-row v-for="s in settings.SOCIALS" :key="'social-'+s.value" >
                        <v-col class='py-0' cols=12 sm=2>
                            <v-subheader class="px-0 pt-4" :class="$vuetify.breakpoint.smAndUp?'float-right':''">
                                {{s.text}}  (<a @click="show_sns_config(s)">说明</a>)
                            </v-subheader>
                        </v-col>
                        <v-col class='py-0' cols=12 sm=3>
                            <v-text-field small hide-details single-line v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_KEY']" label="Key" type="text"></v-text-field>
                        </v-col>
                        <v-col class='py-0' cols=12 sm=7>
                            <v-text-field small hide-details single-line v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_SECRET']" label="Secret" type="text"></v-text-field>
                        </v-col>
                    </v-row>
                </template>

                <template v-if="card.show_ssl">
                    <ssl-manager />
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
import SSLManager from "~/components/SSLManager.vue";
export default {
    components: {
        "ssl-manager": SSLManager,
    },
    created() {
        this.$backend("/admin/settings").then(rsp => {
            this.sns_items = rsp.sns;
            this.settings = rsp.settings;
            this.site_url = rsp.site_url;

            var m = {}
            rsp.sns.forEach(function(ele){
                m[ele.value] = ele;
            });
            this.settings.SOCIALS.forEach(function(ele){
                ele.help = false;
                ele.link = m[ele.value].link;
            })
        });
    },
    data: () => ({
        combo_input: "",
        sns: {},
        sns_items: [],
        settings: { },
        site_url: "",

        cards: [
            {
            show: false,
            title: "基础信息",
            fields: [
                { icon: "home", key: "site_title", label: "网站标题", },
                { icon: "mdi-copyright", key: "FOOTER", label: "网站脚注", type: 'textarea' },
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
            title: "用户设置",
            fields: [
                { icon: "", key: "ALLOW_GUEST_READ", label: "允许访客在线阅读（无需注册和登录）", type: 'checkbox' },
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
            title: '社交网络登录',
            fields: [ ],
            show_socials: true,
        },
        {
            show: false,
            title: "邮件服务",
            subtitle: '邮箱注册、推送Kindle依赖此配置(请确保您的服务器或VPS服务商已开通SMTP服务的25端口)',
            fields: [
                { icon: "email", key: "smtp_server", label: "SMTP服务器" },
                { icon: "person", key: "smtp_username", label: "SMTP用户名" },
                { icon: "lock", key: "smtp_password", label: "SMTP密码" },
            ],
            buttons: [
                { icon: "email", label: "测试邮件", action: "test_email" },
            ],
        },
        {
            show: false,
            title: '友情链接',
            fields: [ ],
            show_friends: true,
        },
        {
            show: false,
            title: "高级配置项",
            fields: [
                { icon: "home", key: "static_host", label: "CDN域名" },
                // 后续可以修改为choice下拉框选项
                { icon: "info", key: "BOOK_NAMES_FORMAT", label: "目录和文件名模式（utf8为保留原始中文，en表示拼音英文）" },
                { icon: "info", key: "avatar_service", label: "可使用www.gravatar.com或cravatar.cn头像服务" },
                { icon: "info", key: "MAX_UPLOAD_SIZE", label: "文件上传字节数限制(例如100MB或100KB）" },
                { icon: "info", key: "douban_baseurl", label: "豆瓣插件API地址(例如 http://10.0.0.1:8080 )" },
                { icon: "info", key: "douban_max_count", label: "豆瓣插件API查询结果数量" },
                { icon: "lock", key: "cookie_secret", label: "COOKIE随机密钥" },
                { icon: "info", key: "scan_upload_path", label: "批量导入扫描目录" },
                { icon: "", key: "autoreload", label: "更新配置后自动重启服务器(首次开启需人工重启)", type: 'checkbox' },
            ],
            tips: [
                {
                    text: "若需要调整Logo，或启用豆瓣插件，请参阅安装文档的说明。",
                    link: "https://github.com/talebook/talebook/blob/master/document/INSTALL.zh_CN.md#%E5%85%B6%E4%BB%96%E9%85%8D%E7%BD%AE",
                }
            ],
        },

        {
            show: false,
            title: "SSL证书管理",
            fields: [],
            show_ssl: true,
        },

        ],
    }),
    methods: {
        save_settings: function() {
            this.$backend("/admin/settings", {
                method: 'POST',
                body: JSON.stringify(this.settings),
            })
            .then( rsp => {
                if ( rsp.err != 'ok' ) {
                    this.$alert('error', rsp.msg);
                } else {
                    this.$alert('success', '保存成功！可能需要5~10秒钟生效！');
                }
            });
        },
        show_sns_config: function(s) {
            var msg = `请前往${s.text}的 <a :href="${s.link}" target="_blank">配置页面</a> 获取密钥，并设置回调地址（callback URL）为
            <code>${this.site_url}/auth/complete/${s.value}.do</code>`;
            this.$alert("success", msg);
        },
        test_email: function() {
            var data = new URLSearchParams();
            data.append('smtp_server', this.settings['smtp_server']);
            data.append('smtp_username', this.settings['smtp_username']);
            data.append('smtp_password', this.settings['smtp_password']);
            this.$backend("/admin/testmail", {
                method: 'POST',
                body: data,
            }).then( rsp => {
                if ( rsp.err != 'ok' ) {
                    this.$alert('error', rsp.msg);
                } else {
                    this.$alert('success', rsp.msg);
                }
            });
        },
        run: function(func) {
            this[func]();
        },
    },
  }
</script>

<style>
.cursor-pointer {
    cursor: pointer;
}
</style>

