<template>
    <v-dialog
        v-model="openState"
        max-width="560"
    >
        <v-card>
            <v-card-title class="d-flex align-center">
                {{ t('pluginManagement.metadataBehavior') }}
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
                <v-skeleton-loader
                    v-if="loading"
                    type="list-item-two-line@2"
                />
                <template v-else>
                    <p class="text-body-2 text-medium-emphasis mb-3">
                        {{ t('pluginManagement.metadataBehaviorDescription') }}
                    </p>
                    <v-switch
                        v-model="form.auto_fill_meta"
                        color="primary"
                        inset
                        hide-details
                        :label="t('admin.settings.label.autoFillMeta')"
                    />
                    <v-switch
                        v-model="form.auto_fill_keep_cover"
                        color="primary"
                        inset
                        hide-details
                        :disabled="!form.auto_fill_meta"
                        :label="t('admin.settings.label.autoFillKeepCover')"
                    />
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
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { $backend, $alert } = useNuxtApp();
const openState = ref(false);
const loading = ref(false);
const saving = ref(false);
const form = reactive({ auto_fill_meta: false, auto_fill_keep_cover: false });

async function open() {
    openState.value = true;
    loading.value = true;
    try {
        const rsp = await $backend('/admin/plugins/preferences');
        if (rsp.err !== 'ok') throw new Error(rsp.msg || rsp.err);
        Object.assign(form, rsp.metadata || {});
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
        const rsp = await $backend('/admin/plugins/preferences', {
            method: 'POST',
            body: JSON.stringify({ metadata: { ...form } }),
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
