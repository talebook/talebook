<template>
    <div class="ai-hub">
        <v-card
            class="ai-hub__hero"
            rounded="xl"
            elevation="0"
        >
            <div class="ai-hub__hero-copy">
                <div class="ai-hub__eyebrow">
                    <v-icon size="18">
                        mdi-broom
                    </v-icon>
                    {{ t('aiAssistant.eyebrow') }}
                </div>
                <h1>{{ t('aiAssistant.title') }}</h1>
                <p>{{ t('aiAssistant.description') }}</p>
            </div>
            <div
                class="ai-hub__hero-mark"
                aria-hidden="true"
            >
                <v-icon size="52">
                    mdi-bookshelf
                </v-icon>
            </div>
        </v-card>

        <section
            class="ai-hub__section"
            aria-labelledby="ai-capabilities-title"
        >
            <div class="ai-hub__section-heading">
                <div>
                    <span>{{ t('aiAssistant.capabilityEyebrow') }}</span>
                    <h2 id="ai-capabilities-title">
                        {{ t('aiAssistant.capabilities') }}
                    </h2>
                </div>
                <p>{{ t('aiAssistant.capabilitiesDescription') }}</p>
            </div>

            <v-alert
                v-if="capabilitiesError"
                type="warning"
                variant="tonal"
                class="mb-4"
                data-testid="capabilities-error"
            >
                {{ capabilitiesError }}
                <template #append>
                    <v-btn
                        variant="text"
                        @click="loadCapabilities"
                    >
                        {{ t('common.retry') }}
                    </v-btn>
                </template>
            </v-alert>

            <v-row
                v-if="capabilitiesLoading"
                aria-busy="true"
            >
                <v-col
                    v-for="index in 2"
                    :key="index"
                    cols="12"
                    md="6"
                >
                    <v-skeleton-loader
                        type="article, actions"
                        rounded="xl"
                    />
                </v-col>
            </v-row>
            <v-row
                v-else-if="capabilities.length"
                class="ai-hub__capability-grid"
            >
                <v-col
                    v-for="capability in capabilities"
                    :key="capability.id"
                    cols="12"
                    md="6"
                >
                    <v-card
                        class="ai-capability"
                        :class="{ 'ai-capability--disabled': !capability.available }"
                        rounded="xl"
                        elevation="0"
                    >
                        <div class="ai-capability__topline">
                            <div class="ai-capability__icon">
                                <v-icon size="28">
                                    {{ capability.icon }}
                                </v-icon>
                            </div>
                            <v-chip
                                size="small"
                                :color="capability.available ? 'success' : 'default'"
                                variant="tonal"
                            >
                                {{ capability.available ? t('aiAssistant.available') : t('aiAssistant.unavailable') }}
                            </v-chip>
                        </div>
                        <h3>{{ capability.name }}</h3>
                        <p>{{ capability.description || t('aiAssistant.noDescription') }}</p>
                        <div class="ai-capability__meta">
                            <span><v-icon size="16">mdi-check</v-icon>{{ scopeLabel(capability.scope) }}</span>
                            <span><v-icon size="16">mdi-shield-check</v-icon>{{ t('aiAssistant.privateByDefault') }}</span>
                        </div>
                        <v-alert
                            v-if="!capability.available"
                            density="compact"
                            type="info"
                            variant="tonal"
                            class="mt-4"
                        >
                            {{ availabilityReason(capability.reason) }}
                        </v-alert>
                        <v-card-actions class="px-0 pb-0 pt-5">
                            <v-btn
                                color="primary"
                                variant="flat"
                                :to="capability.available && capability.entry ? capability.entry : undefined"
                                :disabled="!capability.available || !capability.entry"
                                @click="trackCapability(capability)"
                            >
                                {{ t('aiAssistant.openCapability') }}
                                <v-icon end>
                                    mdi-arrow-right
                                </v-icon>
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
            <v-card
                v-else
                class="ai-hub__empty"
                rounded="xl"
                elevation="0"
            >
                <v-icon size="42">
                    mdi-apps
                </v-icon>
                <h3>{{ t('aiAssistant.noCapabilities') }}</h3>
                <p>{{ t('aiAssistant.noCapabilitiesDescription') }}</p>
            </v-card>
        </section>

        <section
            class="ai-hub__section"
            aria-labelledby="ai-tasks-title"
        >
            <div class="ai-hub__section-heading ai-hub__section-heading--tasks">
                <div>
                    <span>{{ t('aiAssistant.taskEyebrow') }}</span>
                    <h2 id="ai-tasks-title">
                        {{ t('aiAssistant.tasks') }}
                    </h2>
                </div>
                <p>{{ t('aiAssistant.tasksDescription') }}</p>
            </div>

            <div
                class="ai-hub__filters"
                :aria-label="t('aiAssistant.taskFilters')"
            >
                <div class="ai-hub__status-filters">
                    <v-btn
                        v-for="item in categoryOptions"
                        :key="item.value"
                        size="small"
                        rounded="lg"
                        :variant="category === item.value ? 'flat' : 'text'"
                        :color="category === item.value ? 'primary' : undefined"
                        :aria-pressed="category === item.value"
                        @click="category = item.value"
                    >
                        {{ item.label }}
                        <span
                            v-if="item.value !== 'all'"
                            class="ai-hub__filter-count"
                        >{{ categoryCounts[item.value] || 0 }}</span>
                    </v-btn>
                </div>
                <v-select
                    v-model="library"
                    :items="libraryOptions"
                    item-title="name"
                    item-value="id"
                    :label="t('aiAssistant.libraryFilter')"
                    density="compact"
                    variant="outlined"
                    hide-details
                    class="ai-hub__library-filter"
                />
            </div>

            <v-alert
                v-if="tasksPartialError"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-4"
                data-testid="tasks-partial-error"
            >
                {{ t('aiAssistant.partialError') }}
            </v-alert>
            <v-alert
                v-if="tasksError"
                type="error"
                variant="tonal"
                data-testid="tasks-error"
            >
                {{ tasksError }}
                <template #append>
                    <v-btn
                        variant="text"
                        @click="loadTasks"
                    >
                        {{ t('common.retry') }}
                    </v-btn>
                </template>
            </v-alert>

            <div
                v-if="tasksLoading"
                class="ai-hub__task-list"
                aria-busy="true"
            >
                <v-skeleton-loader
                    v-for="index in 3"
                    :key="index"
                    type="list-item-avatar-three-line"
                    rounded="xl"
                />
            </div>
            <div
                v-else-if="tasks.length"
                class="ai-hub__task-list"
            >
                <v-card
                    v-for="task in tasks"
                    :key="task.id"
                    class="ai-task"
                    rounded="xl"
                    elevation="0"
                >
                    <div
                        class="ai-task__icon"
                        :class="`ai-task__icon--${task.category}`"
                    >
                        <v-icon>{{ statusIcon(task.category) }}</v-icon>
                    </div>
                    <div class="ai-task__body">
                        <div class="ai-task__topline">
                            <div>
                                <h3>{{ task.object.book_title || t('aiAssistant.deletedBook') }}</h3>
                                <p v-if="task.object.chapter_title">
                                    {{ task.object.chapter_title }}
                                </p>
                            </div>
                            <v-chip
                                size="small"
                                :color="statusColor(task.category)"
                                variant="tonal"
                            >
                                {{ categoryLabel(task.category) }}
                            </v-chip>
                        </div>
                        <p class="ai-task__message">
                            {{ taskMessage(task) }}
                        </p>
                        <v-progress-linear
                            v-if="task.category === 'running'"
                            :model-value="task.progress"
                            :indeterminate="task.progress == null"
                            color="primary"
                            rounded
                            height="5"
                            class="mb-3"
                        />
                        <div class="ai-task__footer">
                            <span><v-icon size="15">mdi-clock</v-icon>{{ formatTime(task.updated_at) }}</span>
                            <div class="ai-task__actions">
                                <v-btn
                                    v-if="task.allowed_actions.retry"
                                    size="small"
                                    variant="text"
                                    :loading="actingTaskId === task.id"
                                    @click="retryTask(task)"
                                >
                                    {{ t('common.retry') }}
                                </v-btn>
                                <v-btn
                                    v-if="task.allowed_actions.cancel"
                                    size="small"
                                    color="error"
                                    variant="text"
                                    @click="askCancel(task)"
                                >
                                    {{ t('common.cancel') }}
                                </v-btn>
                                <v-btn
                                    size="small"
                                    color="primary"
                                    variant="tonal"
                                    :href="task.detail_url"
                                    @click="trackTask(task)"
                                >
                                    {{ t('aiAssistant.openTask') }}
                                    <v-icon
                                        end
                                        size="17"
                                    >
                                        mdi-arrow-right
                                    </v-icon>
                                </v-btn>
                            </div>
                        </div>
                    </div>
                </v-card>
            </div>
            <v-card
                v-else-if="!tasksError"
                class="ai-hub__empty"
                rounded="xl"
                elevation="0"
                data-testid="tasks-empty"
            >
                <v-icon size="42">
                    mdi-check-circle-outline
                </v-icon>
                <h3>{{ t('aiAssistant.noTasks') }}</h3>
                <p>{{ t('aiAssistant.noTasksDescription') }}</p>
            </v-card>

            <v-pagination
                v-if="pagination.pages > 1"
                v-model="page"
                :length="pagination.pages"
                :total-visible="5"
                class="mt-5"
                :aria-label="t('aiAssistant.pagination')"
            />
        </section>

        <v-dialog
            v-model="cancelDialog"
            max-width="460"
        >
            <v-card rounded="xl">
                <v-card-title>{{ t('aiAssistant.cancelTitle') }}</v-card-title>
                <v-card-text>{{ t('aiAssistant.cancelDescription', { title: selectedTask?.object.book_title || '' }) }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="cancelDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        variant="flat"
                        :loading="actingTaskId === selectedTask?.id"
                        @click="cancelTask"
                    >
                        {{ t('aiAssistant.confirmCancel') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '#i18n';

type Capability = {
    id: string; name: string; description: string; icon: string; scope: string; entry: string;
    available: boolean; reason: string;
};
type TaskSummary = {
    id: string; feature: string; category: string; status: string; progress: number | null;
    progress_message: string; updated_at: string | null; detail_url: string;
    object: { library: string; book_id: number; book_title: string; chapter_title: string };
    allowed_actions: { cancel: boolean; retry: boolean }; safe_error: { code: string } | null;
};

const { t, locale } = useI18n();
const { $backend, $alert } = useNuxtApp();
const capabilities = ref<Capability[]>([]);
const capabilitiesLoading = ref(true);
const capabilitiesError = ref('');
const tasks = ref<TaskSummary[]>([]);
const tasksLoading = ref(true);
const tasksError = ref('');
const tasksPartialError = ref(false);
const category = ref('all');
const library = ref('all');
const page = ref(1);
const categoryCounts = ref<Record<string, number>>({});
const libraries = ref<Array<{ id: string; name: string }>>([]);
const pagination = ref({ page: 1, page_size: 12, total: 0, pages: 0 });
const cancelDialog = ref(false);
const selectedTask = ref<TaskSummary | null>(null);
const actingTaskId = ref('');
let taskRequest = 0;

const categoryOptions = computed(() => [
    { value: 'all', label: t('aiAssistant.statusAll') },
    { value: 'running', label: t('aiAssistant.statusRunning') },
    { value: 'pending_confirmation', label: t('aiAssistant.statusPending') },
    { value: 'failed', label: t('aiAssistant.statusFailed') },
    { value: 'completed', label: t('aiAssistant.statusCompleted') },
]);
const libraryOptions = computed(() => [
    { id: 'all', name: t('aiAssistant.allLibraries') },
    ...libraries.value,
]);

function errorMessage(response: Record<string, unknown>, fallback: string) {
    return typeof response?.msg === 'string' ? response.msg : fallback;
}

async function loadCapabilities() {
    capabilitiesLoading.value = true;
    capabilitiesError.value = '';
    try {
        const response = await $backend('/ai/hub/capabilities');
        if (response.err !== 'ok') throw new Error(errorMessage(response, t('aiAssistant.loadCapabilitiesFailed')));
        capabilities.value = response.capabilities || [];
        if (response.partial_errors?.length) capabilitiesError.value = t('aiAssistant.partialCapabilityError');
    } catch (error) {
        capabilitiesError.value = error instanceof Error ? error.message : t('aiAssistant.loadCapabilitiesFailed');
    } finally {
        capabilitiesLoading.value = false;
    }
}

async function loadTasks() {
    const request = ++taskRequest;
    tasksLoading.value = true;
    tasksError.value = '';
    tasksPartialError.value = false;
    try {
        const query = new URLSearchParams({ category: category.value, library: library.value, page: String(page.value), page_size: '12' });
        const response = await $backend(`/ai/hub/tasks?${query.toString()}`);
        if (request !== taskRequest) return;
        if (response.err !== 'ok') throw new Error(errorMessage(response, t('aiAssistant.loadTasksFailed')));
        tasks.value = response.tasks || [];
        categoryCounts.value = response.category_counts || {};
        libraries.value = response.libraries || [];
        pagination.value = response.pagination || { page: 1, page_size: 12, total: 0, pages: 0 };
        tasksPartialError.value = Boolean(response.partial_errors?.length);
    } catch (error) {
        if (request !== taskRequest) return;
        tasksError.value = error instanceof Error ? error.message : t('aiAssistant.loadTasksFailed');
        tasks.value = [];
    } finally {
        if (request === taskRequest) tasksLoading.value = false;
    }
}

function postEvent(event: string, feature = '', taskId = '') {
    void $backend('/ai/hub/events', {
        method: 'POST',
        body: JSON.stringify({ event, feature, task_id: taskId }),
    }).catch(() => undefined);
}

function trackCapability(capability: Capability) {
    if (capability.available && capability.entry) postEvent('capability_open', capability.id);
}

function trackTask(task: TaskSummary) {
    postEvent('task_open', task.feature, task.id);
}

function askCancel(task: TaskSummary) {
    selectedTask.value = task;
    cancelDialog.value = true;
}

async function performAction(task: TaskSummary, action: 'cancel' | 'retry') {
    actingTaskId.value = task.id;
    try {
        const response = await $backend(`/ai/hub/tasks/${task.feature}/${task.id}/${action}`, { method: 'POST' });
        if (response.err !== 'ok') throw new Error(errorMessage(response, t('aiAssistant.actionFailed')));
        $alert('success', action === 'cancel' ? t('aiAssistant.cancelRequested') : t('aiAssistant.retryRequested'));
        await loadTasks();
    } catch (error) {
        $alert('error', error instanceof Error ? error.message : t('aiAssistant.actionFailed'));
    } finally {
        actingTaskId.value = '';
    }
}

async function cancelTask() {
    if (!selectedTask.value) return;
    await performAction(selectedTask.value, 'cancel');
    cancelDialog.value = false;
    selectedTask.value = null;
}

async function retryTask(task: TaskSummary) {
    await performAction(task, 'retry');
}

function categoryLabel(value: string) {
    return categoryOptions.value.find(item => item.value === value)?.label || value;
}
function scopeLabel(value: string) {
    return t(`aiAssistant.scope.${['chapter', 'book', 'library'].includes(value) ? value : 'unknown'}`);
}
function availabilityReason(value: string) {
    const known = ['ai_disabled', 'feature_disabled', 'capability_probe_failed', 'runtime.not_installed', 'runtime.not_authenticated', 'runtime.version_unsupported'];
    return known.includes(value) ? t(`aiAssistant.availability.${value}`) : t('aiAssistant.availability.runtime.unavailable');
}
function statusIcon(value: string) {
    return ({ running: 'mdi-progress-clock', pending_confirmation: 'mdi-check-circle-outline', failed: 'mdi-alert-circle', completed: 'mdi-check-circle-outline' } as Record<string, string>)[value] || 'mdi-circle-small';
}
function statusColor(value: string) {
    return ({ running: 'primary', pending_confirmation: 'warning', failed: 'error', completed: 'success' } as Record<string, string>)[value] || 'default';
}
function taskMessage(task: TaskSummary) {
    const safeErrors = ['runtime.internal', 'runtime.unavailable', 'runtime.not_authenticated', 'runtime.usage_limit', 'result.invalid'];
    if (task.category === 'failed') {
        const code = task.safe_error?.code || '';
        return t(`aiAssistant.error.${safeErrors.includes(code) ? code : 'generic'}`);
    }
    return task.progress_message || t(`aiAssistant.message.${task.category}`);
}
function formatTime(value: string | null) {
    if (!value) return t('aiAssistant.unknownTime');
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

watch([category, library], () => {
    if (page.value !== 1) page.value = 1;
    else void loadTasks();
});
watch(page, () => void loadTasks());
onMounted(async () => {
    postEvent('hub_view');
    await Promise.all([loadCapabilities(), loadTasks()]);
});
</script>

<style scoped>
.ai-hub { max-width: 1240px; margin: 0 auto; padding: 22px 20px 96px; }
.ai-hub__hero { position: relative; display: flex; min-height: 250px; align-items: center; justify-content: space-between; padding: clamp(28px, 5vw, 60px); overflow: hidden; color: #f7fbf8; background: linear-gradient(125deg, #173f35 0%, #216b56 58%, #2c8568 100%); }
.ai-hub__hero::after { position: absolute; right: -70px; bottom: -120px; width: 360px; height: 360px; border: 1px solid rgba(255,255,255,.16); border-radius: 50%; content: ''; }
.ai-hub__hero-copy { position: relative; z-index: 1; max-width: 720px; }
.ai-hub__eyebrow,.ai-hub__section-heading span { display: flex; align-items: center; gap: 7px; margin-bottom: 12px; font-size: .78rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.ai-hub__hero h1 { max-width: 680px; margin: 0; font-size: clamp(2.15rem, 5vw, 4.2rem); line-height: 1.02; letter-spacing: -.045em; }
.ai-hub__hero p { max-width: 660px; margin: 22px 0 0; color: rgba(247,251,248,.78); font-size: clamp(1rem, 2vw, 1.2rem); line-height: 1.7; }
.ai-hub__hero-mark { position: relative; z-index: 1; display: grid; flex: 0 0 112px; width: 112px; height: 112px; place-items: center; border: 1px solid rgba(255,255,255,.25); border-radius: 30px; background: rgba(255,255,255,.1); transform: rotate(4deg); }
.ai-hub__section { margin-top: 52px; }
.ai-hub__section-heading { display: grid; grid-template-columns: minmax(260px,.8fr) minmax(320px,1fr); gap: 32px; align-items: end; margin-bottom: 22px; }
.ai-hub__section-heading span { margin-bottom: 5px; color: rgb(var(--v-theme-primary)); }
.ai-hub__section-heading h2 { margin: 0; font-size: clamp(1.7rem, 3vw, 2.35rem); letter-spacing: -.025em; }
.ai-hub__section-heading p { max-width: 650px; margin: 0; color: rgba(var(--v-theme-on-surface),.72); line-height: 1.7; }
.ai-capability,.ai-task,.ai-hub__empty { border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); background: rgb(var(--v-theme-surface)); }
.ai-capability { height: 100%; padding: 24px; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.ai-capability:hover { border-color: rgba(var(--v-theme-primary),.45); box-shadow: 0 15px 30px rgba(19,48,39,.09); transform: translateY(-2px); }
.ai-capability--disabled { background: rgba(var(--v-theme-on-surface),.035); }
.ai-capability--disabled:hover { border-color: rgba(var(--v-border-color),var(--v-border-opacity)); box-shadow: none; transform: none; }
.ai-capability__topline,.ai-task__topline,.ai-task__footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ai-capability__icon { display: grid; width: 52px; height: 52px; place-items: center; color: rgb(var(--v-theme-primary)); border-radius: 16px; background: rgba(var(--v-theme-primary),.1); }
.ai-capability h3 { margin: 22px 0 8px; font-size: 1.35rem; }
.ai-capability p { min-height: 48px; margin: 0; color: rgba(var(--v-theme-on-surface),.72); line-height: 1.6; }
.ai-capability__meta { display: flex; flex-wrap: wrap; gap: 12px 18px; margin-top: 18px; color: rgba(var(--v-theme-on-surface),.72); font-size: .82rem; }
.ai-capability__meta span { display: inline-flex; align-items: center; gap: 5px; }
.ai-hub__filters { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-bottom: 20px; padding: 10px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 16px; background: rgb(var(--v-theme-surface)); }
.ai-hub__status-filters { display: flex; flex-wrap: wrap; gap: 4px; }
.ai-hub__filter-count { display: inline-grid; min-width: 20px; height: 20px; margin-left: 7px; place-items: center; padding: 0 5px; border-radius: 99px; background: rgba(var(--v-theme-on-surface),.09); font-size: .72rem; }
.ai-hub__library-filter { flex: 0 0 210px; }
.ai-hub__task-list { display: grid; gap: 12px; }
.ai-task { display: grid; grid-template-columns: 50px minmax(0,1fr); gap: 17px; padding: 20px; }
.ai-task__icon { display: grid; width: 50px; height: 50px; place-items: center; border-radius: 15px; background: rgba(var(--v-theme-on-surface),.07); }
.ai-task__icon--running { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary),.1); }
.ai-task__icon--pending_confirmation { color: #9a6500; background: rgba(224,157,24,.14); }
.ai-task__icon--failed { color: rgb(var(--v-theme-error)); background: rgba(var(--v-theme-error),.1); }
.ai-task__icon--completed { color: rgb(var(--v-theme-success)); background: rgba(var(--v-theme-success),.1); }
.ai-task h3 { margin: 0; font-size: 1.04rem; }
.ai-task__topline p,.ai-task__message { color: rgba(var(--v-theme-on-surface),.72); }
.ai-task__topline p { margin: 4px 0 0; font-size: .86rem; }
.ai-task__message { margin: 12px 0; font-size: .9rem; }
.ai-task__footer { align-items: center; }
.ai-task__footer > span { display: inline-flex; align-items: center; gap: 5px; color: rgba(var(--v-theme-on-surface),.72); font-size: .78rem; }
.ai-task__actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.ai-hub__empty { padding: 48px 24px; text-align: center; }
.ai-hub__empty .v-icon { color: rgb(var(--v-theme-primary)); }
.ai-hub__empty h3 { margin: 13px 0 4px; }
.ai-hub__empty p { margin: 0; color: rgba(var(--v-theme-on-surface),.72); }
@media (max-width: 760px) {
    .ai-hub { padding: 10px 10px 80px; }
    .ai-hub__hero { min-height: 310px; align-items: flex-end; padding: 28px 22px; }
    .ai-hub__hero-mark { position: absolute; top: 24px; right: 22px; width: 70px; height: 70px; border-radius: 21px; }
    .ai-hub__hero-mark .v-icon { font-size: 34px !important; }
    .ai-hub__hero h1 { max-width: 88%; }
    .ai-hub__section { margin-top: 38px; }
    .ai-hub__section-heading { grid-template-columns: 1fr; gap: 10px; }
    .ai-hub__filters { align-items: stretch; flex-direction: column; }
    .ai-hub__status-filters { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
    .ai-hub__status-filters .v-btn:first-child { grid-column: 1 / -1; }
    .ai-hub__library-filter { flex-basis: auto; width: 100%; }
    .ai-task { grid-template-columns: 42px minmax(0,1fr); gap: 12px; padding: 16px; }
    .ai-task__icon { width: 42px; height: 42px; }
    .ai-task__topline,.ai-task__footer { align-items: flex-start; flex-direction: column; }
    .ai-task__actions { width: 100%; justify-content: flex-start; }
}
@media (prefers-reduced-motion: reduce) { .ai-capability { transition: none; } }
</style>
