<template>
    <AnnotationPanel
        :book-id="bookId"
        compact
        @locate="locateAnnotation"
    />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AnnotationPanel from '~/components/AnnotationPanel.vue';

definePageMeta({ layout: 'blank' });

const route = useRoute();
const { t } = useI18n();
const { $alert } = useNuxtApp();
const bookId = computed(() => route.params.bid);

const locateAnnotation = (annotation) => {
    if (window.parent === window) {
        const query = new URLSearchParams();
        if (annotation.cfi) query.set('cfi', annotation.cfi);
        if (annotation.chapter) query.set('chapter', annotation.chapter);
        window.location.href = `/read/${bookId.value}?${query.toString()}`;
        return;
    }
    window.parent.postMessage({
        type: 'talebook:annotation-locate',
        annotationId: annotation.id,
        cfi: annotation.cfi,
        chapter: annotation.chapter,
    }, window.location.origin);
};

const receiveLocationResult = (event) => {
    if (event.origin !== window.location.origin || event.data?.type !== 'talebook:annotation-location-result') return;
    if (event.data.ok) {
        $alert('success', t('annotations.locationDone'));
    } else {
        $alert('error', event.data.chapterOnly ? t('annotations.chapterOnlyLocation') : t('annotations.locationFailed'));
    }
};

onMounted(() => window.addEventListener('message', receiveLocationResult));
onBeforeUnmount(() => window.removeEventListener('message', receiveLocationResult));
</script>
