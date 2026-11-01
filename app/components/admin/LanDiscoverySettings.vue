<template>
    <div data-testid="lan-discovery">
        <p class="mb-4">
            {{ t('admin.discovery.help') }}
        </p>
        <v-switch
            :model-value="!!modelValue.LAN_DISCOVERY_ENABLED"
            :label="t('admin.discovery.enable')"
            :disabled="overridden.includes('LAN_DISCOVERY_ENABLED')"
            color="primary"
            @update:model-value="setSetting('LAN_DISCOVERY_ENABLED', !!$event)"
        />
        <v-alert
            v-if="overridden.length"
            type="info"
            variant="tonal"
            class="mb-4"
        >
            <div class="text-high-emphasis text-break">
                {{ t('admin.discovery.override') }} {{ overridden.join(', ') }}
            </div>
        </v-alert>
        <p class="mb-3">
            {{ t('admin.discovery.name') }}: {{ previewName }}
        </p>
        <div
            v-for="(endpoint, index) in endpoints"
            :key="index"
            class="endpoint mb-4 pa-3 border rounded"
        >
            <v-text-field
                :model-value="endpoint.url"
                :label="t('admin.discovery.url')"
                type="url"
                placeholder="http://192.168.50.10:8080/books"
                :disabled="endpointsLocked"
                @update:model-value="setEndpoint(index, 'url', $event)"
            />
            <v-text-field
                :model-value="endpoint.addresses.join(', ')"
                :label="t('admin.discovery.addresses')"
                :hint="t('admin.discovery.addressHint')"
                persistent-hint
                class="mb-4"
                :disabled="endpointsLocked"
                @update:model-value="setEndpoint(index, 'addresses', splitList($event))"
            />
            <v-select
                :model-value="endpoint.interfaces"
                :items="interfaceNames(endpoint)"
                :label="t('admin.discovery.interfaces')"
                multiple
                chips
                :disabled="endpointsLocked"
                @update:model-value="setEndpoint(index, 'interfaces', $event)"
            />
            <v-btn
                :disabled="endpointsLocked"
                variant="text"
                @click="removeEndpoint(index)"
            >
                {{ t('admin.discovery.remove') }}
            </v-btn>
        </div>
        <p
            v-if="!endpoints.length"
            class="mb-3"
        >
            {{ t('admin.discovery.empty') }}
        </p>
        <v-btn
            :disabled="endpointsLocked || endpoints.length >= 8"
            variant="outlined"
            class="mb-4"
            @click="addEndpoint"
        >
            {{ t('admin.discovery.add') }}
        </v-btn>
        <p class="mb-3">
            {{ t('admin.discovery.saveHint') }}
        </p>
        <v-alert
            :type="status.error || loadError ? 'warning' : 'info'"
            variant="tonal"
            role="status"
            aria-live="polite"
        >
            <div class="text-high-emphasis">
                <p>{{ t('admin.discovery.saved') }}: {{ t(loadError ? 'admin.discovery.state.unknown' : effectiveEnabled ? 'admin.discovery.on' : 'admin.discovery.off') }}</p>
                <p>{{ t('admin.discovery.actual') }}: {{ t('admin.discovery.state.' + (loadError ? 'unknown' : status.state)) }}</p>
                <p
                    v-if="status.instance_id"
                    class="text-break"
                >
                    {{ t('admin.discovery.id') }}: {{ status.instance_id }}
                </p>
                <p v-if="status.error">
                    {{ status.error }}
                </p>
                <p v-if="loadError">
                    {{ t('admin.discovery.loadError') }}
                </p>
                <ul
                    v-if="effectiveEndpoints.length"
                    class="pl-5 text-break"
                >
                    <li
                        v-for="endpoint in effectiveEndpoints"
                        :key="endpoint.url"
                    >
                        {{ endpoint.url }} · {{ endpoint.addresses.join(', ') }} · {{ endpoint.interfaces.join(', ') }}
                    </li>
                </ul>
            </div>
        </v-alert>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    modelValue: { type: Object, required: true },
    backend: { type: Function, default: null },
});
const emit = defineEmits(['update:modelValue']);
const { t } = useI18n();
const $backend = props.backend || useNuxtApp().$backend;
const status = ref({ state: 'loading', error: null, instance_id: null });
const overridden = ref([]);
const interfaces = ref({});
const effectiveEndpoints = ref([]);
const effectiveEnabled = ref(false);
const effectiveName = ref('');
const loadError = ref(false);
const endpoints = computed(() => props.modelValue.LAN_DISCOVERY_ENDPOINTS || []);
const endpointsLocked = computed(() => overridden.value.includes('LAN_DISCOVERY_ENDPOINTS'));
const previewName = computed(() => overridden.value.includes('site_title') ? effectiveName.value : props.modelValue.site_title);
const setSetting = (key, value) => emit('update:modelValue', { ...props.modelValue, [key]: value });
const splitList = value => (value || '').split(/[,\s]+/).filter(Boolean);
const interfaceNames = endpoint => [...new Set([...Object.keys(interfaces.value), ...endpoint.interfaces])];
const setEndpoint = (index, key, value) => setSetting('LAN_DISCOVERY_ENDPOINTS', endpoints.value.map((e, i) => i === index ? { ...e, [key]: value } : e));
const addEndpoint = () => setSetting('LAN_DISCOVERY_ENDPOINTS', [...endpoints.value, { url: '', addresses: [], interfaces: [] }]);
const removeEndpoint = index => setSetting('LAN_DISCOVERY_ENDPOINTS', endpoints.value.filter((_, i) => i !== index));
let timer;
let disposed = false;
const refresh = async () => {
    try {
        const rsp = await $backend('/admin/discovery');
        if (disposed) return;
        if (rsp.err !== 'ok') throw new Error('discovery status');
        status.value = rsp.status;
        overridden.value = rsp.overridden;
        interfaces.value = rsp.interfaces;
        effectiveEndpoints.value = rsp.endpoints;
        effectiveEnabled.value = rsp.enabled;
        effectiveName.value = rsp.name;
        loadError.value = false;
    } catch {
        if (!disposed) loadError.value = true;
    } finally {
        if (!disposed) timer = setTimeout(refresh, 2000);
    }
};
onMounted(refresh);
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); });
</script>
