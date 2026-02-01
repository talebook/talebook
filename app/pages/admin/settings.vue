
<template>
    <div>
        <v-card class="my-2 elevation-4" v-for="card in cards" :key="card.title" >
            <v-card-title @click="card.show = !card.show" class="cursor-pointer">
                <v-btn icon variant="text" size="small" class="mr-2">
                    <v-icon>{{ card.show ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
                </v-btn>
                {{card.title}}
            </v-card-title>
          <v-expand-transition>
            <div v-show="card.show">
              <v-card-text style="padding: 0 16px 16px">
                <p v-if="card.subtitle" class="mb-4 text-medium-emphasis">{{card.subtitle}}</p>
                <template v-if="card.tips">
                  <p v-for="t in card.tips" :key="t.text" class="text-caption mb-2">
                    {{t.text}} <a v-if="t.link" target="_blank" :href="t.link">链接</a>
                  </p>
                </template>

                <template v-for="f in card.fields" :key="f.key" >
                  <v-checkbox density="compact" hide-details v-if="f.type === 'checkbox' " :prepend-icon="f.icon" v-model="settings[f.key]" :label="f.label" color="primary"></v-checkbox>
                  <v-textarea variant="outlined" v-else-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :label="f.label" rows="3"></v-textarea>
                  <v-select density="compact" hide-details v-else-if="f.type === 'select' " :prepend-icon="f.icon" v-model="settings[f.key]" :items="f.items" :label="f.label" item-title="text" item-value="value"> </v-select>
                  <v-text-field v-else :prepend-icon="f.icon" v-model="settings[f.key]" :label="f.label" type="text"></v-text-field>
                </template>
                
                <div v-if="card.buttons && card.buttons.length" class="mt-2 mb-2">
                    <template v-for="b in card.buttons" :key="b.label" >
                      <v-btn @click="run(b.action)" color="primary" class="mr-2">
                        <v-icon start>{{b.icon}}</v-icon>{{b.label}}
                      </v-btn>
                    </template>
                </div>

                <template v-for="g in card.groups" :key="g.label" >
                  <v-checkbox density="compact" hide-details v-model="settings[g.key]" :label="g.label" color="primary"></v-checkbox>
                  <div v-if="settings[g.key]" class="ml-4 pl-4 border-left">
                    <template v-for="f in g.fields" :key="f.key" >
                      <v-textarea variant="outlined" v-if="f.type === 'textarea' " :prepend-icon="f.icon" v-model="settings[f.key]" :label="f.label" rows="3"></v-textarea>
                      <v-text-field v-else :prepend-icon="f.icon" v-model="settings[f.key]" :label="f.label" type="text"></v-text-field>
                    </template>
                  </div>
                </template>

                <template v-if="card.show_friends">
                  <v-row v-for="(friend, idx) in settings.FRIENDS" :key="'friend-'+idx" align="center">
                    <v-col class='py-1' cols=3>
                      <v-text-field density="compact" hide-details variant="underlined" v-model="friend.text" label="名称" type="text"></v-text-field>
                    </v-col>
                    <v-col class='py-1' cols=9>
                      <v-text-field density="compact" hide-details variant="underlined" v-model="friend.href" label="链接" type="text">
                        <template v-slot:append>
                            <v-icon @click="settings.FRIENDS.splice(idx, 1)" color="error">mdi-delete</v-icon>
                        </template>
                      </v-text-field>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col align="center">
                      <v-btn color="primary" @click="settings.FRIENDS.push({text:'', href: ''})"><v-icon start>mdi-plus</v-icon>添加</v-btn>
                    </v-col>
                  </v-row>
                </template>

                <template v-if="card.show_socials">
                  <p class="mb-4">所启用的社交网络将会在登录页面自动显示按钮。</p>
                  <v-combobox 
                    v-model="settings.SOCIALS" 
                    :items="sns_items" 
                    label="选择要启用的社交网络账号" 
                    hide-selected 
                    multiple 
                    chips 
                    closable-chips
                    item-title="text"
                    item-value="value"
                    return-object
                  >
                  </v-combobox>
                  
                  <div v-for="s in settings.SOCIALS" :key="'social-'+s.value" class="mt-4 pa-2 border rounded">
                      <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-subtitle-1 font-weight-bold">{{s.text}}</span>
                        <a @click="show_sns_config(s)" class="text-caption text-decoration-underline cursor-pointer">配置说明</a>
                      </div>
                      <v-row dense>
                        <v-col cols=12 sm=5>
                          <v-text-field density="compact" hide-details v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_KEY']" label="Key/AppID" type="text"></v-text-field>
                        </v-col>
                        <v-col cols=12 sm=7>
                          <v-text-field density="compact" hide-details v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_SECRET']" label="Secret/Key" type="text"></v-text-field>
                        </v-col>
                      </v-row>
                  </div>
                </template>

                <template v-if="card.show_ssl">
                  <SSLManager />
                </template>
              </v-card-text>
            </div>
          </v-expand-transition>
        </v-card>

        <br/>
        <div class="text-center mb-8">
            <v-btn color="primary" size="large" @click="save_settings">保存配置</v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SSLManager from "~/components/SSLManager.vue"
import { useMainStore } from '@/stores/main'

const store = useMainStore()
const { $backend, $alert } = useNuxtApp()

store.setNavbar(true)

const sns_items = ref([])
const settings = ref({ FRIENDS: [], SOCIALS: [] }) // Init with defaults to avoid v-if errors
const site_url = ref("")

const cards = ref([
    {
    show: true,
    title: "基础信息",
    fields: [
        { icon: "mdi-home", key: "site_title", label: "网站标题", },
        { icon: "mdi-copyright", key: "HEADER", label: "网站公告", type: 'textarea' },
        { icon: "mdi-copyright", key: "FOOTER", label: "网站脚注", type: 'textarea' },
        { icon: "mdi-code-tags", key: "FOOTER_EXTRA_HTML", label: "页脚额外HTML内容", type: 'textarea' },
        { icon: "mdi-code-tags", key: "SIDEBAR_EXTRA_HTML", label: "侧边栏额外HTML内容", type: 'textarea' },
        { key: "SHOW_SIDEBAR_SYS", label: "在侧边栏中显示系统信息", type: 'checkbox' },
    ],
    groups: [
    {
        key: "ALLOW_FEEDBACK",
        label: "显示反馈按钮",
        fields: [
            { icon: "mdi-link", key: "FEEDBACK_URL", label: "反馈按钮跳转地址" },
        ],
    },
    {
        key: "INVITE_MODE",
        label: "开启私人图书馆模式",
        fields: [
            { icon: "mdi-lock", key: "INVITE_CODE", label: "访问码" },
            { icon: "mdi-account", key: "INVITE_MESSAGE", type: 'textarea', label: "提示语" },
        ],
    },
    ],
},
{
    show: false,
    title: "用户设置",
    groups: [
    {
        key: "ALLOW_REGISTER",
        label: "允许访客以邮箱注册账号",
        fields: [
            { icon: "mdi-information", key: "SIGNUP_MAIL_TITLE", label: "激活邮件标题" },
            { icon: "mdi-information", key: "SIGNUP_MAIL_CONTENT", label: "激活邮件正文", type: 'textarea' },
            { icon: "mdi-information", key: "RESET_MAIL_TITLE", label: "重置密码邮件标题" },
            { icon: "mdi-information", key: "RESET_MAIL_CONTENT", label: "重置密码邮件正文", type: 'textarea' },
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
    subtitle: '邮箱注册、推送Kindle依赖此配置(SMTP服务器地址可带端口，或者不带端口，默认为465号)',
    fields: [
        { icon: "mdi-email", key: "smtp_server", label: "SMTP服务器（例如 smtp-mail.outlook.com:587）" },
        { icon: "mdi-account", key: "smtp_username", label: "SMTP用户名（例如 user@gmail.com）" },
        { icon: "mdi-lock", key: "smtp_password", label: "SMTP密码" },
        { icon: "mdi-information", key: "smtp_encryption", label: "SMTP安全性", type: 'select',
            items: [{text: "SSL", value: "SSL"}, {text: "TLS(多数邮箱为此选项)", value: "TLS"} ]
        },
    ],
    buttons: [
        { icon: "mdi-email-check", label: "测试邮件", action: "test_email" },
    ],
},
{
    show: false,
    title: "书籍标签分类",
    subtitle: '配置「分类导航」页面里预设的分类。添加书籍时，若书名或者作者名称出现以下分类，则自动添加对应的标签。',
    fields: [
        { icon: "mdi-tag-multiple", key: "BOOK_NAV", type: 'textarea', label: "分类" },
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
    title: "互联网书籍信息源",
    fields: [
        { icon: "", key: "auto_fill_meta", label: "自动从互联网拉取新书的书籍信息", type: 'checkbox' },
        { icon: "mdi-information", key: "douban_baseurl", label: "豆瓣插件API地址(例如 http://10.0.0.1:8080 )" },
        { icon: "mdi-information", key: "douban_max_count", label: "豆瓣插件API查询结果数量" },
    ],
    tips: [
        {
            text: "若需要启用豆瓣插件，请参阅安装文档的说明。若出现失败，可尝试更换镜像，例如 talebook/douban-api-rs ",
            link: "https://github.com/talebook/talebook/blob/master/document/README.zh_CN.md#%E5%A6%82%E6%9E%9C%E9%85%8D%E7%BD%AE%E8%B1%86%E7%93%A3%E6%8F%92%E4%BB%B6",
        }
    ],
},

{
    show: false,
    title: "高级配置项",
    fields: [
        { icon: "mdi-home", key: "static_host", label: "CDN域名" },
        { icon: "mdi-information", key: "BOOK_NAMES_FORMAT", label: "目录和文件名模式", type: 'select',
            items: [{text: "使用拼音字母目录名 (兼容性高)", value: "en"}, {text: "使用中文目录名 (UTF8编码，更美观)", value: "utf8"} ]
        },
        { icon: "mdi-information", key: "EPUB_VIEWER", label: "EPUB阅读器", type: 'select',
            items: [{text: "Epub Reader（旧版）", value: "epubjs.html"}, {text: "Candle Reader（Beta版，支持章评功能）", value: "creader.html"} ]
        },
        { icon: "mdi-information", key: "avatar_service", label: "可使用www.gravatar.com或cravatar.cn头像服务" },
        { icon: "mdi-information", key: "MAX_UPLOAD_SIZE", label: "文件上传字节数限制(例如100MB或100KB）" },
        { icon: "mdi-lock", key: "cookie_secret", label: "COOKIE随机密钥" },
        { icon: "mdi-folder", key: "scan_upload_path", label: "批量导入扫描目录" },
        { icon: "mdi-information", key: "push_title", label: "邮件推送的标题" },
        { icon: "mdi-information", key: "push_content", label: "邮件推送的内容" },
        { icon: "mdi-clock", key: "convert_timeout", label: "书籍转换格式的最大超时时间（秒）" },
        { icon: "", key: "autoreload", label: "更新配置后自动重启服务器(首次开启需人工重启)", type: 'checkbox' },
    ],
    tips: [
        {
            text: "若需要调整Logo，请参阅安装文档的说明。",
            link: "https://github.com/talebook/talebook/blob/master/document/README.zh_CN.md#logo",
        }
    ],
},

{
    show: false,
    title: "SSL证书管理",
    fields: [],
    show_ssl: true,
},
])

onMounted(() => {
    $backend("/admin/settings").then(rsp => {
        sns_items.value = rsp.sns;
        settings.value = rsp.settings;
        site_url.value = rsp.site_url;

        var m = {}
        rsp.sns.forEach(function(ele){
            m[ele.value] = ele;
        });
        
        // Populate link info for selected socials if available
        if (settings.value.SOCIALS) {
            settings.value.SOCIALS.forEach(function(ele){
                ele.help = false;
                if (m[ele.value]) {
                    ele.link = m[ele.value].link;
                }
            })
        } else {
            settings.value.SOCIALS = []
        }
        
        if (!settings.value.FRIENDS) {
            settings.value.FRIENDS = []
        }
    });
})

const save_settings = () => {
    $backend("/admin/settings", {
        method: 'POST',
        body: JSON.stringify(settings.value),
    })
    .then( rsp => {
        if ( rsp.err != 'ok' ) {
            if ($alert) $alert('error', rsp.msg);
        } else {
            if ($alert) $alert('success', '保存成功！可能需要5~10秒钟生效！');
        }
    });
}

const show_sns_config = (s) => {
    var msg = `请前往${s.text}的 <a href="${s.link}" target="_blank">配置页面</a> 获取密钥，并设置回调地址（callback URL）为<br/>
    <code>${site_url.value}/auth/complete/${s.value}.do</code>`;
    if ($alert) $alert("success", msg);
}

const test_email = () => {
    var data = new URLSearchParams();
    data.append('smtp_server', settings.value['smtp_server']);
    data.append('smtp_username', settings.value['smtp_username']);
    data.append('smtp_password', settings.value['smtp_password']);
    data.append('smtp_encryption', settings.value['smtp_encryption']);
    
    $backend("/admin/testmail", {
        method: 'POST',
        body: data,
    }).then( rsp => {
        if ( rsp.err != 'ok' ) {
            if ($alert) $alert('error', rsp.msg);
        } else {
            if ($alert) $alert('success', rsp.msg);
        }
    });
}

// Map function names to methods
const run = (func) => {
    if (func === 'test_email') test_email()
}

useHead({
    title: "系统设置"
})
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
.border-left {
    border-left: 2px solid #eee;
}
</style>
