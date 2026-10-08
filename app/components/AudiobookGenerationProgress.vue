<template>
    <section
        class="generation-progress"
        :aria-label="t('audiobook.liveProgress')"
        data-testid="generation-progress"
    >
        <div class="generation-heading">
            <strong
                role="status"
                data-testid="generation-state"
            >{{ stateLabel }}</strong>
            <span v-if="snapshot">{{ t(`audiobook.generationStage_${snapshot.stage}`) }}</span>
        </div>
        <template v-if="snapshot">
            <p
                role="status"
                class="generation-count"
                data-testid="generation-count"
            >
                {{ t('audiobook.speechCount', { completed: snapshot.completed, total: snapshot.total }) }}
            </p>
            <v-progress-linear
                v-if="snapshot.total > 0 && snapshot.completed < snapshot.total"
                :model-value="snapshot.completed / snapshot.total * 100"
                :aria-label="t('audiobook.speechRatio')"
                color="primary"
                rounded
            />
            <p class="generation-hint">
                {{ t('audiobook.speechRatioHint') }}
            </p>
            <p v-if="snapshot.total > 0 && snapshot.completed === snapshot.total && job.status !== 'completed'">
                {{ t('audiobook.speechDonePending') }}
            </p>
            <dl class="generation-metrics">
                <div><dt>{{ t('audiobook.activeRequests') }}</dt><dd>{{ snapshot.active_requests }}/{{ snapshot.concurrency }}</dd></div>
                <div><dt>{{ t('audiobook.queuedUnits') }}</dt><dd>{{ snapshot.queued }}</dd></div>
                <div><dt>{{ t('audiobook.retryingUnits') }}</dt><dd>{{ snapshot.retrying }}</dd></div>
                <div><dt>{{ t('audiobook.failedUnits') }}</dt><dd>{{ snapshot.failed }}</dd></div>
                <div><dt>{{ t('audiobook.extraRetries') }}</dt><dd>{{ snapshot.retries }}</dd></div>
            </dl>
            <div
                v-if="waiting && job.status === 'generating' && !job.cancel_requested"
                class="generation-wait"
                data-testid="generation-wait"
            >
                <p>{{ t(`audiobook.waitReason_${waiting.reason || 'unknown'}`) }} · {{ t('audiobook.waitRetryCount', { count: waiting.retry_count }) }}</p>
                <p v-if="validNextRequest">
                    {{ t('audiobook.nextRequestAt', { time: formatDate(waiting.next_request_at) }) }}
                    <span v-if="countdown > 0"> · {{ t('audiobook.requestCountdown', { seconds: countdown }) }}</span>
                    <span v-else> · {{ t('audiobook.requestTimeReached') }}</span>
                </p>
                <p v-else>
                    {{ t('audiobook.nextRequestUnknown') }}
                </p>
                <small>{{ t('audiobook.requestPlanHint') }}</small>
            </div>
        </template>
        <p
            v-else
            class="generation-hint"
        >
            {{ t(job.generation?.protocol_version === 2 ? 'audiobook.preparingUnits' : 'audiobook.legacyLiveUnavailable') }}
        </p>
        <p
            v-if="connectionError"
            class="generation-hint"
            data-testid="generation-api-error"
        >
            {{ t('audiobook.progressConnectionError') }}
        </p>
        <p
            v-if="['stale', 'interrupted', 'unknown'].includes(job.generation?.connection || '')"
            class="generation-hint"
            data-testid="generation-connection"
        >
            {{ t(`audiobook.connection_${job.generation?.connection}`) }}
        </p>
        <footer>
            <span v-if="job.generation?.attempt_id">{{ t('audiobook.generationAttempt', { id: job.generation.attempt_id.slice(0, 8) }) }}</span>
            <time v-if="snapshot?.updated_at">{{ t('audiobook.progressUpdatedAt', { time: formatDate(snapshot.updated_at) }) }}</time>
        </footer>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

interface Snapshot {
    status: string;
    stage: string;
    total: number;
    completed: number;
    active_requests: number;
    concurrency: number;
    queued: number;
    retrying: number;
    failed: number;
    retries: number;
    updated_at: string;
    waiting?: { reason: string; retry_count: number; next_request_at: string | null } | null;
}

const props = defineProps<{
    connectionError?: boolean;
    job: {
        status: string;
        cancel_requested?: boolean;
        generation?: { protocol_version: number; attempt_id?: string; connection: string; snapshot: Snapshot | null };
    };
}>();
const { t, locale } = useI18n();
const now = ref(Date.now());
const snapshot = computed(() => props.job.generation?.snapshot);
const waiting = computed(() => snapshot.value?.waiting);
const nextRequest = computed(() => Date.parse(waiting.value?.next_request_at || ''));
const validNextRequest = computed(() => Number.isFinite(nextRequest.value));
const countdown = computed(() => Math.max(0, Math.ceil((nextRequest.value - now.value) / 1000)));
const stateLabel = computed(() => {
    const job = props.job;
    if (['completed', 'failed', 'cancelled', 'finalizing', 'queued', 'inspecting', 'awaiting_review'].includes(job.status)) {
        return t(`audiobook.status_${job.status}`);
    }
    if (job.cancel_requested) return t('audiobook.generationState_cancelling');
    if (props.connectionError) return t('audiobook.progressConnectionError');
    if (['stale', 'interrupted', 'unknown'].includes(job.generation?.connection || '')) {
        return t(`audiobook.connection_${job.generation?.connection}`);
    }
    const status = snapshot.value?.status || 'running';
    return t(`audiobook.generationState_${status === 'completed' ? 'awaiting_publication' : status}`);
});
function formatDate(value: string | null | undefined) {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp)
        ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(timestamp))
        : t('audiobook.nextRequestUnknown');
}
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
</script>

<style scoped>
.generation-progress { margin-top: 18px; padding: 16px; border: 1px solid rgba(var(--v-border-color), .16); border-radius: 12px; }
.generation-heading { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.generation-count { margin: 10px 0 6px; font-variant-numeric: tabular-nums; }
.generation-hint, footer { margin-top: 8px; color: rgba(var(--v-theme-on-surface), .72); font-size: .8rem; }
.generation-metrics { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-top: 12px; }
.generation-metrics > div { display: flex; gap: 8px; }
dt { color: rgba(var(--v-theme-on-surface), .72); } dd { margin: 0; font-variant-numeric: tabular-nums; }
.generation-wait { margin-top: 12px; padding: 12px; background: rgba(var(--v-theme-primary), .07); border-radius: 8px; overflow-wrap: anywhere; }
.generation-wait p + p { margin-top: 6px; }
footer { display: flex; flex-wrap: wrap; gap: 6px 20px; }
</style>
