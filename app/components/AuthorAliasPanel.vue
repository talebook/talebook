<template>
    <v-card
        v-if="loading"
        class="mb-4 author-alias-panel"
        variant="tonal"
    >
        <v-card-text
            class="d-flex align-center ga-3"
            role="status"
        >
            <v-progress-circular
                indeterminate
                size="24"
            />
            {{ t('authorAliases.loading') }}
        </v-card-text>
    </v-card>

    <v-alert
        v-else-if="loadError"
        class="mb-4 author-alias-panel"
        type="error"
        variant="tonal"
    >
        <div class="d-flex align-center flex-wrap ga-2">
            <span>{{ loadError }}</span>
            <v-spacer />
            <v-btn
                size="small"
                variant="outlined"
                @click="load"
            >
                {{ t('common.retry') }}
            </v-btn>
        </div>
    </v-alert>

    <v-card
        v-else-if="loaded"
        class="mb-4 author-alias-panel"
        variant="tonal"
    >
        <v-card-title class="d-flex align-center flex-wrap ga-2">
            <v-icon>mdi-account-group</v-icon>
            <span>{{ author.canonical }}</span>
            <v-spacer />
            <v-btn
                v-if="author.can_edit"
                size="small"
                variant="outlined"
                prepend-icon="mdi-pencil"
                @click="openEditor"
            >
                {{ t('authorAliases.manage') }}
            </v-btn>
        </v-card-title>
        <v-card-text>
            <p class="text-medium-emphasis mb-2">
                {{ t('authorAliases.description') }}
            </p>
            <div
                v-if="author.aliases.length"
                class="d-flex flex-wrap ga-2"
                :aria-label="t('authorAliases.aliases')"
            >
                <v-chip
                    v-for="alias in author.aliases"
                    :key="alias"
                    size="small"
                    prepend-icon="mdi-text-box-outline"
                >
                    {{ alias }}
                </v-chip>
            </div>
            <p
                v-else
                class="text-medium-emphasis mb-0"
            >
                {{ t('authorAliases.empty') }}
            </p>
        </v-card-text>
    </v-card>

    <v-dialog
        v-model="editorOpen"
        max-width="640"
    >
        <v-card>
            <v-card-title>{{ t('authorAliases.manage') }}</v-card-title>
            <v-card-text>
                <v-text-field
                    v-model="draftCanonical"
                    :label="t('authorAliases.canonical')"
                    :error-messages="canonicalError"
                    variant="outlined"
                    autocomplete="off"
                    @update:model-value="canonicalError = ''"
                />
                <v-combobox
                    v-model="draftAliases"
                    :label="t('authorAliases.aliases')"
                    :hint="t('authorAliases.inputHint')"
                    variant="outlined"
                    multiple
                    chips
                    closable-chips
                    persistent-hint
                />
                <v-alert
                    class="mt-4"
                    type="warning"
                    variant="tonal"
                >
                    {{ t('authorAliases.mergeWarning', { count: author.book_count }) }}
                </v-alert>
            </v-card-text>
            <v-card-actions>
                <v-btn @click="editorOpen = false">
                    {{ t('common.cancel') }}
                </v-btn>
                <v-spacer />
                <v-btn
                    color="warning"
                    variant="outlined"
                    @click="openMergeConfirmation"
                >
                    {{ t('authorAliases.merge') }}
                </v-btn>
                <v-btn
                    color="primary"
                    :loading="saving"
                    @click="save(false)"
                >
                    {{ t('common.save') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog
        v-model="confirmOpen"
        max-width="520"
    >
        <v-card>
            <v-card-title>{{ t('authorAliases.confirmTitle') }}</v-card-title>
            <v-card-text>
                {{ t('authorAliases.confirmBody', { canonical: draftCanonical }) }}
            </v-card-text>
            <v-card-actions>
                <v-btn @click="confirmOpen = false">
                    {{ t('common.cancel') }}
                </v-btn>
                <v-spacer />
                <v-btn
                    color="warning"
                    :loading="saving"
                    @click="save(true)"
                >
                    {{ t('authorAliases.confirmMerge') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNuxtApp } from 'nuxt/app';

const props = defineProps({
    name: {
        type: String,
        required: true,
    },
});

const { $backend, $alert } = useNuxtApp();
const { t } = useI18n();
const loaded = ref(false);
const loading = ref(false);
const loadError = ref('');
const saving = ref(false);
const editorOpen = ref(false);
const confirmOpen = ref(false);
const draftCanonical = ref('');
const draftAliases = ref([]);
const canonicalError = ref('');
const author = reactive({
    canonical: props.name,
    aliases: [],
    names: [props.name],
    book_count: 0,
    can_edit: false,
});

const load = async () => {
    loading.value = true;
    loadError.value = '';
    try {
        const response = await $backend(`/author-aliases/${encodeURIComponent(props.name)}`);
        if (response.err !== 'ok') {
            loadError.value = response.msg || t('authorAliases.loadFailed');
            return;
        }
        Object.assign(author, response.author);
        loaded.value = true;
    } catch {
        loadError.value = t('authorAliases.loadFailed');
    } finally {
        loading.value = false;
    }
};

const openEditor = () => {
    draftCanonical.value = author.canonical;
    draftAliases.value = [...author.aliases];
    canonicalError.value = '';
    editorOpen.value = true;
};

const validateCanonical = () => {
    if (draftCanonical.value.trim()) return true;
    canonicalError.value = t('authorAliases.canonicalRequired');
    return false;
};

const openMergeConfirmation = () => {
    if (validateCanonical()) confirmOpen.value = true;
};

const save = async (merge) => {
    if (!validateCanonical()) return;
    saving.value = true;
    try {
        const response = await $backend(`/author-aliases/${encodeURIComponent(props.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                canonical: draftCanonical.value,
                aliases: draftAliases.value,
                merge,
            }),
        });
        if (response.err !== 'ok') {
            $alert('error', response.msg || t('authorAliases.saveFailed'));
            return;
        }
        Object.assign(author, response.author);
        editorOpen.value = false;
        confirmOpen.value = false;
        const failed = response.merge?.failed?.length || 0;
        $alert(failed ? 'warning' : 'success', failed
            ? t('authorAliases.mergePartial', { count: failed })
            : t(merge ? 'authorAliases.mergeSuccess' : 'authorAliases.saveSuccess'));
    } catch {
        $alert('error', t('authorAliases.saveFailed'));
    } finally {
        saving.value = false;
    }
};

onMounted(load);
watch(() => props.name, load);
</script>
