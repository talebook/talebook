
<template>
    <div>
        <v-card
            v-for="card in cards"
            :key="card.title"
            class="my-2 elevation-4"
        >
            <v-card-title
                class="cursor-pointer py-4 pl-2"
                @click="card.show = !card.show"
            >
                <v-btn
                    icon
                    variant="text"
                    size="small"
                    class="mr-1"
                >
                    <v-icon>{{ card.show ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
                </v-btn>
                {{ card.title }}
            </v-card-title>
            <v-expand-transition>
                <div v-show="card.show">
                    <v-card-text style="padding: 0 16px 16px">
                        <p
                            v-if="card.subtitle"
                            class="mb-4 text-medium-emphasis"
                        >
                            {{ card.subtitle }}
                        </p>
                        <template v-if="card.tips">
                            <p
                                v-for="t in card.tips"
                                :key="t.text"
                                class="text-caption mb-2"
                            >
                                {{ t.text }} <a
                                    v-if="t.link"
                                    target="_blank"
                                    :href="t.link"
                                >链接</a>
                            </p>
                        </template>

                        <template
                            v-for="f in card.fields"
                            :key="f.key"
                        >
                            <v-checkbox
                                v-if="f.type === 'checkbox' "
                                v-model="settings[f.key]"
                                density="compact"
                                hide-details
                                :prepend-icon="f.icon"
                                :label="f.label"
                                color="primary"
                            />
                            <v-textarea
                                v-else-if="f.type === 'textarea' "
                                v-model="settings[f.key]"
                                variant="outlined"
                                :prepend-icon="f.icon"
                                :label="f.label"
                                rows="3"
                            />
                            <v-select
                                v-else-if="f.type === 'select' "
                                v-model="settings[f.key]"
                                hide-details
                                class="mb-4"
                                :prepend-icon="f.icon"
                                :items="f.items"
                                :label="f.label"
                                item-title="text"
                                item-value="value"
                            />
                            <v-text-field
                                v-else
                                v-model="settings[f.key]"
                                :prepend-icon="f.icon"
                                :label="f.label"
                                type="text"
                            />
                        </template>
                
                        <div
                            v-if="card.buttons && card.buttons.length"
                            class="mt-2 mb-2"
                        >
                            <template
                                v-for="b in card.buttons"
                                :key="b.label"
                            >
                                <v-btn
                                    color="primary"
                                    class="mr-2"
                                    @click="run(b.action)"
                                >
                                    <v-icon start>
                                        {{ b.icon }}
                                    </v-icon>{{ b.label }}
                                </v-btn>
                            </template>
                        </div>

                        <template
                            v-for="g in card.groups"
                            :key="g.label"
                        >
                            <v-checkbox
                                v-model="settings[g.key]"
                                density="compact"
                                hide-details
                                :label="g.label"
                                color="primary"
                            />
                            <div
                                v-if="settings[g.key]"
                                class="ml-4 pl-4 border-left"
                            >
                                <template
                                    v-for="f in g.fields"
                                    :key="f.key"
                                >
                                    <v-textarea
                                        v-if="f.type === 'textarea' "
                                        v-model="settings[f.key]"
                                        variant="outlined"
                                        :prepend-icon="f.icon"
                                        :label="f.label"
                                        rows="3"
                                    />
                                    <v-text-field
                                        v-else
                                        v-model="settings[f.key]"
                                        :prepend-icon="f.icon"
                                        :label="f.label"
                                        type="text"
                                    />
                                </template>
                            </div>
                        </template>

                        <template v-if="card.show_friends">
                            <v-row
                                v-for="(friend, idx) in settings.FRIENDS"
                                :key="'friend-'+idx"
                                align="center"
                            >
                                <v-col
                                    class="py-1"
                                    cols="3"
                                >
                                    <v-text-field
                                                v-model="friend.text"
                                                density="compact"
                                                hide-details
                                                variant="underlined"
                                                :label="t('settings.fields.friend_name')"
                                                type="text"
                                            />
                                </v-col>
                                <v-col
                                    class="py-1"
                                    cols="9"
                                >
                                    <v-text-field
                                        v-model="friend.href"
                                        density="compact"
                                        hide-details
                                        variant="underlined"
                                        :label="t('settings.fields.friend_link')"
                                        type="text"
                                    >
                                        <template #append>
                                            <v-icon
                                                color="error"
                                                @click="settings.FRIENDS.splice(idx, 1)"
                                            >
                                                mdi-delete
                                            </v-icon>
                                        </template>
                                    </v-text-field>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col align="center">
                                    <v-btn
                                        color="primary"
                                        @click="settings.FRIENDS.push({text:'', href: ''})"
                                    >
                                        <v-icon start>
                                            mdi-plus
                                            </v-icon>{{ t('actions.add') }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </template>

                        <template v-if="card.show_socials">
                            <p class="mb-4">
                                {{ t('settings.socials.enabled_hint') }}
                            </p>
                            <v-combobox 
                                v-model="settings.SOCIALS" 
                                :items="sns_items" 
                                :label="t('settings.fields.select_socials')" 
                                hide-selected 
                                multiple 
                                chips 
                                closable-chips
                                item-title="text"
                                item-value="value"
                                return-object
                            />
                  
                            <div
                                v-for="s in settings.SOCIALS"
                                :key="'social-'+s.value"
                                class="mt-4 pa-2 border rounded"
                            >
                                <div class="d-flex align-center justify-space-between mb-2">
                                    <span class="text-subtitle-1 font-weight-bold">{{ s.text }}</span>
                                    <a
                                        class="text-caption text-decoration-underline cursor-pointer"
                                        @click="show_sns_config(s)"
                                    >配置说明</a>
                                </div>
                                <v-row dense>
                                    <v-col
                                        cols="12"
                                        sm="5"
                                    >
                                        <v-text-field
                                            v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_KEY']"
                                            density="compact"
                                            hide-details
                                            :label="t('settings.fields.key_appid')"
                                            type="text"
                                        />
                                    </v-col>
                                    <v-col
                                        cols="12"
                                        sm="7"
                                    >
                                        <v-text-field
                                            v-model="settings['SOCIAL_AUTH_'+s.value.toUpperCase()+'_SECRET']"
                                            density="compact"
                                            hide-details
                                            :label="t('settings.fields.secret_key')"
                                            type="text"
                                        />
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

        <br>
        <div class="text-center mb-8">
            <v-btn
                color="primary"
                size="large"
                @click="save_settings"
            >
                {{ t('actions.saveSettings') }}
            </v-btn>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import SSLManager from '~/components/SSLManager.vue';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

store.setNavbar(true);

const sns_items = ref([]);
const settings = ref({ FRIENDS: [], SOCIALS: [] }); // Init with defaults to avoid v-if errors
const site_url = ref('');

const cards = ref([
    {
        show: false,
        title: t('settings.card.basic'),
        fields: [
            { icon: 'mdi-home', key: 'site_title', label: t('settings.fields.site_title'), },
            { icon: 'mdi-copyright', key: 'HEADER', label: t('settings.fields.header'), type: 'textarea' },
            { icon: 'mdi-copyright', key: 'FOOTER', label: t('settings.fields.footer'), type: 'textarea' },
            { icon: 'mdi-code-tags', key: 'FOOTER_EXTRA_HTML', label: t('settings.fields.footer_extra_html'), type: 'textarea' },
            { icon: 'mdi-code-tags', key: 'SIDEBAR_EXTRA_HTML', label: t('settings.fields.sidebar_extra_html'), type: 'textarea' },
            { key: 'SHOW_SIDEBAR_SYS', label: t('settings.fields.show_sidebar_sys'), type: 'checkbox' },
        ],
        groups: [
            {
                key: 'ALLOW_FEEDBACK',
                label: t('settings.groups.show_feedback'),
                fields: [
                    { icon: 'mdi-link', key: 'FEEDBACK_URL', label: t('settings.fields.feedback_url') },
                ],
            },
            {
                key: 'INVITE_MODE',
                label: t('settings.groups.invite_mode'),
                fields: [
                    { icon: 'mdi-lock', key: 'INVITE_CODE', label: t('settings.fields.invite_code') },
                    { icon: 'mdi-account', key: 'INVITE_MESSAGE', type: 'textarea', label: t('settings.fields.invite_message') },
                ],
            },
        ],
    },
    {
        show: false,
        title: t('settings.card.users'),
        groups: [
            {
                key: 'ALLOW_REGISTER',
                label: t('settings.groups.allow_register'),
                fields: [
                    { icon: 'mdi-information', key: 'SIGNUP_MAIL_TITLE', label: t('settings.fields.signup_mail_title') },
                    { icon: 'mdi-information', key: 'SIGNUP_MAIL_CONTENT', label: t('settings.fields.signup_mail_content'), type: 'textarea' },
                    { icon: 'mdi-information', key: 'RESET_MAIL_TITLE', label: t('settings.fields.reset_mail_title') },
                    { icon: 'mdi-information', key: 'RESET_MAIL_CONTENT', label: t('settings.fields.reset_mail_content'), type: 'textarea' },
                ],
            },
        ],
    },

    {
        show: false,
        title: t('settings.card.socials'),
        fields: [ ],
        show_socials: true,
    },
    {
        show: false,
        title: t('settings.card.mail'),
        subtitle: t('settings.subtitle.mail'),
        fields: [
            { icon: 'mdi-email', key: 'smtp_server', label: t('settings.fields.smtp_server') },
            { icon: 'mdi-account', key: 'smtp_username', label: t('settings.fields.smtp_username') },
            { icon: 'mdi-lock', key: 'smtp_password', label: t('settings.fields.smtp_password') },
            { icon: 'mdi-information', key: 'smtp_encryption', label: t('settings.fields.smtp_encryption'), type: 'select',
                items: [{text: 'SSL', value: 'SSL'}, {text: 'TLS(多数邮箱为此选项)', value: 'TLS'} ]
            },
        ],
        buttons: [
            { icon: 'mdi-email-check', label: t('settings.buttons.test_email'), action: 'test_email' },
        ],
    },
    {
        show: false,
        title: t('settings.card.book_nav'),
        subtitle: t('settings.subtitle.book_nav'),
        fields: [
            { icon: 'mdi-tag-multiple', key: 'BOOK_NAV', type: 'textarea', label: t('settings.fields.book_nav') },
        ],
    },
    {
        show: false,
        title: t('settings.card.friends'),
        fields: [ ],
        show_friends: true,
    },

    {
        show: false,
        title: t('settings.card.metaSources'),
        fields: [
            { icon: '', key: 'auto_fill_meta', label: t('settings.fields.autoFillMeta'), type: 'checkbox' },
            { icon: 'mdi-information', key: 'douban_baseurl', label: t('settings.fields.doubanBaseUrl') },
            { icon: 'mdi-information', key: 'douban_max_count', label: t('settings.fields.doubanMaxCount') },
        ],
        tips: [
            {
                text: t('settings.tips.doubanPlugin'),
                link: 'https://github.com/talebook/talebook/blob/master/document/README.zh_CN.md#%E5%A6%82%E6%9E%9C%E9%85%8D%E7%BD%AE%E8%B1%86%E7%93%A3%E6%8F%92%E4%BB%B6',
            }
        ],
    },

    {
        show: false,
        title: t('settings.card.advanced'),
        fields: [
            { icon: 'mdi-home', key: 'static_host', label: t('settings.fields.staticHost') },
            { icon: 'mdi-information', key: 'BOOK_NAMES_FORMAT', label: t('settings.fields.bookNamesFormat'), type: 'select',
                items: [{text: t('settings.options.bookNamesFormat.en'), value: 'en'}, {text: t('settings.options.bookNamesFormat.utf8'), value: 'utf8'} ]
            },
            { icon: 'mdi-information', key: 'EPUB_VIEWER', label: t('settings.fields.epubViewer'), type: 'select',
                items: [{text: t('settings.options.epubViewer.epubjs'), value: 'epubjs.html'}, {text: t('settings.options.epubViewer.creader'), value: 'creader.html'} ]
            },
            { icon: 'mdi-information', key: 'avatar_service', label: t('settings.fields.avatarService') },
            { icon: 'mdi-information', key: 'MAX_UPLOAD_SIZE', label: t('settings.fields.maxUploadSize') },
            { icon: 'mdi-lock', key: 'cookie_secret', label: t('settings.fields.cookieSecret') },
            { icon: 'mdi-folder', key: 'scan_upload_path', label: t('settings.fields.scanUploadPath') },
            { icon: 'mdi-information', key: 'push_title', label: t('settings.fields.pushTitle') },
            { icon: 'mdi-information', key: 'push_content', label: t('settings.fields.pushContent') },
            { icon: 'mdi-clock', key: 'convert_timeout', label: t('settings.fields.convertTimeout') },
            { icon: '', key: 'autoreload', label: t('settings.fields.autoreload'), type: 'checkbox' },
        ],
        tips: [
            {
                text: t('settings.tips.logo'),
                link: 'https://github.com/talebook/talebook/blob/master/document/README.zh_CN.md#logo',
            }
        ],
    },

    {
        show: false,
        title: t('settings.card.ssl'),
        fields: [],
        show_ssl: true,
    },
    {
        show: false,
        title: t('settings.card.opds'),
        fields: [
            { icon: 'mdi-book-open-variant', key: 'OPDS_ENABLED', label: t('settings.fields.opdsEnabled'), type: 'checkbox' },
        ],
        tips: [
            {
                text: t('settings.tips.opds'),
            }
        ],
    },
]);

onMounted(() => {
    $backend('/admin/settings').then(rsp => {
        sns_items.value = rsp.sns;
        settings.value = rsp.settings;
        site_url.value = rsp.site_url;

        var m = {};
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
            });
        } else {
            settings.value.SOCIALS = [];
        }
        
        if (!settings.value.FRIENDS) {
            settings.value.FRIENDS = [];
        }
    });
});

const save_settings = () => {
    $backend('/admin/settings', {
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
};

const show_sns_config = (s) => {
    var msg = `请前往${s.text}的 <a href="${s.link}" target="_blank">配置页面</a> 获取密钥，并设置回调地址（callback URL）为<br/>
    <code>${site_url.value}/auth/complete/${s.value}.do</code>`;
    if ($alert) $alert('success', msg);
};

const test_email = () => {
    var data = new URLSearchParams();
    data.append('smtp_server', settings.value['smtp_server']);
    data.append('smtp_username', settings.value['smtp_username']);
    data.append('smtp_password', settings.value['smtp_password']);
    data.append('smtp_encryption', settings.value['smtp_encryption']);
    
    $backend('/admin/testmail', {
        method: 'POST',
        body: data,
    }).then( rsp => {
        if ( rsp.err != 'ok' ) {
            if ($alert) $alert('error', rsp.msg);
        } else {
            if ($alert) $alert('success', rsp.msg);
        }
    });
};

// Map function names to methods
const run = (func) => {
    if (func === 'test_email') test_email();
};

useHead({
    title: () => t('admin.settingsTitle')
});
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
.border-left {
    border-left: 2px solid #eee;
}
</style>
