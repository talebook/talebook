<template>
    <v-container class="protagonist-page py-8">
        <v-row justify="center">
            <v-col
                cols="12"
                lg="10"
                xl="9"
            >
                <header class="page-hero mb-6">
                    <div>
                        <div class="eyebrow">
                            {{ t('protagonist.eyebrow') }}
                        </div>
                        <h1>{{ t('protagonist.title') }}</h1>
                        <p>{{ t('protagonist.subtitle', { book: book.title || t('protagonist.thisBook') }) }}</p>
                    </div>
                    <v-chip
                        color="deep-orange-darken-2"
                        variant="tonal"
                        prepend-icon="mdi-creation-outline"
                    >
                        {{ t('protagonist.aiDerived') }}
                    </v-chip>
                </header>

                <v-alert
                    v-if="errorMessage"
                    type="error"
                    variant="tonal"
                    closable
                    class="mb-5"
                    @click:close="errorMessage = ''"
                >
                    {{ errorMessage }}
                </v-alert>
                <v-progress-linear
                    v-if="loading"
                    indeterminate
                    color="deep-orange-darken-2"
                    class="mb-5"
                />

                <v-card
                    v-if="agents.length"
                    class="mb-6"
                    rounded="xl"
                    variant="outlined"
                >
                    <v-card-title>{{ t('protagonist.myAgents') }}</v-card-title>
                    <v-card-text class="agent-grid">
                        <button
                            v-for="item in agents"
                            :key="item.id"
                            class="agent-tile"
                            :class="{ active: activeAgent?.id === item.id }"
                            :aria-pressed="activeAgent?.id === item.id"
                            type="button"
                            @click="openAgent(item)"
                        >
                            <span class="agent-avatar">{{ item.display_name.slice(0, 1) }}</span>
                            <span><strong>{{ item.display_name }}</strong><small>{{ cutoffLabel(item.cutoff) }}</small></span>
                        </button>
                        <button
                            class="agent-tile create-tile"
                            type="button"
                            @click="showCreator = true; activeAgent = null; conversation = null"
                        >
                            <v-icon>mdi-plus</v-icon><span>{{ t('protagonist.createAnother') }}</span>
                        </button>
                    </v-card-text>
                </v-card>

                <v-card
                    v-if="showCreator && !activeAgent"
                    class="creation-card mb-6"
                    rounded="xl"
                >
                    <v-card-title class="d-flex align-center ga-3">
                        <v-avatar color="deep-orange-lighten-5">
                            <v-icon color="deep-orange-darken-2">
                                mdi-account-star-outline
                            </v-icon>
                        </v-avatar>
                        <div><div>{{ t('protagonist.createTitle') }}</div><small>{{ t('protagonist.createHint') }}</small></div>
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col
                                cols="12"
                                md="5"
                            >
                                <v-text-field
                                    v-model="characterName"
                                    :label="t('protagonist.nameLabel')"
                                    :hint="t('protagonist.nameHint')"
                                    persistent-hint
                                    maxlength="200"
                                    variant="outlined"
                                />
                            </v-col>
                            <v-col
                                cols="12"
                                md="7"
                            >
                                <v-select
                                    v-model="selectedCutoff"
                                    :items="chapters"
                                    item-title="title"
                                    item-value="href"
                                    :label="t('protagonist.cutoffLabel')"
                                    :hint="t('protagonist.cutoffHint')"
                                    persistent-hint
                                    variant="outlined"
                                />
                            </v-col>
                        </v-row>
                        <v-alert
                            type="info"
                            variant="tonal"
                            density="compact"
                            class="mb-4"
                        >
                            {{ t('protagonist.sourceBoundary') }}
                        </v-alert>
                        <div class="d-flex flex-wrap ga-3">
                            <v-btn
                                color="deep-orange-darken-2"
                                :loading="previewBusy"
                                prepend-icon="mdi-eye-outline"
                                @click="startPreview('create')"
                            >
                                {{ t('protagonist.generatePreview') }}
                            </v-btn>
                            <v-btn
                                v-if="previewBusy"
                                variant="text"
                                prepend-icon="mdi-stop-circle-outline"
                                @click="cancelPreview"
                            >
                                {{ t('protagonist.stop') }}
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <v-card
                    v-if="preview && preview.status === 'succeeded' && previewPurpose === 'create'"
                    class="manifest-card mb-6"
                    rounded="xl"
                >
                    <v-card-title class="d-flex justify-space-between align-center flex-wrap ga-2">
                        <span>{{ preview.manifest.display_name }}</span>
                        <v-chip
                            size="small"
                            color="deep-orange-darken-2"
                            variant="tonal"
                        >
                            {{ t('protagonist.previewOnly') }}
                        </v-chip>
                    </v-card-title>
                    <v-card-text>
                        <ManifestPreview :manifest="preview.manifest" /><v-alert
                            type="warning"
                            variant="tonal"
                            class="mt-5"
                        >
                            {{ t('protagonist.disclosure') }}
                        </v-alert>
                    </v-card-text>
                    <v-card-actions class="px-6 pb-6">
                        <v-btn
                            color="deep-orange-darken-2"
                            prepend-icon="mdi-check-circle-outline"
                            @click="confirmCreate"
                        >
                            {{ t('protagonist.confirmCreate') }}
                        </v-btn>
                        <v-btn
                            variant="text"
                            @click="startPreview('create', true)"
                        >
                            {{ t('protagonist.regenerate') }}
                        </v-btn>
                    </v-card-actions>
                </v-card>

                <template v-if="activeAgent">
                    <v-card
                        class="agent-console mb-6"
                        rounded="xl"
                    >
                        <v-card-text class="agent-console__header">
                            <div class="agent-identity">
                                <span class="agent-avatar large">{{ activeAgent.display_name.slice(0, 1) }}</span>
                                <div>
                                    <div class="eyebrow">
                                        {{ t('protagonist.aiCompanion') }}
                                    </div><h2>{{ activeAgent.display_name }}</h2><p>{{ activeAgent.manifest.introduction }}</p>
                                </div>
                            </div>
                            <div class="d-flex flex-wrap ga-2">
                                <v-chip
                                    prepend-icon="mdi-book-lock-outline"
                                    color="teal-darken-1"
                                    variant="tonal"
                                >
                                    {{ cutoffLabel(activeAgent.cutoff) }}
                                </v-chip>
                                <v-btn
                                    size="small"
                                    variant="outlined"
                                    prepend-icon="mdi-tune-variant"
                                    @click="openBoundaryDialog"
                                >
                                    {{ t('protagonist.adjustBoundary') }}
                                </v-btn>
                                <v-btn
                                    size="small"
                                    variant="text"
                                    color="error"
                                    icon="mdi-delete-outline"
                                    :aria-label="t('protagonist.deleteAgent')"
                                    @click="deleteDialog = true"
                                />
                            </div>
                        </v-card-text>
                    </v-card>

                    <v-card
                        v-if="!conversation"
                        class="empty-chat text-center pa-8"
                        rounded="xl"
                        variant="outlined"
                    >
                        <v-icon
                            size="54"
                            color="deep-orange-darken-2"
                        >
                            mdi-message-text-outline
                        </v-icon>
                        <h2 class="mt-3">
                            {{ t('protagonist.startConversation') }}
                        </h2>
                        <p>{{ t('protagonist.startConversationHint') }}</p>
                        <v-btn
                            color="deep-orange-darken-2"
                            class="mt-3"
                            @click="newConversation"
                        >
                            {{ t('protagonist.newConversation') }}
                        </v-btn>
                    </v-card>

                    <v-card
                        v-else
                        class="chat-shell"
                        rounded="xl"
                    >
                        <div class="chat-boundary">
                            <v-icon size="18">
                                mdi-shield-check-outline
                            </v-icon>{{ t('protagonist.chatBoundary', { cutoff: cutoffLabel(conversation.cutoff) }) }}
                        </div>
                        <div
                            ref="messagesContainer"
                            class="messages"
                            aria-live="polite"
                        >
                            <div
                                v-if="!conversation.messages.length"
                                class="chat-empty"
                            >
                                {{ t('protagonist.promptIdea') }}
                            </div>
                            <article
                                v-for="message in conversation.messages"
                                :key="message.id"
                                class="message-turn"
                            >
                                <div class="bubble user-bubble">
                                    {{ message.user_content }}
                                </div>
                                <div class="assistant-row">
                                    <span class="mini-avatar">AI</span>
                                    <div class="assistant-content">
                                        <div
                                            v-if="['queued', 'running'].includes(message.status)"
                                            class="generating"
                                        >
                                            <v-progress-circular
                                                indeterminate
                                                size="18"
                                                width="2"
                                            /> {{ message.progress_message }}
                                            <v-btn
                                                size="x-small"
                                                variant="text"
                                                @click="stopMessage(message)"
                                            >
                                                {{ t('protagonist.stop') }}
                                            </v-btn>
                                        </div>
                                        <template v-else-if="message.status === 'succeeded'">
                                            <v-chip
                                                v-if="message.boundary_action !== 'answer'"
                                                size="x-small"
                                                class="mb-2"
                                                color="amber-darken-2"
                                                variant="tonal"
                                            >
                                                {{ t(`protagonist.action_${message.boundary_action}`) }}
                                            </v-chip>
                                            <p class="answer-text">
                                                {{ message.assistant_content }}
                                            </p>
                                            <blockquote
                                                v-for="citation in message.citations"
                                                :key="citation.href + citation.quote"
                                                class="citation"
                                            >
                                                <span>{{ citation.quote }}</span><cite>{{ citation.href }}</cite>
                                            </blockquote>
                                            <div class="feedback-row">
                                                <span>{{ t('protagonist.feedbackPrompt') }}</span>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    :active="message.feedback === 'not_like'"
                                                    :aria-pressed="message.feedback === 'not_like'"
                                                    @click="sendFeedback(message, 'not_like')"
                                                >
                                                    {{ t('protagonist.notLike') }}
                                                </v-btn>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    :active="message.feedback === 'spoiler'"
                                                    :aria-pressed="message.feedback === 'spoiler'"
                                                    @click="sendFeedback(message, 'spoiler')"
                                                >
                                                    {{ t('protagonist.tooSpoiler') }}
                                                </v-btn>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    :active="message.feedback === 'too_much_quote'"
                                                    :aria-pressed="message.feedback === 'too_much_quote'"
                                                    @click="sendFeedback(message, 'too_much_quote')"
                                                >
                                                    {{ t('protagonist.tooMuchQuote') }}
                                                </v-btn>
                                            </div>
                                        </template>
                                        <div
                                            v-else
                                            class="message-error"
                                        >
                                            {{ message.error?.message || t('protagonist.generationFailed') }}
                                            <v-btn
                                                size="x-small"
                                                variant="text"
                                                @click="retryMessage(message)"
                                            >
                                                {{ t('protagonist.retry') }}
                                            </v-btn>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </div>
                        <form
                            class="composer"
                            @submit.prevent="sendMessage"
                        >
                            <v-textarea
                                v-model="draft"
                                :label="t('protagonist.messageLabel')"
                                :placeholder="t('protagonist.messagePlaceholder')"
                                rows="2"
                                auto-grow
                                maxlength="2000"
                                variant="solo-filled"
                                hide-details
                            />
                            <v-btn
                                type="submit"
                                color="deep-orange-darken-2"
                                icon="mdi-send"
                                :aria-label="t('protagonist.send')"
                                :disabled="!draft.trim() || hasPendingMessage"
                            />
                        </form>
                        <div class="composer-note">
                            {{ t('protagonist.composerNote') }}
                        </div>
                    </v-card>
                </template>
            </v-col>
        </v-row>

        <v-dialog
            v-model="boundaryDialog"
            max-width="720"
        >
            <v-card rounded="xl">
                <v-card-title>{{ t('protagonist.adjustBoundary') }}</v-card-title>
                <v-card-text>
                    <v-select
                        v-model="boundaryCutoff"
                        :items="chapters"
                        item-title="title"
                        item-value="href"
                        :label="t('protagonist.newCutoff')"
                        variant="outlined"
                    />
                    <v-alert
                        type="warning"
                        variant="tonal"
                        class="mb-4"
                    >
                        {{ t('protagonist.boundaryPreviewHint') }}
                    </v-alert>
                    <v-btn
                        color="deep-orange-darken-2"
                        :loading="previewBusy"
                        @click="startPreview('boundary')"
                    >
                        {{ t('protagonist.previewBoundary') }}
                    </v-btn>
                    <v-btn
                        v-if="previewBusy"
                        variant="text"
                        prepend-icon="mdi-stop-circle-outline"
                        @click="cancelPreview"
                    >
                        {{ t('protagonist.stop') }}
                    </v-btn>
                    <div
                        v-if="preview?.status === 'succeeded' && previewPurpose === 'boundary'"
                        class="mt-5"
                    >
                        <ManifestPreview :manifest="preview.manifest" />
                        <v-checkbox
                            v-if="isBoundaryRaise"
                            v-model="spoilerConfirmed"
                            color="deep-orange-darken-2"
                            :label="t('protagonist.spoilerConfirm')"
                        />
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        variant="text"
                        @click="boundaryDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn>
                    <v-btn
                        v-if="preview?.status === 'succeeded' && previewPurpose === 'boundary'"
                        color="deep-orange-darken-2"
                        :disabled="isBoundaryRaise && !spoilerConfirmed"
                        @click="confirmBoundary"
                    >
                        {{ t('protagonist.applyBoundary') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog
            v-model="deleteDialog"
            max-width="480"
        >
            <v-card rounded="xl">
                <v-card-title>{{ t('protagonist.deleteAgent') }}</v-card-title><v-card-text>{{ t('protagonist.deleteWarning') }}</v-card-text><v-card-actions>
                    <v-spacer /><v-btn
                        variant="text"
                        @click="deleteDialog = false"
                    >
                        {{ t('common.cancel') }}
                    </v-btn><v-btn
                        color="error"
                        @click="deleteAgent"
                    >
                        {{ t('common.delete') }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script setup lang="ts">
import ManifestPreview from '@/components/ManifestPreview.vue';
import { useMainStore } from '@/stores/main';

const route = useRoute();
const { t } = useI18n();
const { $backend, $backend_stream } = useNuxtApp();
const store = useMainStore();
store.setNavbar(true);

const bookId = Number(route.params.bid);
const book = ref<any>({});
const chapters = ref<any[]>([]);
const agents = ref<any[]>([]);
const activeAgent = ref<any>(null);
const conversation = ref<any>(null);
const loading = ref(true);
const errorMessage = ref('');
const showCreator = ref(true);
const characterName = ref('');
const selectedCutoff = ref('');
const boundaryCutoff = ref('');
const preview = ref<any>(null);
const previewPurpose = ref<'create' | 'boundary'>('create');
const previewBusy = computed(() => ['queued', 'running'].includes(preview.value?.status));
const boundaryDialog = ref(false);
const spoilerConfirmed = ref(false);
const deleteDialog = ref(false);
const draft = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
let disposed = false;

const cutoffLabel = (cutoff: any) => t('protagonist.knownThrough', { chapter: cutoff?.title || cutoff?.href || '—' });
const selectedBoundaryChapter = computed(() => chapters.value.find(item => item.href === boundaryCutoff.value));
const isBoundaryRaise = computed(() => (selectedBoundaryChapter.value?.index ?? 0) > (activeAgent.value?.cutoff?.index ?? 0));
const hasPendingMessage = computed(() => conversation.value?.messages?.some((item: any) => ['queued', 'running'].includes(item.status)));
const jsonOptions = (method: string, body: any) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function loadPage() {
    loading.value = true;
    try {
        const [bookResponse, spineResponse, agentResponse] = await Promise.all([
            $backend(`/book/${bookId}`),
            $backend(`/ai/protagonist/spine?book_id=${bookId}`),
            $backend(`/ai/protagonist/agents?book_id=${bookId}`),
        ]);
        if (bookResponse.err !== 'ok') throw new Error(bookResponse.msg);
        if (spineResponse.err !== 'ok') throw new Error(spineResponse.msg);
        book.value = bookResponse.book;
        chapters.value = spineResponse.chapters;
        selectedCutoff.value = spineResponse.default_cutoff?.href || chapters.value[0]?.href || '';
        boundaryCutoff.value = selectedCutoff.value;
        agents.value = agentResponse.agents || [];
        if (agents.value.length) openAgent(agents.value[0]);
    } catch (error: any) {
        errorMessage.value = error.message || String(error);
    } finally {
        loading.value = false;
    }
}

async function pollPreview(id: string) {
    for (let attempt = 0; attempt < 240 && !disposed; attempt += 1) {
        const response = await $backend(`/ai/protagonist/previews/${id}`);
        if (response.err !== 'ok') throw new Error(response.msg);
        preview.value = response.preview;
        if (['succeeded', 'failed', 'cancelled'].includes(preview.value.status)) return;
        await wait(500);
    }
    if (!disposed && previewBusy.value) throw new Error(t('protagonist.previewTimeout'));
}

async function startPreview(purpose: 'create' | 'boundary', regenerate = false) {
    errorMessage.value = '';
    previewPurpose.value = purpose;
    preview.value = null;
    const cutoff = purpose === 'boundary' ? boundaryCutoff.value : selectedCutoff.value;
    const name = purpose === 'boundary' ? activeAgent.value.display_name : characterName.value;
    try {
        const response = await $backend('/ai/protagonist/previews', jsonOptions('POST', { book_id: bookId, name, cutoff_href: cutoff, regenerate }));
        if (response.err !== 'ok') throw new Error(response.msg);
        preview.value = response.preview;
        await pollPreview(response.preview.id);
        if (preview.value.status === 'failed') throw new Error(preview.value.error?.message || t('protagonist.generationFailed'));
    } catch (error: any) {
        errorMessage.value = error.message || String(error);
    }
}

async function cancelPreview() {
    if (!preview.value?.id) return;
    await $backend(`/ai/protagonist/previews/${preview.value.id}/cancel`, { method: 'POST' });
}

async function confirmCreate() {
    const response = await $backend('/ai/protagonist/agents', jsonOptions('POST', { preview_id: preview.value.id }));
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    agents.value.unshift(response.agent);
    openAgent(response.agent);
    preview.value = null;
}

function openAgent(agent: any) {
    activeAgent.value = agent;
    conversation.value = null;
    showCreator.value = false;
    preview.value = null;
}

async function newConversation() {
    const response = await $backend(`/ai/protagonist/agents/${activeAgent.value.id}/conversations`, { method: 'POST' });
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    conversation.value = response.conversation;
}

function upsertMessage(message: any) {
    const container = messagesContainer.value;
    const shouldStickToLatest = !container || container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    const index = conversation.value.messages.findIndex((item: any) => item.id === message.id);
    if (index >= 0) conversation.value.messages[index] = message;
    else conversation.value.messages.push(message);
    if (shouldStickToLatest) {
        void nextTick(() => {
            if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        });
    }
}

async function streamMessage(message: any) {
    try {
        for await (const event of $backend_stream(`/ai/protagonist/messages/${message.id}/stream`)) {
            if (event.type === 'message') upsertMessage(event.message);
        }
    } catch (error: any) {
        errorMessage.value = error.message || String(error);
        const response = await $backend(`/ai/protagonist/conversations/${conversation.value.id}`);
        if (response.err === 'ok') conversation.value = response.conversation;
    }
}

async function sendMessage() {
    const content = draft.value.trim();
    if (!content) return;
    draft.value = '';
    const response = await $backend(`/ai/protagonist/conversations/${conversation.value.id}/messages`, jsonOptions('POST', { content }));
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    upsertMessage(response.message);
    await streamMessage(response.message);
}

async function stopMessage(message: any) {
    const response = await $backend(`/ai/protagonist/messages/${message.id}/cancel`, { method: 'POST' });
    if (response.err === 'ok') upsertMessage(response.message);
}

async function retryMessage(message: any) {
    const response = await $backend(`/ai/protagonist/messages/${message.id}/retry`, { method: 'POST' });
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    upsertMessage(response.message);
    await streamMessage(response.message);
}

async function sendFeedback(message: any, feedback: string) {
    const next = message.feedback === feedback ? '' : feedback;
    const response = await $backend(`/ai/protagonist/messages/${message.id}/feedback`, jsonOptions('PATCH', { feedback: next }));
    if (response.err === 'ok') upsertMessage(response.message);
}

function openBoundaryDialog() {
    boundaryCutoff.value = activeAgent.value.cutoff.href;
    preview.value = null;
    spoilerConfirmed.value = false;
    boundaryDialog.value = true;
}

async function confirmBoundary() {
    const response = await $backend(`/ai/protagonist/agents/${activeAgent.value.id}`, jsonOptions('PATCH', {
        preview_id: preview.value.id,
        spoiler_confirmed: spoilerConfirmed.value,
    }));
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    activeAgent.value = response.agent;
    const index = agents.value.findIndex(item => item.id === response.agent.id);
    agents.value[index] = response.agent;
    conversation.value = null;
    boundaryDialog.value = false;
    preview.value = null;
}

async function deleteAgent() {
    const response = await $backend(`/ai/protagonist/agents/${activeAgent.value.id}`, { method: 'DELETE' });
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    agents.value = agents.value.filter(item => item.id !== activeAgent.value.id);
    activeAgent.value = null;
    conversation.value = null;
    showCreator.value = true;
    deleteDialog.value = false;
}

onMounted(loadPage);
onBeforeUnmount(() => { disposed = true; });
</script>

<style scoped>
.protagonist-page { --agent-accent: #9a4d38; --agent-paper: rgb(var(--v-theme-surface)); }
.page-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:30px; border:1px solid rgba(var(--v-border-color),.18); border-radius:24px; background:linear-gradient(135deg,rgba(154,77,56,.11),rgba(232,168,83,.07)); }
.page-hero h1,.agent-console h2,.empty-chat h2 { margin:2px 0 6px; font-family:Georgia,"Noto Serif SC",serif; line-height:1.2; }
.page-hero p,.agent-console p,.empty-chat p { margin:0; color:rgba(var(--v-theme-on-surface),.68); }
.eyebrow { color:var(--agent-accent); font-size:.72rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
.agent-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:12px; }
.agent-tile { display:flex; min-height:76px; align-items:center; gap:12px; padding:12px; color:inherit; border:1px solid rgba(var(--v-border-color),.18); border-radius:16px; background:transparent; text-align:left; cursor:pointer; }
.agent-tile:hover,.agent-tile.active { border-color:var(--agent-accent); background:rgba(154,77,56,.07); }
.agent-tile:focus-visible { outline:3px solid rgb(var(--v-theme-primary)); outline-offset:2px; }
.agent-tile span:last-child { min-width:0; } .agent-tile strong,.agent-tile small { display:block; } .agent-tile small { margin-top:3px; overflow:hidden; color:rgba(var(--v-theme-on-surface),.62); text-overflow:ellipsis; white-space:nowrap; }
.create-tile { justify-content:center; color:var(--agent-accent); border-style:dashed; }
.agent-avatar,.mini-avatar { display:grid; flex:0 0 auto; place-items:center; width:44px; height:44px; color:#fff; border-radius:14px; background:linear-gradient(145deg,#b56349,#713326); font:700 1.15rem Georgia,serif; }
.agent-avatar.large { width:62px; height:62px; border-radius:19px; font-size:1.7rem; }
.creation-card,.manifest-card,.agent-console,.chat-shell { border:1px solid rgba(var(--v-border-color),.16); box-shadow:0 18px 52px rgba(50,35,25,.08); }
.creation-card small { color:rgba(var(--v-theme-on-surface),.62); font-size:.76rem; }
.agent-console__header { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; padding:24px; }
.agent-identity { display:flex; min-width:0; gap:16px; }.agent-identity p { max-width:640px; }
.chat-shell { overflow:hidden; }.chat-boundary { display:flex; align-items:center; gap:8px; padding:11px 20px; color:rgba(var(--v-theme-on-surface),.78); background:rgba(var(--v-theme-success),.1); font-size:.78rem; font-weight:700; }
.messages { min-height:360px; max-height:62vh; padding:24px; overflow-y:auto; background:linear-gradient(180deg,rgba(var(--v-theme-surface),1),rgba(var(--v-theme-background),.7)); }
.chat-empty { padding:80px 20px; color:rgba(var(--v-theme-on-surface),.68); text-align:center; }
.message-turn + .message-turn { margin-top:26px; }.bubble { width:fit-content; max-width:min(78%,720px); padding:12px 15px; border-radius:16px; white-space:pre-wrap; }.user-bubble { margin-left:auto; color:#fff; border-bottom-right-radius:5px; background:var(--agent-accent); }
.assistant-row { display:flex; align-items:flex-start; gap:11px; margin-top:12px; }.mini-avatar { width:30px; height:30px; border-radius:9px; font:800 .65rem system-ui,sans-serif; }.assistant-content { max-width:min(86%,760px); }.answer-text { margin:0; white-space:pre-wrap; }
.generating,.message-error { display:flex; align-items:center; gap:9px; color:rgba(var(--v-theme-on-surface),.65); }.message-error { color:rgb(var(--v-theme-error)); }
.citation { margin:12px 0 0; padding:10px 13px; border-inline-start:3px solid #d79a49; border-radius:0 10px 10px 0; background:rgba(215,154,73,.1); }.citation span,.citation cite { display:block; }.citation cite { margin-top:5px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; font-style:normal; overflow-wrap:anywhere; }
.feedback-row { display:flex; flex-wrap:wrap; align-items:center; gap:3px; margin-top:10px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; }
.composer { display:flex; align-items:flex-end; gap:12px; padding:16px 18px 8px; border-top:1px solid rgba(var(--v-border-color),.12); }.composer-note { padding:0 20px 14px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; }
@media (max-width:700px) { .page-hero,.agent-console__header { flex-direction:column; }.page-hero { padding:22px; }.agent-identity { align-items:flex-start; }.messages { padding:18px 14px; }.bubble { max-width:90%; }.assistant-content { max-width:calc(100% - 42px); }.composer { align-items:center; } }
</style>
