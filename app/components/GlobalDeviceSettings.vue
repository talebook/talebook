<template>
    <v-dialog
        v-model="openState"
        max-width="820"
        scrollable
    >
        <v-card>
            <v-card-title class="d-flex align-center">
                {{ t('pluginManagement.globalDevices') }}
                <v-spacer />
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    :aria-label="t('common.close')"
                    @click="openState = false"
                />
            </v-card-title>
            <v-divider />
            <v-card-text>
                <p class="text-body-2 text-medium-emphasis mb-4">
                    {{ t('pluginManagement.globalDevicesDescription') }}
                </p>
                <v-skeleton-loader
                    v-if="loading"
                    type="list-item-two-line@3"
                />
                <template v-else>
                    <v-alert
                        v-if="availableTypes.length === 0"
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mb-4"
                    >
                        {{ t('pluginManagement.enablePushFirst') }}
                    </v-alert>
                    <div
                        v-for="(device, index) in devices"
                        :key="device.key"
                        class="global-device-row"
                    >
                        <v-text-field
                            v-model="device.name"
                            :label="t('settings.deviceName')"
                            density="compact"
                            variant="outlined"
                            maxlength="64"
                            hide-details
                        />
                        <v-select
                            v-model="device.type"
                            :items="typeItemsFor(device)"
                            item-title="title"
                            item-value="value"
                            :label="t('settings.deviceType')"
                            density="compact"
                            variant="outlined"
                            hide-details
                            @update:model-value="applyTypeDefaults(device)"
                        />
                        <v-text-field
                            v-if="device.type === 'kindle'"
                            v-model="device.mailbox"
                            :label="t('settings.deviceMailbox')"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                        <template v-else>
                            <v-text-field
                                v-model="device.ip"
                                :label="t('settings.deviceIp')"
                                density="compact"
                                variant="outlined"
                                hide-details
                            />
                            <v-text-field
                                v-model.number="device.port"
                                :label="t('settings.devicePort')"
                                density="compact"
                                variant="outlined"
                                type="number"
                                min="1"
                                max="65535"
                                hide-details
                            />
                            <v-select
                                v-model="device.schema"
                                :items="['http', 'https']"
                                :label="t('settings.deviceSchema')"
                                density="compact"
                                variant="outlined"
                                hide-details
                            />
                        </template>
                        <v-btn
                            icon="mdi-delete-outline"
                            variant="text"
                            color="error"
                            :aria-label="t('common.delete')"
                            @click="devices.splice(index, 1)"
                        />
                    </div>
                    <v-btn
                        prepend-icon="mdi-plus"
                        variant="outlined"
                        class="mt-3"
                        :disabled="availableTypes.length === 0"
                        @click="addDevice"
                    >
                        {{ t('pluginManagement.addGlobalDevice') }}
                    </v-btn>
                </template>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    variant="text"
                    @click="openState = false"
                >
                    {{ t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    variant="tonal"
                    :loading="saving"
                    :disabled="loading"
                    @click="save"
                >
                    {{ t('common.save') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    availableTypes: { type: Array, default: () => [] },
});
const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const openState = ref(false);
const loading = ref(false);
const saving = ref(false);
const devices = ref([]);
let deviceSequence = 0;

const enabledTypeItems = computed(() => props.availableTypes.map(item => ({
    title: item.name,
    value: item.value,
    defaultPort: item.defaultPort,
})));

function normalizeDevice(item) {
    return {
        key: ++deviceSequence,
        name: item.name || '',
        type: item.type || '',
        mailbox: item.mailbox || '',
        ip: item.ip || '',
        port: Number(item.port || 0),
        schema: item.schema || 'http',
    };
}

function typeItemsFor(device) {
    if (!device.type || enabledTypeItems.value.some(item => item.value === device.type)) return enabledTypeItems.value;
    return [
        ...enabledTypeItems.value,
        { title: t('pluginManagement.disabledDeviceType', { type: device.type }), value: device.type, props: { disabled: true } },
    ];
}

function applyTypeDefaults(device) {
    const selected = enabledTypeItems.value.find(item => item.value === device.type);
    if (selected && !device.port) device.port = selected.defaultPort;
    if (!device.schema) device.schema = 'http';
}

function addDevice() {
    const first = enabledTypeItems.value[0];
    if (!first) return;
    devices.value.push(normalizeDevice({
        name: first.title,
        type: first.value,
        port: first.defaultPort,
        schema: 'http',
    }));
}

async function open() {
    openState.value = true;
    loading.value = true;
    try {
        const rsp = await $backend('/admin/plugins/preferences');
        if (rsp.err !== 'ok') throw new Error(rsp.msg || rsp.err);
        devices.value = (rsp.devices || []).map(normalizeDevice);
    } catch (error) {
        $alert?.('error', error.message || t('pluginManagement.loadError'));
        openState.value = false;
    } finally {
        loading.value = false;
    }
}

async function save() {
    saving.value = true;
    try {
        const payload = devices.value.map(({ key, ...device }) => device);
        const rsp = await $backend('/admin/plugins/preferences', {
            method: 'POST',
            body: JSON.stringify({ devices: payload }),
        });
        if (rsp.err !== 'ok') throw new Error(rsp.msg || rsp.err);
        $alert?.('success', t('pluginManagement.preferencesSaved'));
        openState.value = false;
    } catch (error) {
        $alert?.('error', error.message || t('pluginManagement.saveFailed'));
    } finally {
        saving.value = false;
    }
}

defineExpose({ open });
</script>

<style scoped>
.global-device-row {
    display: grid;
    grid-template-columns: minmax(120px, 1fr) minmax(150px, 1fr) minmax(140px, 1.2fr) 100px 110px 40px;
    gap: 8px;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), .1);
}

@media (max-width: 760px) {
    .global-device-row { grid-template-columns: 1fr; }
}
</style>
