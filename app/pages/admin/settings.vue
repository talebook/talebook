
<template>
    <div class="settings-page">
        <!-- 悬浮固定标题栏：左标题 + 右保存 -->
        <div class="settings-titlebar">
            <h1 class="settings-page-title">
                {{ t('admin.settings.title') }}
            </h1>
            <v-btn
                color="primary"
                @click="save_settings"
            >
                {{ t('admin.settings.button.saveSettings') }}
            </v-btn>
        </div>

        <!-- 窄屏：顶部下拉跳转 -->
        <v-select
            v-if="display.smAndDown.value"
            :model-value="activeKey"
            :items="navSelectItems"
            :label="t('admin.settings.label.navSection')"
            variant="outlined"
            density="compact"
            hide-details
            item-title="title"
            item-value="key"
            class="mt-3 mb-4"
            @update:model-value="scrollToSection"
        />

        <div class="settings-body">
            <!-- 左侧导航 -->
            <nav
                v-if="!display.smAndDown.value"
                class="settings-nav"
            >
                <template
                    v-for="grp in navGroups"
                    :key="grp.key"
                >
                    <div class="settings-nav-group">
                        {{ grp.title }}
                    </div>
                    <button
                        v-for="item in grp.items"
                        :key="item.key"
                        type="button"
                        class="settings-nav-item"
                        :class="{ active: activeKey === item.key }"
                        :data-navkey="item.key"
                        @click="scrollToSection(item.key)"
                    >
                        {{ item.title }}
                    </button>
                </template>
            </nav>

            <!-- 右侧内容 -->
            <div class="settings-content">
                <section
                    v-for="card in orderedCards"
                    :id="'sec-' + card.key"
                    :key="card.key"
                    :data-key="card.key"
                    class="settings-section"
                >
                    <h2 class="settings-section-title">
                        {{ card.title }}
                    </h2>
                    <div class="settings-section-body">
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
                            <template v-if="!f.show_when || f.show_when()">
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
                                    density="compact"
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
                                    density="compact"
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
                                        density="compact"
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
                                    density="compact"
                                    type="number"
                                />
                                <v-text-field
                                    v-else
                                    v-model="settings[f.key]"
                                    :prepend-icon="f.icon"
                                    :label="f.label"
                                    density="compact"
                                    type="text"
                                />
                            </template>
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
                                        density="compact"
                                        :prepend-icon="f.icon"
                                        :label="f.label"
                                        rows="3"
                                    />
                                    <v-text-field
                                        v-else
                                        v-model="settings[f.key]"
                                        :prepend-icon="f.icon"
                                        :label="f.label"
                                        density="compact"
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

                        <template v-if="card.show_db">
                            <div class="pa-2">
                                <p class="text-body-2 text-medium-emphasis mb-4">
                                    {{ t('admin.settings.message.dbInfo') }}
                                </p>
                                <div class="mb-4">
                                    <span class="text-subtitle-2 font-weight-medium">{{ t('admin.settings.message.currentDb') }}:</span>
                                    <v-chip
                                        size="small"
                                        class="ml-2"
                                        color="primary"
                                    >
                                        {{ settings.user_database && settings.user_database.startsWith('sqlite') ? t('admin.settings.option.dbSqlite') : t('admin.settings.option.dbMysql') }}
                                    </v-chip>
                                </div>
                                <p class="text-subtitle-2 font-weight-medium mb-2">
                                    {{ t('admin.settings.message.newDbConfig') }}
                                </p>
                                <v-select
                                    v-model="dbNewType"
                                    prepend-icon="mdi-database"
                                    :label="t('admin.settings.label.dbType')"
                                    :items="dbTypeOptions"
                                    item-title="text"
                                    item-value="value"
                                    density="compact"
                                    hide-details
                                    class="mb-4"
                                />
                                <template v-if="dbNewType === 'mysql'">
                                    <v-row dense>
                                        <v-col cols="9">
                                            <v-text-field
                                                v-model="dbNewHost"
                                                prepend-icon="mdi-server"
                                                :label="t('admin.settings.label.dbHost')"
                                                density="compact"
                                                hide-details
                                            />
                                        </v-col>
                                        <v-col cols="3">
                                            <v-text-field
                                                v-model.number="dbNewPort"
                                                :label="t('admin.settings.label.dbPort')"
                                                type="number"
                                                density="compact"
                                                hide-details
                                            />
                                        </v-col>
                                    </v-row>
                                    <v-text-field
                                        v-model="dbNewName"
                                        prepend-icon="mdi-database"
                                        :label="t('admin.settings.label.dbName')"
                                        density="compact"
                                        class="mt-2"
                                    />
                                    <v-text-field
                                        v-model="dbNewUser"
                                        prepend-icon="mdi-account"
                                        :label="t('admin.settings.label.dbUser')"
                                        density="compact"
                                    />
                                    <v-text-field
                                        v-model="dbNewPass"
                                        prepend-icon="mdi-lock"
                                        :label="t('admin.settings.label.dbPass')"
                                        type="password"
                                        density="compact"
                                    />
                                    <div class="mt-2 d-flex gap-2">
                                        <v-btn
                                            variant="outlined"
                                            :loading="dbTesting"
                                            class="mr-2"
                                            @click="testDbConnection"
                                        >
                                            <v-icon start>mdi-connection</v-icon>
                                            {{ t('admin.settings.button.testDbConnection') }}
                                        </v-btn>
                                        <v-btn
                                            color="warning"
                                            :loading="dbMigrating"
                                            @click="dbMigrateDialog = true"
                                        >
                                            <v-icon start>mdi-database-arrow-right</v-icon>
                                            {{ t('admin.settings.button.migrateDb') }}
                                        </v-btn>
                                    </div>
                                </template>
                            </div>
                        </template>

                        <template v-if="card.show_ssl">
                            <SSLManager />
                        </template>

                        <template v-if="card.show_update">
                            <div class="pa-2">
                                <div class="d-flex align-center mb-2">
                                    <v-icon color="primary" class="mr-2">mdi-update</v-icon>
                                    <span class="text-subtitle-2 font-weight-medium">{{ t('admin.settings.label.currentVersion') }}:</span>
                                    <v-chip size="small" class="ml-2" color="primary">{{ updateInfo.current_version || '—' }}</v-chip>
                                </div>
                                <div v-if="updateInfo.has_update" class="d-flex align-center mb-2">
                                    <v-icon color="success" class="mr-2">mdi-arrow-up-bold</v-icon>
                                    <span class="text-subtitle-2 font-weight-medium">{{ t('admin.settings.label.latestVersion') }}:</span>
                                    <v-chip size="small" class="ml-2" color="success">{{ updateInfo.latest_version }}</v-chip>
                                    <v-btn
                                        v-if="updateInfo.latest_release_url"
                                        variant="text"
                                        size="small"
                                        class="ml-2"
                                        :href="updateInfo.latest_release_url"
                                        target="_blank"
                                    >
                                        <v-icon start size="small">mdi-open-in-new</v-icon>{{ t('admin.settings.button.viewRelease') }}
                                    </v-btn>
                                </div>
                                <div v-else-if="updateInfo.latest_version" class="d-flex align-center mb-2">
                                    <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
                                    <span class="text-success">{{ t('admin.settings.message.upToDate') }}</span>
                                </div>
                                <p v-if="updateInfo.check_error" class="text-error text-caption mb-2">
                                    {{ t('admin.settings.message.checkError') }}: {{ updateInfo.check_error }}
                                </p>
                                <p v-if="updateInfo.last_check_time" class="text-caption text-medium-emphasis mb-2">
                                    {{ t('admin.settings.label.lastCheckTime') }}: {{ formatCheckTime(updateInfo.last_check_time) }}
                                </p>
                                <div v-if="updateInfo.has_update && updateInfo.latest_release_body" class="mb-2">
                                    <div class="text-caption text-medium-emensity" style="white-space: pre-wrap; max-height: 200px; overflow-y: auto;" v-html="marked(updateInfo.latest_release_body)"></div>
                                </div>
                                <v-btn
                                    color="primary"
                                    :loading="updateChecking"
                                    @click="checkForUpdate"
                                >
                                    <v-icon start>mdi-refresh</v-icon>{{ t('admin.settings.button.checkUpdate') }}
                                </v-btn>
                            </div>
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
                    </div>
                </section>
            </div>
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

        <v-dialog v-model="dbMigrateDialog" max-width="440" persistent>
            <v-card>
                <v-card-title>{{ t('admin.settings.message.dbMigrateConfirmTitle') }}</v-card-title>
                <v-card-text>{{ t('admin.settings.message.dbMigrateWarning') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="dbMigrateDialog = false">{{ t('common.cancel') }}</v-btn>
                    <v-btn color="warning" dark @click="migrateDb(false)">{{ t('admin.settings.button.migrateDb') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="dbForceDialog" max-width="480" persistent>
            <v-card>
                <v-card-title>{{ t('admin.settings.message.dbForceTitle') }}</v-card-title>
                <v-card-text>{{ t('admin.settings.message.dbForceWarning', { count: dbTargetDataCount }) }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="dbForceDialog = false">{{ t('common.cancel') }}</v-btn>
                    <v-btn color="error" dark @click="forceMigrateDb">{{ t('admin.settings.button.forceMigrateDb') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue';
import { marked } from 'marked';
marked.setOptions({ breaks: true, gfm: true });
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import SSLManager from '~/components/SSLManager.vue';
import { useMainStore } from '@/stores/main';

const store = useMainStore();
const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();
const display = useDisplay();

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
const updateInfo = ref({
    current_version: '',
    latest_version: '',
    has_update: false,
    latest_release_url: '',
    latest_release_name: '',
    latest_release_body: '',
    check_error: null,
    last_check_time: null,
});
const updateChecking = ref(false);

// Database management state
const dbNewType = ref('mysql');
const dbNewHost = ref('localhost');
const dbNewPort = ref(3306);
const dbNewName = ref('talebook');
const dbNewUser = ref('');
const dbNewPass = ref('');
const dbTesting = ref(false);
const dbMigrating = ref(false);
const dbMigrateDialog = ref(false);
const dbForceDialog = ref(false);
const dbTargetDataCount = ref(0);
const dbTypeOptions = computed(() => [
    { text: t('admin.settings.option.dbSqlite'), value: 'sqlite' },
    { text: t('admin.settings.option.dbMysql'), value: 'mysql' },
]);

const buildUserDatabaseUrl = () => {
    const user = encodeURIComponent(dbNewUser.value);
    const pass = encodeURIComponent(dbNewPass.value);
    return `mysql+pymysql://${user}:${pass}@${dbNewHost.value}:${dbNewPort.value}/${dbNewName.value}?charset=utf8mb4`;
};

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
            { key: 'SHOW_NETWORK_LIBRARY', label: t('admin.settings.label.showNetworkLibrary'), type: 'checkbox' },
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
        key: 'audiobookSettings',
        title: t('admin.settings.section.audiobookSettings'),
        subtitle: t('admin.settings.message.audiobookSettingsInfo'),
        fields: [
            {
                icon: 'mdi-backup-restore',
                key: 'AUDIOBOOK_BACKUP_RETENTION',
                label: t('admin.settings.label.audiobookBackupRetention'),
                type: 'select',
                items: [0, 1, 2, 3, 5, 10, 20].map(value => ({ text: String(value), value })),
            },
        ],
    },
    {
        key: 'webdavSettings',
        title: t('admin.settings.section.webdavSettings'),
        fields: [
            { icon: 'mdi-cloud-sync', key: 'ENABLE_WEBDAV_SERVICE', label: t('admin.settings.label.webdavEnabled'), type: 'checkbox' },
            { icon: 'mdi-cloud-upload', key: 'WEBDAV_SYNC_FOLDER', label: t('admin.settings.label.webdavSyncFolder'), type: 'checkbox' },
        ],
        tips: [
            {
                text: t('admin.settings.message.webdavInfo'),
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
            { icon: '', key: 'UPLOAD_CHUNK_ENABLED', label: t('admin.settings.label.uploadChunkEnabled'), type: 'checkbox' },
            { icon: 'mdi-information', key: 'UPLOAD_CHUNK_THRESHOLD', label: t('admin.settings.label.uploadChunkThreshold'), show_when: () => settings.value.UPLOAD_CHUNK_ENABLED },
            { icon: 'mdi-information', key: 'UPLOAD_CHUNK_SIZE', label: t('admin.settings.label.uploadChunkSize'), show_when: () => settings.value.UPLOAD_CHUNK_ENABLED },
            { icon: 'mdi-information', key: 'MAX_CHUNK_COUNT', label: t('admin.settings.label.maxChunkCount'), show_when: () => settings.value.UPLOAD_CHUNK_ENABLED },
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
        key: 'databaseManagement',
        title: t('admin.settings.section.databaseManagement'),
        fields: [],
        show_db: true,
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
    {
        key: 'updateCheck',
        title: t('admin.settings.section.updateCheck'),
        fields: [],
        show_update: true,
    },
]);

// 左侧导航分组：定义分组内包含的分类 key 及其顺序
const navGroupDefs = [
    { key: 'site', titleKey: 'admin.settings.group.site', keys: ['basicInfo', 'bookCategories', 'friendshipLinks'] },
    { key: 'access', titleKey: 'admin.settings.group.access', keys: ['userSettings', 'socialLogin', 'captchaSettings'] },
    { key: 'services', titleKey: 'admin.settings.group.services', keys: ['emailService', 'deviceManagement', 'audiobookSettings', 'webdavSettings'] },
    { key: 'system', titleKey: 'admin.settings.group.system', keys: ['advancedSettings', 'databaseManagement', 'sslManagement', 'trashManagement', 'updateCheck'] },
];

// section 渲染顺序（与导航顺序一致，供 scroll-spy 判定使用）
const sectionOrder = navGroupDefs.flatMap((g) => g.keys);

const cardsByKey = computed(() => {
    const m = {};
    cards.value.forEach((c) => { m[c.key] = c; });
    return m;
});

const orderedCards = computed(() => sectionOrder.map((k) => cardsByKey.value[k]).filter(Boolean));

const navGroups = computed(() => navGroupDefs.map((g) => ({
    key: g.key,
    title: t(g.titleKey),
    items: g.keys
        .map((k) => cardsByKey.value[k])
        .filter(Boolean)
        .map((c) => ({ key: c.key, title: c.title })),
})));

const navSelectItems = computed(() => orderedCards.value.map((c) => ({ key: c.key, title: c.title })));

// scroll-spy 状态
const activeKey = ref(sectionOrder[0]);
let spyLocked = false;
let spyLockTimer = null;
let scrollRaf = 0;

const HEADER_OFFSET = 104; // app-bar(48) + 悬浮标题栏(约 56)
const ACTIVE_LINE = HEADER_OFFSET + 12; // 判定基准线：分类上缘越过该线即视为当前分类

// 取上缘已越过基准线的最后一个分类；滚动到底部时直接激活最后一个分类
const computeActiveKey = () => {
    if (!import.meta.client) return;
    const innerH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const scrollable = docH - innerH > 4;
    // 页面确有滚动空间且已滚到底部时，激活最后一个分类（末尾分类无法上移到判定线）
    if (scrollable && window.scrollY > 0 && window.scrollY + innerH >= docH - 4) {
        activeKey.value = sectionOrder[sectionOrder.length - 1];
        return;
    }
    let current = sectionOrder[0];
    for (const k of sectionOrder) {
        const el = document.getElementById('sec-' + k);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= ACTIVE_LINE) current = k;
        else break;
    }
    activeKey.value = current;
};

const onScroll = () => {
    if (spyLocked || scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        computeActiveKey();
    });
};

const scrollToSection = (key) => {
    if (!key) return;
    activeKey.value = key;
    // 点击跳转期间锁定 spy，避免平滑滚动过程中的抖动
    spyLocked = true;
    if (spyLockTimer) clearTimeout(spyLockTimer);
    spyLockTimer = setTimeout(() => { spyLocked = false; computeActiveKey(); }, 700);
    if (import.meta.client) {
        const el = document.getElementById('sec-' + key);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

const setupSpy = () => {
    if (!import.meta.client) return;
    // 页面加载时停在顶部，默认激活第一个分类；此后仅随用户滚动重新计算
    window.addEventListener('scroll', onScroll, { passive: true });
};

// 导航项过多导致侧栏内部滚动时，保持当前项可见（仅滚动侧栏本身，不影响页面滚动）
watch(activeKey, (key) => {
    if (!import.meta.client) return;
    nextTick(() => {
        const btn = document.querySelector(`.settings-nav-item[data-navkey="${key}"]`);
        const nav = btn && btn.closest('.settings-nav');
        if (!btn || !nav) return;
        const br = btn.getBoundingClientRect();
        const nr = nav.getBoundingClientRect();
        if (br.bottom > nr.bottom) nav.scrollTop += br.bottom - nr.bottom + 8;
        else if (br.top < nr.top) nav.scrollTop -= nr.top - br.top + 8;
    });
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
    fetchUpdateStatus();

    nextTick(setupSpy);
});

onBeforeUnmount(() => {
    if (spyLockTimer) clearTimeout(spyLockTimer);
    if (import.meta.client) window.removeEventListener('scroll', onScroll);
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
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

const testDbConnection = () => {
    dbTesting.value = true;
    var data = new URLSearchParams();
    data.append('user_database', buildUserDatabaseUrl());
    $backend('/admin/testdb', { method: 'POST', body: data })
        .then(rsp => {
            if (rsp.err === 'ok') {
                if ($alert) $alert('success', t('admin.settings.message.dbConnectSuccess'));
            } else {
                if ($alert) $alert('error', rsp.msg);
            }
        })
        .finally(() => { dbTesting.value = false; });
};

const migrateDb = (force = false) => {
    dbMigrateDialog.value = false;
    dbMigrating.value = true;
    var data = new URLSearchParams();
    data.append('user_database', buildUserDatabaseUrl());
    if (force) data.append('force', '1');
    $backend('/admin/migratedb', { method: 'POST', body: data })
        .then(rsp => {
            if (rsp.err === 'ok') {
                if ($alert) $alert('success', t('admin.settings.message.dbMigrateSuccess'));
                settings.value.user_database = buildUserDatabaseUrl().replace(`:${encodeURIComponent(dbNewPass.value)}@`, ':***@');
            } else if (rsp.err === 'db.target_has_data') {
                dbTargetDataCount.value = rsp.count || 0;
                dbForceDialog.value = true;
            } else {
                if ($alert) $alert('error', rsp.msg);
            }
        })
        .finally(() => { dbMigrating.value = false; });
};

const forceMigrateDb = () => {
    dbForceDialog.value = false;
    migrateDb(true);
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

const fetchUpdateStatus = () => {
    $backend('/admin/update').then(rsp => {
        if (rsp && rsp.err === 'ok' && rsp.status) {
            updateInfo.value = rsp.status;
        }
    });
};

const checkForUpdate = () => {
    updateChecking.value = true;
    $backend('/admin/update', {
        method: 'POST',
    }).then(rsp => {
        updateChecking.value = false;
        if (rsp && rsp.err === 'ok' && rsp.status) {
            updateInfo.value = rsp.status;
            if (rsp.status.has_update) {
                if ($alert) $alert('info', t('admin.settings.message.updateAvailable', { version: rsp.status.latest_version }));
            } else if (rsp.status.check_error) {
                if ($alert) $alert('error', t('admin.settings.message.checkError') + ': ' + rsp.status.check_error);
            } else {
                if ($alert) $alert('success', t('admin.settings.message.upToDate'));
            }
        }
    }).catch(() => {
        updateChecking.value = false;
    });
};

const formatCheckTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
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

/* 悬浮固定标题栏（贴在应用顶栏下方） */
.settings-titlebar {
    position: sticky;
    top: 48px;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 8px 0;
    margin-bottom: 24px;
    background: rgb(var(--v-theme-surface));
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.settings-page-title {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
}

.settings-body {
    display: flex;
    align-items: flex-start;
    gap: 0;
    /* 导航菜单放在右侧，配置内容在左侧 */
    flex-direction: row-reverse;
}

/* 右侧导航 */
.settings-nav {
    position: sticky;
    top: 108px;
    flex: 0 0 172px;
    width: 172px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    padding-left: 24px;
}
.settings-nav-group {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgb(var(--v-theme-on-surface));
    opacity: 0.8;
    /* 块与块之间留更多空白 */
    margin: 28px 0 8px;
    padding: 0 10px 6px;
    /* 横线放在小标题下方 */
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.settings-nav-group:first-child {
    margin-top: 0;
}
.settings-nav-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 5px 10px;
    margin-bottom: 1px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font-size: 13px;
    line-height: 1.4;
    cursor: pointer;
    transition: background-color 0.15s ease;
}
.settings-nav-item:hover {
    background: rgba(var(--v-theme-on-surface), 0.06);
}
.settings-nav-item.active {
    background: rgba(var(--v-theme-primary), 0.12);
    color: rgb(var(--v-theme-primary));
    font-weight: 600;
}

/* 右侧内容：紧凑 + 常规字号 */
.settings-content {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 14px;
    /* 左右两栏之间的竖线分隔（内容在左，导航在右） */
    padding-right: 24px;
    border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.settings-section {
    scroll-margin-top: 116px;
    padding-bottom: 20px;
    margin-bottom: 20px;
}
.settings-section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 14px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
/* 紧凑表单：缩小各控件之间的垂直间距 */
.settings-section-body :deep(.v-input) {
    margin-bottom: 2px;
}
/* 整页紧凑：缩小所有输入/下拉/文本域的字号 */
.settings-content :deep(.v-field__input),
.settings-content :deep(.v-field__input input),
.settings-content :deep(.v-field textarea),
.settings-content :deep(.v-select__selection-text),
.settings-content :deep(.v-label),
.settings-content :deep(.v-field-label),
.settings-content :deep(.v-chip) {
    font-size: 13px;
}

</style>
