<template>
    <v-dialog
        v-model="dialog"
        max-width="460"
    >
        <v-card>
            <v-card-title>{{ $t('network.save.title') }}</v-card-title>
            <v-card-text>
                <div class="mb-2">
                    {{ $t('network.save.format') }}
                </div>
                <v-radio-group
                    v-model="fmt"
                    inline
                    hide-details
                >
                    <v-radio
                        :label="$t('network.save.txt')"
                        value="txt"
                    />
                    <v-radio
                        :label="$t('network.save.epub')"
                        value="epub"
                    />
                </v-radio-group>
                <v-switch
                    v-model="clean"
                    :label="$t('network.save.clean')"
                    color="primary"
                    hide-details
                />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    variant="text"
                    @click="dialog = false"
                >
                    {{ $t('common.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    :loading="loading"
                    @click="save"
                >
                    {{ $t('network.save.confirm') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
    sourceId: { type: [Number, String], default: 0 },
    bookUrl: { type: String, default: '' },
});

const dialog = ref(false);
const fmt = ref('txt');
const clean = ref(true);
const loading = ref(false);

const open = () => {
    dialog.value = true;
};

defineExpose({ open });

const save = async () => {
    const { $backend, $alert } = useNuxtApp();
    loading.value = true;
    try {
        const rsp = await $backend('/network/save', {
            method: 'POST',
            body: JSON.stringify({
                source_id: props.sourceId,
                book_url: props.bookUrl,
                fmt: fmt.value,
                clean: clean.value,
            }),
        });
        if (rsp.err === 'ok') {
            if ($alert) $alert('success', t('network.save.started'));
            dialog.value = false;
        } else if ($alert) {
            $alert('error', rsp.msg || rsp.err);
        }
    } finally {
        loading.value = false;
    }
};
</script>
