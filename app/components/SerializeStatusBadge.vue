<template>
    <v-menu
        v-if="editable"
        offset-y
    >
        <template #activator="{ props }">
            <v-chip
                v-bind="props"
                :color="color"
                size="small"
                label
                class="serialize-badge"
            >
                {{ label }}
                <v-icon
                    end
                    size="x-small"
                >
                    mdi-pencil
                </v-icon>
            </v-chip>
        </template>
        <v-list density="compact">
            <v-list-item
                v-for="opt in options"
                :key="opt.value"
                :active="opt.value === status"
                @click="setStatus(opt.value)"
            >
                <v-list-item-title>{{ opt.text }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-menu>
    <v-chip
        v-else
        :color="color"
        size="small"
        label
        class="serialize-badge"
    >
        {{ label }}
    </v-chip>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
    status: { type: String, default: 'unknown' },
    bookId: { type: [Number, String], default: 0 },
    editable: { type: Boolean, default: false },
});

const emit = defineEmits(['update']);

const options = computed(() => [
    { value: 'serial', text: t('network.status.serial') },
    { value: 'finished', text: t('network.status.finished') },
    { value: 'unknown', text: t('network.status.unknown') },
]);

const label = computed(() => {
    return t('network.status.' + (props.status || 'unknown'));
});

const color = computed(() => {
    if (props.status === 'finished') return 'green';
    if (props.status === 'serial') return 'orange';
    return 'grey';
});

const setStatus = async (value) => {
    if (value === props.status) return;
    const { $backend, $alert } = useNuxtApp();
    const rsp = await $backend('/network/status', {
        method: 'POST',
        body: JSON.stringify({ book_id: props.bookId, serialize_status: value }),
    });
    if (rsp.err === 'ok') {
        emit('update', value);
        if ($alert) $alert('success', t('common.save'));
    } else if ($alert) {
        $alert('error', rsp.msg || rsp.err);
    }
};
</script>
