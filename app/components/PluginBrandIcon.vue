<template>
    <span
        class="plugin-brand-icon"
        :style="{ '--plugin-brand-icon-size': `${size}px` }"
        aria-hidden="true"
    >
        <v-img
            v-if="brandIcon && !imageFailed"
            :src="brandIcon"
            alt=""
            contain
            @error="imageFailed = true"
        />
        <v-icon
            v-else
            :size="size"
        >
            {{ icon || 'mdi-power-plug-outline' }}
        </v-icon>
    </span>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    brandIcon?: string;
    icon?: string;
    size?: number;
}>(), {
    brandIcon: '',
    icon: 'mdi-power-plug-outline',
    size: 28,
});

const imageFailed = ref(false);

watch(() => props.brandIcon, () => {
    imageFailed.value = false;
});
</script>

<style scoped>
.plugin-brand-icon {
    position:relative;
    display:inline-grid;
    place-items:center;
    width:var(--plugin-brand-icon-size);
    height:var(--plugin-brand-icon-size);
    flex:0 0 var(--plugin-brand-icon-size);
    overflow:hidden;
    border-radius:6px;
}

.plugin-brand-icon::after {
    position:absolute;
    inset:0;
    border-radius:inherit;
    box-shadow:inset 0 0 0 1px oklch(0 0 0 / .1);
    content:"";
    pointer-events:none;
}

:global(.v-theme--dark) .plugin-brand-icon::after {
    box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1);
}

.plugin-brand-icon :deep(.v-img) {
    width:100%;
    height:100%;
}
</style>
