<template>
    <div class="skill-page">
        <header class="skill-hero">
            <div>
                <p class="eyebrow">
                    {{ t('skills.aiCenter') }}
                </p>
                <h1>{{ t('skills.title') }}</h1>
                <p>{{ t('skills.description') }}</p>
            </div>
            <div class="hero-actions">
                <v-btn
                    color="primary"
                    prepend-icon="mdi-plus"
                    data-testid="create-blank-skill"
                    @click="createBlank"
                >
                    {{ t('skills.createBlank') }}
                </v-btn>
                <v-btn
                    variant="outlined"
                    prepend-icon="mdi-auto-fix"
                    data-testid="create-from-task"
                    @click="sourceDialog = true"
                >
                    {{ t('skills.createFromTask') }}
                </v-btn>
            </div>
        </header>

        <v-alert
            v-if="errorMessage"
            class="mb-4"
            type="error"
            closable
            data-testid="skill-error"
            @click:close="errorMessage = ''"
        >
            {{ errorMessage }}
        </v-alert>

        <div class="skill-workbench">
            <aside class="skill-list-panel">
                <div class="list-tools">
                    <v-text-field
                        v-model="query"
                        :label="t('skills.search')"
                        prepend-inner-icon="mdi-magnify"
                        density="compact"
                        hide-details
                        clearable
                        @keyup.enter="loadSkills"
                        @click:clear="loadSkills"
                    />
                    <v-select
                        v-model="statusFilter"
                        :items="statusOptions"
                        item-title="title"
                        item-value="value"
                        :label="t('skills.statusFilter')"
                        density="compact"
                        hide-details
                        @update:model-value="loadSkills"
                    />
                </div>
                <v-progress-linear
                    v-if="loadingList"
                    indeterminate
                    color="primary"
                />
                <button
                    v-for="skill in skills"
                    :key="skill.id"
                    class="skill-list-item"
                    :class="{ active: selected?.id === skill.id }"
                    :aria-pressed="selected?.id === skill.id"
                    type="button"
                    @click="requestSelectSkill(skill.id)"
                >
                    <span class="skill-list-title">{{ skill.name }}</span>
                    <span class="skill-list-description">{{ skill.description }}</span>
                    <span class="skill-list-meta">
                        <v-chip
                            size="x-small"
                            :color="statusColor(skill.status)"
                            variant="tonal"
                        >
                            {{ statusLabel(skill.status) }}
                        </v-chip>
                        <span>v{{ skill.current_version }}</span>
                    </span>
                </button>
                <v-empty-state
                    v-if="!loadingList && !skills.length"
                    icon="mdi-toolbox-outline"
                    :title="t('skills.emptyTitle')"
                    :text="t('skills.emptyText')"
                    data-testid="skill-empty-state"
                />
            </aside>

            <section
                class="skill-editor-panel"
                :aria-labelledby="selected ? 'skill-editor-title' : undefined"
            >
                <v-empty-state
                    v-if="!selected"
                    icon="mdi-file-document-edit-outline"
                    :title="t('skills.selectTitle')"
                    :text="t('skills.selectText')"
                />
                <template v-else>
                    <div class="editor-heading">
                        <div>
                            <div class="editor-title-row">
                                <h2 id="skill-editor-title">
                                    {{ selected.name }}
                                </h2>
                                <v-chip
                                    :color="statusColor(selected.status)"
                                    variant="tonal"
                                    size="small"
                                >
                                    {{ statusLabel(selected.status) }} · v{{ selected.current_version }}
                                </v-chip>
                                <v-chip
                                    v-if="!editorMatchesCurrentVersion"
                                    color="info"
                                    variant="tonal"
                                    size="small"
                                >
                                    {{ t('skills.inspectingVersion', { version: editorVersion }) }}
                                </v-chip>
                                <v-chip
                                    v-else-if="hasUnsavedChanges"
                                    color="warning"
                                    variant="tonal"
                                    size="small"
                                >
                                    {{ t('skills.unsavedChanges') }}
                                </v-chip>
                            </div>
                            <p>{{ t('skills.versionHint') }}</p>
                        </div>
                        <div class="editor-actions">
                            <v-btn
                                variant="outlined"
                                prepend-icon="mdi-download"
                                :href="packageDownloadUrl"
                                :disabled="!packageInfo"
                                data-testid="download-skill-package"
                            >
                                {{ t('skills.downloadZip') }}
                            </v-btn>
                            <v-btn
                                color="error"
                                variant="text"
                                prepend-icon="mdi-delete-outline"
                                data-testid="delete-skill"
                                @click="deleteDialog = true"
                            >
                                {{ t('skills.deleteSkill') }}
                            </v-btn>
                            <v-btn
                                v-if="selected.status !== 'disabled'"
                                variant="text"
                                @click="changeStatus('disabled')"
                            >
                                {{ t('skills.disable') }}
                            </v-btn>
                            <v-btn
                                v-else
                                variant="text"
                                @click="changeStatus('draft')"
                            >
                                {{ t('skills.returnDraft') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                variant="outlined"
                                :disabled="selected.status === 'enabled' || !editorReadyToRun"
                                @click="changeStatus('enabled')"
                            >
                                {{ t('skills.enable') }}
                            </v-btn>
                            <v-btn
                                color="primary"
                                :loading="saving"
                                data-testid="save-skill-version"
                                @click="saveVersion"
                            >
                                {{ t('skills.saveNewVersion') }}
                            </v-btn>
                        </div>
                    </div>

                    <v-tabs
                        v-model="tab"
                        color="primary"
                        class="skill-tabs"
                    >
                        <v-tab value="edit">
                            {{ t('skills.edit') }}
                        </v-tab>
                        <v-tab value="preview">
                            {{ t('skills.preview') }}
                        </v-tab>
                        <v-tab value="package">
                            {{ t('skills.packageFiles') }}
                        </v-tab>
                        <v-tab value="versions">
                            {{ t('skills.versions') }}
                        </v-tab>
                        <v-tab value="runs">
                            {{ t('skills.runs') }}
                        </v-tab>
                    </v-tabs>

                    <v-window v-model="tab">
                        <v-window-item value="edit">
                            <div class="editor-grid">
                                <v-text-field
                                    v-model="editor.name"
                                    :label="t('skills.name')"
                                    counter="120"
                                />
                                <v-text-field
                                    v-model="editor.packageName"
                                    class="package-name-field"
                                    :label="t('skills.packageName')"
                                    :hint="t('skills.packageNameHint')"
                                    persistent-hint
                                    counter="64"
                                />
                                <v-text-field
                                    v-model="editor.description"
                                    :label="t('skills.skillDescription')"
                                    counter="500"
                                />
                                <v-textarea
                                    v-model="editor.scope"
                                    :label="t('skills.scope')"
                                    rows="3"
                                />
                                <v-textarea
                                    v-model="editor.trigger"
                                    :label="t('skills.trigger')"
                                    rows="3"
                                />
                                <v-textarea
                                    v-model="editor.prerequisites"
                                    :label="t('skills.prerequisites')"
                                    rows="4"
                                />
                                <v-textarea
                                    v-model="editor.steps"
                                    :label="t('skills.steps')"
                                    rows="6"
                                />
                                <v-textarea
                                    v-model="editor.termsExamples"
                                    :label="t('skills.termsExamples')"
                                    rows="4"
                                />
                                <v-textarea
                                    v-model="editor.failureConditions"
                                    :label="t('skills.failureConditions')"
                                    rows="4"
                                />
                            </div>
                            <v-expansion-panels
                                variant="accordion"
                                class="mt-3"
                            >
                                <v-expansion-panel :title="t('skills.schemas')">
                                    <v-expansion-panel-text>
                                        <div class="schema-grid">
                                            <v-textarea
                                                v-model="editor.inputSchema"
                                                :label="t('skills.inputSchema')"
                                                class="code-field"
                                                rows="14"
                                            />
                                            <v-textarea
                                                v-model="editor.outputSchema"
                                                :label="t('skills.outputSchema')"
                                                class="code-field"
                                                rows="14"
                                            />
                                        </div>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                                <v-expansion-panel :title="t('skills.sourcesAndTests')">
                                    <v-expansion-panel-text>
                                        <div class="schema-grid">
                                            <v-textarea
                                                v-model="editor.sources"
                                                :label="t('skills.sources')"
                                                class="code-field"
                                                rows="10"
                                            />
                                            <v-textarea
                                                v-model="editor.selfTests"
                                                :label="t('skills.selfTests')"
                                                class="code-field"
                                                rows="10"
                                            />
                                        </div>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                            <v-textarea
                                v-model="editor.markdown"
                                class="mt-4 code-field"
                                :label="t('skills.markdownBody')"
                                rows="18"
                                auto-grow
                            />
                            <v-alert
                                v-if="findings.length"
                                type="warning"
                                variant="tonal"
                                class="mt-2"
                            >
                                {{ t('skills.sensitiveFound', { count: findings.length }) }}
                                <ul>
                                    <li
                                        v-for="(finding, index) in findings"
                                        :key="`${finding.kind}-${index}`"
                                    >
                                        {{ finding.kind }} · {{ finding.field }}
                                    </li>
                                </ul>
                                <v-checkbox
                                    v-if="!hardSensitiveBlock"
                                    v-model="sensitiveAcknowledged"
                                    hide-details
                                    :label="t('skills.sensitiveAcknowledge')"
                                />
                            </v-alert>
                        </v-window-item>

                        <v-window-item value="preview">
                            <article
                                class="skill-preview"
                                data-testid="skill-preview"
                            >
                                <p class="eyebrow">
                                    SKILL v{{ selected.current_version }}
                                </p>
                                <h2>{{ editor.name }}</h2>
                                <p class="preview-description">
                                    {{ editor.description }}
                                </p>
                                <div class="preview-columns">
                                    <section>
                                        <h3>{{ t('skills.scope') }}</h3>
                                        <p>{{ editor.scope }}</p>
                                    </section>
                                    <section>
                                        <h3>{{ t('skills.steps') }}</h3>
                                        <ol>
                                            <li
                                                v-for="step in splitLines(editor.steps)"
                                                :key="step"
                                            >
                                                {{ step }}
                                            </li>
                                        </ol>
                                    </section>
                                </div>
                                <h3>{{ t('skills.markdownBody') }}</h3>
                                <pre>{{ editor.markdown }}</pre>
                            </article>
                        </v-window-item>

                        <v-window-item value="package">
                            <v-progress-linear
                                v-if="packageLoading"
                                indeterminate
                                color="primary"
                                :aria-label="t('skills.packageLoading')"
                            />
                            <section
                                v-else-if="packageInfo"
                                class="package-browser"
                                data-testid="skill-package-browser"
                            >
                                <div class="package-heading">
                                    <div>
                                        <p class="eyebrow">
                                            {{ t('skills.portablePackage') }}
                                        </p>
                                        <h3>{{ packageInfo.filename }}</h3>
                                        <p>{{ t('skills.packageHint', { version: packageInfo.version }) }}</p>
                                        <p class="storage-path">
                                            {{ t('skills.storagePath') }}：<code>{{ packageInfo.storage_path }}</code>
                                        </p>
                                    </div>
                                    <v-btn
                                        color="primary"
                                        prepend-icon="mdi-download"
                                        :href="packageDownloadUrl"
                                    >
                                        {{ t('skills.downloadZip') }}
                                    </v-btn>
                                </div>
                                <div class="package-layout">
                                    <nav :aria-label="t('skills.packageFiles')">
                                        <button
                                            v-for="file in packageInfo.files"
                                            :key="file.path"
                                            type="button"
                                            class="package-file"
                                            :class="{ active: activePackagePath === file.path }"
                                            :aria-pressed="activePackagePath === file.path"
                                            @click="activePackagePath = file.path"
                                        >
                                            <span>{{ file.path }}</span>
                                            <small>{{ file.size }} B</small>
                                        </button>
                                    </nav>
                                    <article>
                                        <div class="package-file-title">
                                            {{ activePackageFile?.path }}
                                        </div>
                                        <pre>{{ activePackageFile?.content }}</pre>
                                    </article>
                                </div>
                            </section>
                        </v-window-item>

                        <v-window-item value="versions">
                            <div class="version-list">
                                <v-card
                                    v-for="version in versions"
                                    :key="version.id"
                                    variant="outlined"
                                >
                                    <v-card-title>v{{ version.version }}</v-card-title>
                                    <v-card-subtitle>{{ formatDate(version.created_at) }} · {{ version.content_hash.slice(0, 10) }}</v-card-subtitle>
                                    <v-card-text>{{ sourceLabel(version.source) }}</v-card-text>
                                    <v-card-actions>
                                        <v-btn
                                            variant="text"
                                            @click="requestLoadVersion(version)"
                                        >
                                            {{ t('skills.inspectVersion') }}
                                        </v-btn>
                                        <v-btn
                                            v-if="version.version !== selected.current_version"
                                            color="warning"
                                            variant="text"
                                            @click="requestRollback(version.version)"
                                        >
                                            {{ t('skills.rollback') }}
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </div>
                        </v-window-item>

                        <v-window-item value="runs">
                            <v-alert
                                v-if="!editorReadyToRun"
                                type="info"
                                variant="tonal"
                                class="mb-3"
                            >
                                {{ t('skills.syncBeforeRun') }}
                            </v-alert>
                            <section class="run-console">
                                <div class="run-console-heading">
                                    <div>
                                        <h3>{{ t('skills.runCurrentVersion', { version: selected.current_version }) }}</h3>
                                        <p>{{ t('skills.runPrivacy') }}</p>
                                    </div>
                                    <div class="run-actions">
                                        <v-btn
                                            variant="outlined"
                                            prepend-icon="mdi-flask-outline"
                                            :disabled="!editorReadyToRun"
                                            @click="startRun('trial')"
                                        >
                                            {{ t('skills.trialRun') }}
                                        </v-btn>
                                        <v-btn
                                            color="primary"
                                            prepend-icon="mdi-play"
                                            :disabled="selected.status !== 'enabled' || !editorReadyToRun"
                                            @click="startRun('manual')"
                                        >
                                            {{ t('skills.manualRun') }}
                                        </v-btn>
                                    </div>
                                </div>
                                <v-textarea
                                    v-model="runInput"
                                    :label="t('skills.runInput')"
                                    class="code-field"
                                    rows="8"
                                />
                            </section>
                            <div class="run-list">
                                <v-card
                                    v-for="run in runs"
                                    :key="run.id"
                                    variant="outlined"
                                    :data-testid="`skill-run-${run.status}`"
                                >
                                    <v-card-title class="run-title">
                                        <span>{{ run.mode === 'trial' ? t('skills.trialRun') : t('skills.manualRun') }} · v{{ run.version }}</span>
                                        <v-chip
                                            size="small"
                                            :color="runColor(run.status)"
                                            variant="tonal"
                                        >
                                            {{ runStatusLabel(run.status) }}
                                        </v-chip>
                                    </v-card-title>
                                    <v-card-text>
                                        <dl class="run-metadata">
                                            <div><dt>{{ t('skills.inputSummary') }}</dt><dd>{{ inputSummary(run.input_summary) }}</dd></div>
                                            <div><dt>{{ t('skills.authorizationContext') }}</dt><dd>{{ authorizationSummary(run.authorization_context) }}</dd></div>
                                            <div><dt>{{ t('skills.progress') }}</dt><dd>{{ run.progress_message }}</dd></div>
                                        </dl>
                                        <pre v-if="run.status === 'succeeded'">{{ pretty(run.result) }}</pre>
                                        <v-alert
                                            v-if="run.error"
                                            type="error"
                                            variant="tonal"
                                        >
                                            {{ run.error.message }}
                                        </v-alert>
                                    </v-card-text>
                                    <v-card-actions v-if="['queued', 'running'].includes(run.status)">
                                        <v-btn
                                            color="error"
                                            variant="text"
                                            @click="cancelRun(run)"
                                        >
                                            {{ t('common.cancel') }}
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </div>
                        </v-window-item>
                    </v-window>
                </template>
            </section>
        </div>

        <v-dialog
            v-model="sourceDialog"
            max-width="520"
        >
            <v-card>
                <v-card-title>{{ t('skills.createFromTask') }}</v-card-title>
                <v-card-text>
                    <p class="mb-4">
                        {{ t('skills.sourceTaskHint') }}
                    </p>
                    <v-text-field
                        v-model="sourceTaskId"
                        :label="t('skills.sourceTaskId')"
                        autofocus
                    />
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="sourceDialog = false">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="primary"
                        @click="createFromTask"
                    >
                        {{ t('skills.createFromTaskConfirm') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="rollbackDialog"
            max-width="520"
        >
            <v-card>
                <v-card-title>{{ t('skills.rollbackTitle', { version: rollbackTarget }) }}</v-card-title>
                <v-card-text>{{ t('skills.rollbackHint') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="rollbackDialog = false">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="warning"
                        @click="confirmRollback"
                    >
                        {{ t('skills.rollback') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="discardDialog"
            max-width="520"
        >
            <v-card>
                <v-card-title>{{ t('skills.unsavedTitle') }}</v-card-title>
                <v-card-text>{{ t('skills.unsavedHint') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="cancelDiscard">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        @click="confirmDiscard"
                    >
                        {{ t('skills.discardChanges') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="deleteDialog"
            max-width="520"
        >
            <v-card>
                <v-card-title>{{ t('skills.deleteTitle', { name: selected?.name }) }}</v-card-title>
                <v-card-text>{{ t('skills.deleteHint') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="deleteDialog = false">
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        color="error"
                        :loading="deleting"
                        data-testid="confirm-delete-skill"
                        @click="confirmDelete"
                    >
                        {{ t('skills.deleteSkill') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

interface SkillSummary {
    id: string;
    name: string;
    description: string;
    status: string;
    current_version: number;
}

interface SkillVersion {
    id: number;
    version: number;
    content_hash: string;
    source: Record<string, unknown>;
    manifest: Record<string, any>;
    markdown: string;
    created_at: string;
}

interface SkillDetail extends SkillSummary {
    version: SkillVersion;
}

interface SkillRun {
    id: string;
    mode: string;
    version: number;
    status: string;
    progress_message: string;
    input_summary: Record<string, any>;
    authorization_context: Record<string, any>;
    result: Record<string, unknown>;
    error?: { code: string; message: string };
}

interface SkillPackageFile {
    path: string;
    content_type: string;
    content: string;
    size: number;
}

interface SkillPackage {
    name: string;
    folder: string;
    filename: string;
    version: number;
    format: string;
    download_url: string;
    storage_path: string;
    archive_path: string;
    files: SkillPackageFile[];
}

const { t } = useI18n();
const { $backend } = useNuxtApp();
const skills = ref<SkillSummary[]>([]);
const selected = ref<SkillDetail | null>(null);
const versions = ref<SkillVersion[]>([]);
const runs = ref<SkillRun[]>([]);
const packageInfo = ref<SkillPackage | null>(null);
const activePackagePath = ref('SKILL.md');
const loadingList = ref(false);
const packageLoading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const query = ref('');
const statusFilter = ref('');
const tab = ref('edit');
const errorMessage = ref('');
const sourceDialog = ref(false);
const sourceTaskId = ref('');
const rollbackDialog = ref(false);
const rollbackTarget = ref(0);
const discardDialog = ref(false);
const deleteDialog = ref(false);
const editorBaseline = ref('');
const editorVersion = ref(0);
let pendingDiscardAction: null | (() => Promise<void> | void) = null;
const findings = ref<Array<{ kind: string; field: string; hard_block: boolean }>>([]);
const sensitiveAcknowledged = ref(false);
const runInput = ref('{\n  "content": ""\n}');
const pollTimers = new Map<string, ReturnType<typeof setInterval>>();

const editor = reactive({
    name: '', packageName: '', description: '', scope: '', trigger: '', prerequisites: '', steps: '', termsExamples: '',
    failureConditions: '', inputSchema: '{}', outputSchema: '{}', sources: '[]', selfTests: '[]', markdown: '',
});

const statusOptions = computed(() => [
    { title: t('skills.statusAll'), value: '' },
    { title: t('skills.statusDraft'), value: 'draft' },
    { title: t('skills.statusEnabled'), value: 'enabled' },
    { title: t('skills.statusDisabled'), value: 'disabled' },
]);
const hardSensitiveBlock = computed(() => findings.value.some(item => item.hard_block));
const hasUnsavedChanges = computed(() => Boolean(selected.value) && editorSnapshot() !== editorBaseline.value);
const editorMatchesCurrentVersion = computed(
    () => Boolean(selected.value) && editorVersion.value === selected.value?.current_version,
);
const editorReadyToRun = computed(() => editorMatchesCurrentVersion.value && !hasUnsavedChanges.value);
const packageDownloadUrl = computed(() => packageInfo.value?.download_url || '#');
const activePackageFile = computed(
    () => packageInfo.value?.files.find(file => file.path === activePackagePath.value) || packageInfo.value?.files[0],
);

onMounted(loadSkills);
onBeforeUnmount(() => pollTimers.forEach(timer => clearInterval(timer)));

async function request(url: string, options?: Record<string, unknown>) {
    const response = await $backend(url, options);
    if (response.err !== 'ok') {
        if (response.err === 'skill.sensitive_content') {
            findings.value = response.findings || [];
        }
        throw new Error(response.msg || response.err);
    }
    return response;
}

async function loadSkills() {
    loadingList.value = true;
    errorMessage.value = '';
    try {
        const params = new URLSearchParams();
        if (query.value) params.set('q', query.value);
        if (statusFilter.value) params.set('status', statusFilter.value);
        const response = await request(`/ai/skills?${params.toString()}`);
        skills.value = response.skills;
        if (selected.value && !skills.value.some(skill => skill.id === selected.value?.id)) selected.value = null;
    } catch (error) {
        errorMessage.value = messageOf(error);
    } finally {
        loadingList.value = false;
    }
}

function requestSelectSkill(id: string) {
    if (selected.value?.id === id) return;
    runWithUnsavedGuard(() => selectSkill(id));
}

async function selectSkill(id: string) {
    errorMessage.value = '';
    try {
        const response = await request(`/ai/skills/${id}`);
        selected.value = response.skill;
        loadVersionIntoEditor(response.skill.version);
        await Promise.all([loadVersions(), loadRuns(), loadPackage()]);
    } catch (error) {
        errorMessage.value = messageOf(error);
    }
}

async function createBlank() {
    runWithUnsavedGuard(() => createSkill({}));
}

async function createFromTask() {
    runWithUnsavedGuard(async () => {
        const created = await createSkill({ source_task_id: sourceTaskId.value.trim() });
        if (created) {
            sourceDialog.value = false;
            sourceTaskId.value = '';
        }
    });
}

async function createSkill(payload: Record<string, unknown>) {
    errorMessage.value = '';
    try {
        const response = await request('/ai/skills', jsonOptions('POST', payload));
        await loadSkills();
        await selectSkill(response.skill.id);
        return true;
    } catch (error) {
        errorMessage.value = messageOf(error);
        return false;
    }
}

function buildManifest() {
    return {
        name: editor.name,
        package_name: editor.packageName,
        description: editor.description,
        scope: editor.scope,
        prerequisites: splitLines(editor.prerequisites),
        trigger: editor.trigger,
        input_schema: JSON.parse(editor.inputSchema),
        steps: splitLines(editor.steps),
        terms_examples: splitLines(editor.termsExamples),
        failure_conditions: splitLines(editor.failureConditions),
        output_schema: JSON.parse(editor.outputSchema),
        sources: JSON.parse(editor.sources),
        self_tests: JSON.parse(editor.selfTests),
    };
}

async function saveVersion() {
    if (!selected.value) return;
    saving.value = true;
    errorMessage.value = '';
    findings.value = [];
    try {
        const response = await request(
            `/ai/skills/${selected.value.id}`,
            jsonOptions('PATCH', {
                base_version: selected.value.current_version,
                manifest: buildManifest(),
                markdown: editor.markdown,
                sensitive_acknowledged: sensitiveAcknowledged.value,
            }),
        );
        selected.value = response.skill;
        loadVersionIntoEditor(response.skill.version);
        await Promise.all([loadSkills(), loadVersions(), loadRuns(), loadPackage()]);
    } catch (error) {
        errorMessage.value = messageOf(error);
    } finally {
        saving.value = false;
    }
}

function loadVersionIntoEditor(version: SkillVersion) {
    const manifest = version.manifest;
    editor.name = manifest.name || '';
    editor.packageName = manifest.package_name || '';
    editor.description = manifest.description || '';
    editor.scope = manifest.scope || '';
    editor.trigger = manifest.trigger || '';
    editor.prerequisites = (manifest.prerequisites || []).join('\n');
    editor.steps = (manifest.steps || []).join('\n');
    editor.termsExamples = (manifest.terms_examples || []).join('\n');
    editor.failureConditions = (manifest.failure_conditions || []).join('\n');
    editor.inputSchema = pretty(manifest.input_schema || {});
    editor.outputSchema = pretty(manifest.output_schema || {});
    editor.sources = pretty(manifest.sources || []);
    editor.selfTests = pretty(manifest.self_tests || []);
    editor.markdown = version.markdown || '';
    sensitiveAcknowledged.value = false;
    findings.value = [];
    editorVersion.value = version.version;
    editorBaseline.value = editorSnapshot();
}

function requestLoadVersion(version: SkillVersion) {
    runWithUnsavedGuard(() => loadVersionIntoEditor(version));
}

function editorSnapshot() {
    return JSON.stringify(editor);
}

function runWithUnsavedGuard(action: () => Promise<void> | void) {
    if (!hasUnsavedChanges.value) {
        void action();
        return;
    }
    pendingDiscardAction = action;
    discardDialog.value = true;
}

function cancelDiscard() {
    pendingDiscardAction = null;
    discardDialog.value = false;
}

function confirmDiscard() {
    const action = pendingDiscardAction;
    pendingDiscardAction = null;
    discardDialog.value = false;
    if (action) void action();
}

async function loadVersions() {
    if (!selected.value) return;
    const response = await request(`/ai/skills/${selected.value.id}/versions`);
    versions.value = response.versions;
}

async function loadRuns() {
    if (!selected.value) return;
    const response = await request(`/ai/skills/${selected.value.id}/runs`);
    runs.value = response.runs;
    response.runs.filter((run: SkillRun) => ['queued', 'running'].includes(run.status)).forEach(startPolling);
}

async function loadPackage() {
    if (!selected.value) return;
    packageLoading.value = true;
    try {
        const response = await request(`/ai/skills/${selected.value.id}/package?version=${selected.value.current_version}`);
        packageInfo.value = response.package;
        activePackagePath.value = response.package.files[0]?.path || '';
    } finally {
        packageLoading.value = false;
    }
}

async function changeStatus(status: string) {
    if (!selected.value) return;
    errorMessage.value = '';
    try {
        const response = await request(`/ai/skills/${selected.value.id}/status`, jsonOptions('POST', { status }));
        selected.value = response.skill;
        await loadSkills();
    } catch (error) {
        errorMessage.value = messageOf(error);
        if (messageOf(error).includes('试运行')) tab.value = 'runs';
    }
}

function openRollback(version: number) {
    rollbackTarget.value = version;
    rollbackDialog.value = true;
}

function requestRollback(version: number) {
    runWithUnsavedGuard(() => openRollback(version));
}

async function confirmRollback() {
    if (!selected.value) return;
    try {
        const response = await request(
            `/ai/skills/${selected.value.id}/rollback`,
            jsonOptions('POST', { version: rollbackTarget.value }),
        );
        selected.value = response.skill;
        loadVersionIntoEditor(response.skill.version);
        rollbackDialog.value = false;
        await Promise.all([loadSkills(), loadVersions(), loadRuns(), loadPackage()]);
    } catch (error) {
        errorMessage.value = messageOf(error);
    }
}

async function startRun(mode: string) {
    if (!selected.value) return;
    errorMessage.value = '';
    try {
        const input = JSON.parse(runInput.value);
        const response = await request(
            `/ai/skills/${selected.value.id}/runs`,
            jsonOptions('POST', { mode, version: selected.value.current_version, input, authorization_context: { book_ids: [] } }),
        );
        runs.value.unshift(response.run);
        startPolling(response.run);
    } catch (error) {
        errorMessage.value = messageOf(error);
    }
}

function startPolling(run: SkillRun) {
    if (!selected.value || pollTimers.has(run.id)) return;
    const skillId = selected.value.id;
    const timer = setInterval(async () => {
        try {
            const response = await request(`/ai/skills/${skillId}/runs/${run.id}`);
            const index = runs.value.findIndex(item => item.id === run.id);
            if (index >= 0) runs.value[index] = response.run;
            if (!['queued', 'running'].includes(response.run.status)) {
                clearInterval(timer);
                pollTimers.delete(run.id);
            }
        } catch (_error) {
            clearInterval(timer);
            pollTimers.delete(run.id);
        }
    }, 1500);
    pollTimers.set(run.id, timer);
}

async function cancelRun(run: SkillRun) {
    if (!selected.value) return;
    try {
        const response = await request(`/ai/skills/${selected.value.id}/runs/${run.id}/cancel`, jsonOptions('POST', {}));
        const index = runs.value.findIndex(item => item.id === run.id);
        if (index >= 0) runs.value[index] = response.run;
    } catch (error) {
        errorMessage.value = messageOf(error);
    }
}

async function confirmDelete() {
    if (!selected.value) return;
    deleting.value = true;
    errorMessage.value = '';
    try {
        await request(`/ai/skills/${selected.value.id}`, jsonOptions('DELETE', {}));
        pollTimers.forEach(timer => clearInterval(timer));
        pollTimers.clear();
        selected.value = null;
        packageInfo.value = null;
        versions.value = [];
        runs.value = [];
        deleteDialog.value = false;
        await loadSkills();
    } catch (error) {
        errorMessage.value = messageOf(error);
    } finally {
        deleting.value = false;
    }
}

function jsonOptions(method: string, value: Record<string, unknown>) {
    return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}

function splitLines(value: string) {
    return value.split('\n').map(item => item.trim()).filter(Boolean);
}

function pretty(value: unknown) {
    return JSON.stringify(value, null, 2);
}

function messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function statusLabel(status: string) {
    return t(`skills.status${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

function statusColor(status: string) {
    return ({ enabled: 'success', disabled: 'grey', draft: 'warning' } as Record<string, string>)[status] || 'grey';
}

function runStatusLabel(status: string) {
    return t(`skills.runStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`);
}

function runColor(status: string) {
    return ({ succeeded: 'success', failed: 'error', cancelled: 'grey', running: 'primary', queued: 'warning' } as Record<string, string>)[status] || 'grey';
}

function formatDate(value: string) {
    return value ? new Date(value).toLocaleString() : '';
}

function sourceLabel(source: Record<string, unknown>) {
    if (source.kind === 'rollback') return t('skills.sourceRollback', { version: source.target_version });
    if (source.kind === 'ai_task') return t('skills.sourceTask');
    if (source.kind === 'edit') return t('skills.sourceEdit');
    return t('skills.sourceBlank');
}

function inputSummary(summary: Record<string, any>) {
    return (summary.fields || []).map((field: any) => `${field.name}:${field.type}${field.size === undefined ? '' : `(${field.size})`}`).join(', ') || '—';
}

function authorizationSummary(context: Record<string, any>) {
    const books = context.book_ids || [];
    return books.length ? t('skills.authorizedBooks', { count: books.length }) : t('skills.noResourceAuthorization');
}
</script>

<style scoped>
.skill-page { width: min(1480px, 100%); margin: 0 auto; padding: 22px 10px 48px; }
.skill-hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 22px; padding: 28px 30px; border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 22px; background: linear-gradient(135deg, rgba(var(--v-theme-primary), .12), rgba(var(--v-theme-surface), .96) 48%); }
.skill-hero h1 { margin: 0 0 8px; font-size: clamp(30px, 4vw, 48px); line-height: 1.08; letter-spacing: -.03em; }
.skill-hero p { max-width: 760px; margin: 0; color: rgb(var(--v-theme-on-surface-variant)); }
.eyebrow { margin: 0 0 8px !important; color: rgb(var(--v-theme-primary)) !important; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.hero-actions,.editor-actions,.run-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.skill-workbench { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); min-height: 680px; overflow: hidden; border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 22px; background: rgb(var(--v-theme-surface)); box-shadow: 0 18px 50px rgba(0,0,0,.08); }
.skill-list-panel { min-width: 0; border-inline-end: 1px solid rgb(var(--v-theme-surface-variant)); background: rgba(var(--v-theme-surface-variant), .18); }
.list-tools { display: grid; gap: 10px; padding: 16px; border-bottom: 1px solid rgb(var(--v-theme-surface-variant)); }
.skill-list-item { display: grid; width: 100%; gap: 6px; padding: 16px 18px; color: inherit; border: 0; border-block-end: 1px solid rgba(var(--v-theme-on-surface), .1); border-inline-start: 4px solid transparent; background: transparent; cursor: pointer; text-align: start; }
.skill-list-item:hover,.skill-list-item:focus-visible { background: rgba(var(--v-theme-primary), .08); }
.skill-list-item:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -3px; }
.skill-list-item.active { border-inline-start-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .12); }
.skill-list-title { font-weight: 750; }
.skill-list-description { display: -webkit-box; overflow: hidden; color: rgb(var(--v-theme-on-surface-variant)); font-size: 13px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.skill-list-meta { display: flex; align-items: center; justify-content: space-between; color: rgb(var(--v-theme-on-surface-variant)); font-size: 12px; }
.skill-editor-panel { min-width: 0; padding: 24px 28px 38px; }
.editor-heading,.run-console-heading { display: flex; align-items: start; justify-content: space-between; gap: 20px; }
.editor-heading h2 { margin: 0; font-size: 28px; }
.editor-heading p,.run-console-heading p { margin: 5px 0 0; color: rgb(var(--v-theme-on-surface-variant)); font-size: 13px; }
.editor-title-row,.run-title { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.skill-tabs { margin: 20px 0; border-bottom: 1px solid rgb(var(--v-theme-surface-variant)); }
.editor-grid,.schema-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.code-field :deep(textarea) { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; }
.skill-preview { padding: clamp(20px, 4vw, 46px); border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 18px; background: rgba(var(--v-theme-surface-variant), .12); }
.skill-preview h2 { margin: 0; font-size: 36px; }
.skill-preview h3 { margin: 28px 0 8px; }
.preview-description { max-width: 760px; color: rgb(var(--v-theme-on-surface-variant)); font-size: 18px; }
.preview-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
.package-browser { overflow: hidden; border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 18px; }
.package-heading { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px; border-block-end: 1px solid rgb(var(--v-theme-surface-variant)); background: rgba(var(--v-theme-primary), .06); }
.package-heading h3,.package-heading p { margin: 0; }
.package-heading h3 { overflow-wrap: anywhere; }
.package-heading p:not(.eyebrow) { margin-top: 5px; color: rgb(var(--v-theme-on-surface-variant)); font-size: 13px; }
.storage-path { overflow-wrap: anywhere; }
.storage-path code { padding: 2px 5px; border-radius: 5px; background: rgba(var(--v-theme-on-surface), .07); }
.package-layout { display: grid; grid-template-columns: minmax(190px, 260px) minmax(0, 1fr); min-height: 430px; }
.package-layout nav { border-inline-end: 1px solid rgb(var(--v-theme-surface-variant)); background: rgba(var(--v-theme-surface-variant), .14); }
.package-file { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; color: inherit; border: 0; border-block-end: 1px solid rgba(var(--v-theme-on-surface), .08); border-inline-start: 3px solid transparent; background: transparent; cursor: pointer; text-align: start; }
.package-file:hover,.package-file:focus-visible,.package-file.active { background: rgba(var(--v-theme-primary), .1); }
.package-file.active { border-inline-start-color: rgb(var(--v-theme-primary)); font-weight: 700; }
.package-file:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -3px; }
.package-file small { color: rgb(var(--v-theme-on-surface-variant)); white-space: nowrap; }
.package-layout article { min-width: 0; padding: 18px; }
.package-file-title { margin-bottom: 10px; font-weight: 750; }
pre { max-width: 100%; padding: 16px; overflow: auto; border-radius: 12px; background: rgba(var(--v-theme-on-surface), .07); font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word; }
.version-list,.run-list { display: grid; gap: 12px; }
.run-console { margin-bottom: 18px; padding: 18px; border: 1px solid rgb(var(--v-theme-surface-variant)); border-radius: 16px; background: rgba(var(--v-theme-primary), .05); }
.run-console-heading { margin-bottom: 14px; }
.run-console-heading h3 { margin: 0; }
.run-metadata { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; }
.run-metadata div { padding: 10px; border-radius: 10px; background: rgba(var(--v-theme-on-surface), .05); }
.run-metadata dt { color: rgb(var(--v-theme-on-surface-variant)); font-size: 11px; font-weight: 750; text-transform: uppercase; }
.run-metadata dd { margin: 4px 0 0; overflow-wrap: anywhere; }
@media (max-width: 900px) {
    .skill-hero,.editor-heading,.run-console-heading,.package-heading { align-items: stretch; flex-direction: column; }
    .skill-workbench { grid-template-columns: 1fr; }
    .skill-list-panel { max-height: 360px; overflow: auto; border-block-end: 1px solid rgb(var(--v-theme-surface-variant)); border-inline-end: 0; }
    .editor-grid,.schema-grid,.preview-columns,.run-metadata,.package-layout { grid-template-columns: 1fr; }
    .package-layout nav { border-block-end: 1px solid rgb(var(--v-theme-surface-variant)); border-inline-end: 0; }
}
@media (max-width: 520px) {
    .skill-page { padding: 8px 0 28px; }
    .skill-hero,.skill-workbench { border-radius: 15px; }
    .skill-hero,.skill-editor-panel { padding: 19px 16px; }
    .hero-actions,.editor-actions,.run-actions { display: grid; grid-template-columns: 1fr; }
    .hero-actions :deep(.v-btn),.editor-actions :deep(.v-btn),.run-actions :deep(.v-btn) { width: 100%; }
    .package-name-field :deep(.v-messages) { padding-inline-end: 52px; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
</style>
