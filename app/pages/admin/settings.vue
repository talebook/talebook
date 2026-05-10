
<template>
    <div>
        <v-card
            v-for="card in cards"
            :key="card.key"
            class="my-2 elevation-4"
        >
            <v-card-title
                class="cursor-pointer py-4 pl-2"
                @click="cardShows[card.key] = !cardShows[card.key]"
            >
                <v-btn
                    icon
                    variant="text"
                    size="small"
                    class="mr-1"
                >
                    <v-icon>{{ cardShows[card.key] ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
                </v-btn>
                {{ card.title }}
            </v-card-title>
            <v-expand-transition>
                <div v-show="cardShows[card.key]">
                    <v-card-text style="padding: 0 16px 16px">
                        <p
                            v-if="card.subtitle"
                            class="mb-4 text-medium-emphasis"
                        >
                            {{ card.subtitle }}
                        </p>
                        <template v-if="card.tips">
                            <p
                                v-for="tip in card.tips"
                                :key="tip.text"
                                class="text-caption mb-2"
                            >
                                {{ tip.text }} <a
                                    v-if="tip.link"
                                    target="_blank"
                                    :href="tip.link"
                                >{{ t('common.link') }}</a>
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
                                :prepend-icon="f.icon"
                                :items="f.items"
                                :label="f.label"
                                hide-details
                                class="mb-4"
                                item-title="text"
                                item-value="value"
                            />
                            <template
                                v-else-if="f.type === 'meta_sources'"
                            >
                                <v-select
                                    v-model="settings['META_SELECTED_SOURCES']"
                                    :items="metaSourceItems"
                                    :label="f.label"
                                    :prepend-icon="f.icon"
                                    multiple
                                    chips
                                    closable-chips
                                    item-title="text"
                                    item-value="value"
                                >
                                </v-select>
                            </template>
                            <v-text-field
                                v-else-if="f.type === 'number'"
                                v-model.number="settings[f.key]"
                                :prepend-icon="f.icon"
                                :label="f.label"
                                type="number"
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
                                v-if="!g.show_when || g.show_when()"
                                v-model="settings[g.key]"
                                density="compact"
                                hide-details
                                :label="g.label"
                                color="primary"
                            />
                            <div
                                v-if="settings[g.key] && g.fields"
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

                        <!-- 人机验证配置字段 -->
                        <template v-if="card.captcha_fields && settings.CAPTCHA_PROVIDER">
                            <div
                                v-if="card.captcha_fields.some(f => !f.show_when || f.show_when())"
                                class="mt-4 pa-2 border rounded"
                            >
                                <template
                                    v-for="f in card.captcha_fields"
                                    :key="f.key"
                                >
                                    <v-text-field
                                        v-if="!f.show_when || f.show_when()"
                                        v-model="settings[f.key]"
                                        density="compact"
                                        hide-details
                                        class="mb-2"
                                        :prepend-icon="f.icon"
                                        :label="f.label"
                                        :type="f.type || 'text'"
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
                                        :label="t('admin.settings.label.name')"
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
                                        :label="t('admin.settings.label.link')"
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
                                        </v-icon>{{ t('common.add') }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </template>

                        <template v-if="card.show_devices">
                            <v-row
                                v-for="(device, idx) in settings.DEVICES"
                                :key="'device-' + idx"
                            >
                                <v-col
                                    class="py-0"
                                    cols="2"
                                >
                                    <v-text-field
                                        v-model="device.name"
                                        density="compact"
                                        hide-details
                                        variant="underlined"
                                        :label="t('settings.deviceName')"
                                        type="text"
                                        maxlength="64"
                                    />
                                </v-col>
                                <v-col
                                    class="py-0"
                                    cols="2"
                                >
                                    <v-select
                                        v-model="device.type"
                                        :items="deviceTypes"
                                        item-title="text"
                                        item-value="value"
                                        density="compact"
                                        hide-details
                                        variant="underlined"
                                        :label="t('settings.deviceType')"
                                    />
                                </v-col>
                                <template v-if="device.type === 'kindle'">
                                    <v-col
                                        class="py-0"
                                        cols="6"
                                    >
                                        <v-text-field
                                            v-model="device.mailbox"
                                            density="compact"
                                            hide-details
                                            variant="underlined"
                                            :label="t('settings.deviceMailbox')"
                                            type="email"
                                            placeholder="user@kindle.com"
                                        />
                                    </v-col>
                                </template>
                                <template v-else>
                                    <v-col
                                        class="py-0"
                                        cols="2"
                                    >
                                        <v-text-field
                                            v-model="device.ip"
                                            density="compact"
                                            hide-details
                                            variant="underlined"
                                            :label="t('settings.deviceIp')"
                                            type="text"
                                        />
                                    </v-col>
                                    <v-col
                                        class="py-0"
                                        cols="2"
                                    >
                                        <v-text-field
                                            v-model.number="device.port"
                                            density="compact"
                                            hide-details
                                            variant="underlined"
                                            :label="t('settings.devicePort')"
                                            type="number"
                                        />
                                    </v-col>
                                    <v-col
                                        class="py-0"
                                        cols="2"
                                    >
                                        <v-select
                                            v-model="device.schema"
                                            :items="deviceSchemas"
                                            density="compact"
                                            hide-details
                                            variant="underlined"
                                            :label="t('settings.deviceSchema')"
                                        />
                                    </v-col>
                                </template>
                                <v-col
                                    class="py-0"
                                    cols="1"
                                    align-self="end"
                                >
                                    <v-btn
                                        icon
                                        size="small"
                                        @click="settings.DEVICES.splice(idx, 1)"
                                    >
                                        <v-icon>mdi-delete</v-icon>
                                    </v-btn>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col align="center">
                                    <v-btn
                                        color="primary"
                                        @click="settings.DEVICES.push({
                                            name: t('settings.defaultReaderName'),
                                            type: 'duokan',
                                            ip: '',
                                            port: 12121,
                                            schema: 'http',
                                        })"
                                    >
                                        <v-icon start>
                                            mdi-plus
                                        </v-icon>{{ t('settings.add') }}
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </template>

                        <template v-if="card.show_socials">
                            <p class="mb-4">
                                {{ t('admin.settings.message.socialLoginInfo') }}
                            </p>
                            <v-combobox 
                                v-model="settings.SOCIALS" 
                                :items="sns_items" 
                                :label="t('admin.settings.label.selectSocialAccounts')" 
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
                                    >{{ t('admin.settings.label.configurationGuide') }}</a>
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
                                            :label="t('admin.settings.label.keyAppid')"
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
                                            :label="t('admin.settings.label.secretKey')"
                                            type="text"
                                        />
                                    </v-col>
                                </v-row>
                            </div>
                        </template>

                        <template v-if="card.show_ssl">
                            <SSLManager />
                        </template>

                        <template v-if="card.show_trash">
                            <div class="text-center">
                                <p v-html="t('admin.settings.message.trashDescription')" style="margin-bottom: 16px"></p>
                                <div style="font-size: 1.2em; margin-bottom: 8px">
                                    {{ t("admin.settings.label.trashCalibreSize") }}
                                    <span style="font-weight: bold; color: #1976d2; margin-left: 8px">{{ trashSizeTexts.trash }}</span>
                                </div>
                                <div style="font-size: 1.2em; margin-bottom: 16px">
                                    {{ t("admin.settings.label.trashUploadSize") }}
                                    <span style="font-weight: bold; color: #1976d2; margin-left: 8px">{{ trashSizeTexts.upload }}</span>
                                </div>
                                <v-btn
                                    color="red"
                                    dark
                                    @click="trashConfirmDialog = true"
                                    style="margin-bottom: 24px"
                                    :disabled="trashSizes.trash + trashSizes.upload <= 10 * 1048576"
                                >
                                    <v-icon start>mdi-delete</v-icon>{{ t("admin.settings.button.trashClear") }}
                                </v-btn>
                            </div>
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
                {{ t('admin.settings.button.saveSettings') }}
            </v-btn>
        </div>

        <v-dialog v-model="trashConfirmDialog" max-width="400" persistent>
            <v-card>
                <v-card-title class="headline">{{
                    t("admin.settings.button.trashClearConfirm")
                }}</v-card-title>
                <v-card-text>{{
                    t("admin.settings.message.trashClearConfirm")
                }}</v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn text @click="trashConfirmDialog = false">{{
                        t('common.cancel')
                    }}</v-btn>
                    <v-btn color="red" dark @click="clearTrash">{{
                        t("admin.settings.button.trashClearConfirm")
                    }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SSLManager from '~/components/SSLManager.vue';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();

store.setNavbar(true);

const sns_items = ref([]);
const deviceTypes = ref([
    { text: '多看阅读器', value: 'duokan' },
    { text: '掌阅', value: 'ireader' },
    { text: '汉王', value: 'hanwang' },
    { text: '文石Boox', value: 'boox' },
    { text: '当当阅读器', value: 'dangdang' },
    { text: 'Kindle', value: 'kindle' },
    { text: 'PureLibro', value: 'purelibro' },
]);
const deviceSchemas = ref(['http', 'https']);
const settings = ref({ FRIENDS: [], SOCIALS: [], DEVICES: [] }); // Init with defaults to avoid v-if errors
const site_url = ref('');
const trashSizes = ref({ trash: 0, upload: 0 });
const trashSizeTexts = ref({ trash: '', upload: '' });
const trashLoading = ref(false);
const trashConfirmDialog = ref(false);

// Store card expand/collapse states separately from computed cards
const cardShows = ref({
    basicInfo: false,
    userSettings: false,
    socialLogin: false,
    emailService: false,
    bookCategories: false,
    friendshipLinks: false,
    deviceManagement: false,
    bookInfoSources: false,
    advancedSettings: false,
    sslManagement: false,
    opdsSettings: false,
    captchaSettings: false,
    trashManagement: false,
});

// 人机验证提供商选项
const captchaProviders = [
    { text: t('admin.settings.option.none'), value: '' },
    { text: t('admin.settings.option.image'), value: 'image' },
    { text: t('admin.settings.option.geetest'), value: 'geetest' },
];

const cards = computed(() => [
    {
        key: 'basicInfo',
        title: t('admin.settings.section.basicInfo'),
        fields: [
            { icon: 'mdi-home', key: 'site_title', label: t('admin.settings.label.siteTitle'), },
            { icon: 'mdi-copyright', key: 'HEADER', label: t('admin.settings.label.siteAnnouncement'), type: 'textarea' },
            { icon: 'mdi-copyright', key: 'FOOTER', label: t('admin.settings.label.siteFooter'), type: 'textarea' },
            { icon: 'mdi-code-tags', key: 'FOOTER_EXTRA_HTML', label: t('admin.settings.label.footerExtraHtml'), type: 'textarea' },
            { icon: 'mdi-code-tags', key: 'SIDEBAR_EXTRA_HTML', label: t('admin.settings.label.sidebarExtraHtml'), type: 'textarea' },
            // 首页设置
            { icon: 'mdi-shuffle', key: 'MAIN_PAGE_RANDOM_COUNT', label: t('admin.settings.label.mainPageRandomCount'), type: 'select',
                items: [0, 12, 24, 48, 96, 192, 768].map((v) => ({ text: String(v), value: v }))
            },
            { icon: 'mdi-book-multiple', key: 'MAIN_PAGE_RECENT_COUNT', label: t('admin.settings.label.mainPageRecentCount'), type: 'select',
                items: [12, 24, 48, 96, 192].map((v) => ({ text: String(v), value: v }))
            },
            { icon: 'mdi-book-multiple', key: 'DEFAULT_PAGE_SIZE', label: t('admin.settings.label.defaultPageSize'), type: 'select',
                items: [60, 100, 200, 500, 1000].map((v) => ({ text: String(v), value: v }))
            },
            { key: 'SHOW_SIDEBAR_SYS', label: t('admin.settings.label.showSidebarSys'), type: 'checkbox' },
        ],
        groups: [
            {
                key: 'ALLOW_FEEDBACK',
                label: t('admin.settings.label.showFeedback'),
                fields: [
                    { icon: 'mdi-link', key: 'FEEDBACK_URL', label: t('admin.settings.label.feedbackUrl') },
                ],
            },
            {
                key: 'INVITE_MODE',
                label: t('admin.settings.label.inviteMode'),
                fields: [
                    { icon: 'mdi-lock', key: 'INVITE_CODE', label: t('admin.settings.label.inviteCode') },
                    { icon: 'mdi-account', key: 'INVITE_MESSAGE', type: 'textarea', label: t('admin.settings.label.inviteMessage') },
                ],
            },
        ],
    },
    {
        key: 'userSettings',
        title: t('admin.settings.section.userSettings'),
        groups: [
            {
                key: 'ALLOW_REGISTER',
                label: t('admin.settings.label.allowRegister'),
                fields: [
                    { icon: 'mdi-information', key: 'SIGNUP_MAIL_TITLE', label: t('admin.settings.label.activationEmailTitle') },
                    { icon: 'mdi-information', key: 'SIGNUP_MAIL_CONTENT', label: t('admin.settings.label.activationEmailContent'), type: 'textarea' },
                    { icon: 'mdi-information', key: 'RESET_MAIL_TITLE', label: t('admin.settings.label.resetPasswordEmailTitle') },
                    { icon: 'mdi-information', key: 'RESET_MAIL_CONTENT', label: t('admin.settings.label.resetPasswordEmailContent'), type: 'textarea' },
                ],
            },
        ],
    },

    {
        key: 'socialLogin',
        title: t('admin.settings.section.socialLogin'),
        fields: [ ],
        show_socials: true,
    },
    {
        key: 'emailService',
        title: t('admin.settings.section.emailService'),
        subtitle: t('admin.settings.message.emailServiceInfo'),
        fields: [
            { icon: 'mdi-email', key: 'smtp_server', label: t('admin.settings.label.smtpServer') },
            { icon: 'mdi-account', key: 'smtp_username', label: t('admin.settings.label.smtpUsername') },
            { icon: 'mdi-lock', key: 'smtp_password', label: t('admin.settings.label.smtpPassword') },
            { icon: 'mdi-information', key: 'smtp_encryption', label: t('admin.settings.label.smtpEncryption'), type: 'select',
                items: [{text: t('admin.settings.option.ssl'), value: 'SSL'}, {text: t('admin.settings.option.tls'), value: 'TLS'} ]
            },
        ],
        buttons: [
            { icon: 'mdi-email-check', label: t('admin.settings.button.testEmail'), action: 'test_email' },
        ],
    },
    {
        key: 'bookCategories',
        title: t('admin.settings.section.bookCategories'),
        subtitle: t('admin.settings.message.bookCategoriesInfo'),
        fields: [
            { icon: 'mdi-tag-multiple', key: 'BOOK_NAV', type: 'textarea', label: t('admin.settings.label.categories') },
        ],
    },
    {
        key: 'friendshipLinks',
        title: t('admin.settings.section.friendshipLinks'),
        fields: [ ],
        show_friends: true,
    },

    {
        key: 'deviceManagement',
        title: t('settings.deviceMgt'),
        subtitle: t('settings.deviceMgtDescription'),
        fields: [ ],
        show_devices: true,
    },

    {
        key: 'bookInfoSources',
        title: t('admin.settings.section.bookInfoSources'),
        subtitle: t('admin.settings.message.bookInfoSourcesInfo'),
        fields: [
            { icon: '', key: 'auto_fill_meta', label: t('admin.settings.label.autoFillMeta'), type: 'checkbox' },
            { 
                icon: 'mdi-source-branch',
                key: 'META_SELECTED_SOURCES',
                label: t('admin.settings.label.metaSelectedSource'),
                type: 'meta_sources'
            },
            { icon: 'mdi-information', key: 'douban_baseurl', label: t('admin.settings.label.doubanBaseurl') },
            { icon: 'mdi-key', key: 'douban_apikey', label: t('admin.settings.label.doubanApiKey') },
            { icon: 'mdi-information', key: 'douban_max_count', label: t('admin.settings.label.doubanMaxCount') },
            { icon: 'mdi-information', key: 'ai_api_url', label: 'AI API 地址' },
            { icon: 'mdi-key', key: 'ai_api_key', label: 'AI API Key' },
            { icon: 'mdi-information', key: 'ai_model', label: 'AI 模型' },
            { key: 'ai_use_thinking', label: '启用思考模式', type: 'checkbox' },
        ],
        tips: [
            {
                text: t('admin.settings.message.doubanPluginInfo'),
                link: 'https://github.com/talebook/talebook/blob/master/document/README.zh_CN.md#%E5%A6%82%E6%9E%9C%E9%85%8D%E7%BD%AE%E8%B1%86%E7%93%A3%E6%8F%92%E4%BB%B6',
            }
        ],
    },
    {
        key: 'opdsSettings',
        title: t('admin.settings.section.opdsSettings'),
        fields: [
            { icon: 'mdi-book-open-variant', key: 'OPDS_ENABLED', label: t('admin.settings.label.opdsEnabled'), type: 'checkbox' },
        ],
        tips: [
            {
                text: t('admin.settings.message.opdsInfo'),
            }
        ],
    },
    {
        key: 'captchaSettings',
        title: t('admin.settings.section.captchaSettings'),
        subtitle: t('admin.settings.message.captchaInfo'),
        fields: [
            {
                icon: 'mdi-shield-check',
                key: 'CAPTCHA_PROVIDER',
                label: t('admin.settings.label.captchaProvider'),
                type: 'select',
                items: captchaProviders
            },
        ],
        groups: [
            {
                key: 'CAPTCHA_ENABLE_FOR_REGISTER',
                label: t('admin.settings.label.captchaEnableForRegister'),
                show_when: () => ['image', 'geetest'].includes(settings.value.CAPTCHA_PROVIDER),
            },
            {
                key: 'CAPTCHA_ENABLE_FOR_LOGIN',
                label: t('admin.settings.label.captchaEnableForLogin'),
                show_when: () => ['image', 'geetest'].includes(settings.value.CAPTCHA_PROVIDER),
            },
            {
                key: 'CAPTCHA_ENABLE_FOR_WELCOME',
                label: t('admin.settings.label.captchaEnableForWelcome'),
                show_when: () => ['image', 'geetest'].includes(settings.value.CAPTCHA_PROVIDER),
            },
            {
                key: 'CAPTCHA_ENABLE_FOR_RESET',
                label: t('admin.settings.label.captchaEnableForReset'),
                show_when: () => ['image', 'geetest'].includes(settings.value.CAPTCHA_PROVIDER),
            },
        ],
        captcha_fields: [
            { icon: 'mdi-key', key: 'GEETEST_CAPTCHA_ID', label: t('admin.settings.label.geetestCaptchaId'), show_when: () => settings.value.CAPTCHA_PROVIDER === 'geetest' },
            { icon: 'mdi-lock', key: 'GEETEST_CAPTCHA_KEY', label: t('admin.settings.label.geetestCaptchaKey'), type: 'password', show_when: () => settings.value.CAPTCHA_PROVIDER === 'geetest' },
        ],
    },
    {
        key: 'advancedSettings',
        title: t('admin.settings.section.advancedSettings'),
        fields: [
            { icon: 'mdi-home', key: 'static_host', label: t('admin.settings.label.staticHost') },
            { icon: 'mdi-information', key: 'BOOK_NAMES_FORMAT', label: t('admin.settings.label.bookNamesFormat'), type: 'select',
                items: [{text: t('admin.settings.option.pinyinDir'), value: 'en'}, {text: t('admin.settings.option.chineseDir'), value: 'utf8'} ]
            },
            { icon: 'mdi-information', key: 'EPUB_VIEWER', label: t('admin.settings.label.epubViewer'), type: 'select',
                items: [{text: t('admin.settings.option.oldEpubReader'), value: 'epubjs.html'}, {text: t('admin.settings.option.candleReader'), value: 'creader.html'} ]
            },
            { icon: 'mdi-information', key: 'avatar_service', label: t('admin.settings.label.avatarService') },
            { icon: 'mdi-information', key: 'MAX_UPLOAD_SIZE', label: t('admin.settings.label.maxUploadSize') },
            { icon: 'mdi-lock', key: 'cookie_secret', label: t('admin.settings.label.cookieSecret') },
            { icon: 'mdi-folder', key: 'scan_upload_path', label: t('admin.settings.label.scanUploadPath') },
            { icon: 'mdi-information', key: 'push_title', label: t('admin.settings.label.pushTitle') },
            { icon: 'mdi-information', key: 'push_content', label: t('admin.settings.label.pushContent') },
            { icon: 'mdi-clock', key: 'convert_timeout', label: t('admin.settings.label.convertTimeout') },
            { icon: '', key: 'autoreload', label: t('admin.settings.label.autoreload'), type: 'checkbox' },
        ],
        tips: [
            {
                text: t('admin.settings.message.logoInfo'),
                link: 'https://github.com/talebook/talebook/blob/master/document/README.zh_CN.md#logo',
            }
        ],
    },

    {
        key: 'sslManagement',
        title: t('admin.settings.section.sslManagement'),
        fields: [],
        show_ssl: true,
    },
    {
        key: 'trashManagement',
        title: t('admin.settings.section.trashManagement'),
        fields: [],
        show_trash: true,
    },
]);

// 元数据源选项
const metaSourceItems = computed(() => {
    const allSources = settings.value['META_ALL_SOURCES'] || [
        'douban',
        'baidu',
        'google',
        'amazon',
        'xinhua',
        'ai',
    ];
    return allSources.map((source) => ({
        text: source === 'ai' ? 'AI' : t('admin.settings.meta_source.' + source),
        value: source,
    }));
});

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
        if (!settings.value.DEVICES) {
            settings.value.DEVICES = [];
        }
    });
    
    fetchTrashSize();
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
                if ($alert) $alert('success', t('admin.settings.message.saveSuccess'));
            }
        });
};

const show_sns_config = (s) => {
    var msg = `${t('admin.settings.message.goTo')}${s.text}${t('admin.settings.message.configurationPage')} <a href="${s.link}" target="_blank">${t('common.link')}</a> ${t('admin.settings.message.getKeysAndSetCallback')}<br/>
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

const run = (func) => {
    if (func === 'test_email') test_email();
};

const fetchTrashSize = () => {
    trashLoading.value = true;
    $backend('/admin/trash/size').then(rsp => {
        trashLoading.value = false;
        if (rsp && rsp.err === 'ok' && rsp.sizes) {
            trashSizes.value = rsp.sizes;
            trashSizeTexts.value = {
                trash: formatTrashSize(rsp.sizes.trash),
                upload: formatTrashSize(rsp.sizes.upload),
            };
            // 开发模式下显示实际路径用于调试
            if (process.dev) {
                console.log('Trash paths:', {
                    trash: rsp.trash_path,
                    upload: rsp.upload_path,
                });
            }
        } else {
            trashSizeTexts.value = {
                trash: t('admin.settings.label.trashUnknown'),
                upload: t('admin.settings.label.trashUnknown'),
            };
        }
    });
};

const formatTrashSize = (size) => {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(2) + ' MB';
    return (size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
};

const clearTrash = () => {
    trashConfirmDialog.value = false;
    $backend('/admin/trash/clear', {
        method: 'POST',
    }).then(rsp => {
        if (rsp && rsp.err === 'ok') {
            if ($alert) $alert('success', rsp.msg);
            fetchTrashSize();
        } else {
            if ($alert) $alert('error', rsp.msg);
        }
    });
};

useHead(() => ({
    title: t('admin.settings.title')
}));
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
.border-left {
    border-left: 2px solid #eee;
}
</style>
