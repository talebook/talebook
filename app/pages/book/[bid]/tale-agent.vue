<template>
    <v-container class="tale-agent-page py-8">
        <v-row justify="center">
            <v-col
                cols="12"
                lg="10"
                xl="9"
            >
                <header class="page-hero mb-6">
                    <div>
                        <div class="eyebrow">
                            {{ t('taleAgent.eyebrow') }}
                        </div>
                        <h1>{{ t('taleAgent.title') }}</h1>
                        <p>{{ t('taleAgent.subtitle', { book: book.title || t('taleAgent.thisBook') }) }}</p>
                    </div>
                    <v-chip
                        color="deep-orange-darken-2"
                        variant="tonal"
                        prepend-icon="mdi-creation-outline"
                    >
                        {{ t('taleAgent.aiDerived') }}
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
                    <v-card-title>{{ t('taleAgent.myAgents') }}</v-card-title>
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
                            <span><strong>{{ item.display_name }}</strong><small>{{ t('taleAgent.thinkingAgent') }}</small></span>
                        </button>
                        <button
                            class="agent-tile create-tile"
                            type="button"
                            @click="showCreator = true; activeAgent = null; conversation = null"
                        >
                            <v-icon>mdi-plus</v-icon><span>{{ t('taleAgent.createAnother') }}</span>
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
                        <div><div>{{ t('taleAgent.createTitle') }}</div><small>{{ t('taleAgent.createHint') }}</small></div>
                    </v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12">
                                <v-radio-group
                                    v-model="targetMode"
                                    inline
                                    class="target-mode-group"
                                    :label="t('taleAgent.targetModeLabel')"
                                >
                                    <v-radio
                                        :label="t('taleAgent.recommendTarget')"
                                        value="recommend"
                                    />
                                    <v-radio
                                        :label="t('taleAgent.customTarget')"
                                        value="custom"
                                    />
                                </v-radio-group>
                                <v-text-field
                                    v-if="targetMode === 'custom'"
                                    v-model="characterName"
                                    :label="t('taleAgent.nameLabel')"
                                    :hint="t('taleAgent.nameHint')"
                                    :error-messages="customNameError"
                                    persistent-hint
                                    maxlength="200"
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
                            {{ t('taleAgent.sourceScope') }}
                        </v-alert>
                        <div class="d-flex flex-wrap ga-3">
                            <v-btn
                                color="deep-orange-darken-2"
                                :loading="previewBusy"
                                prepend-icon="mdi-eye-outline"
                                @click="startPreview()"
                            >
                                {{ t('taleAgent.generatePreview') }}
                            </v-btn>
                            <v-btn
                                v-if="previewBusy"
                                variant="text"
                                prepend-icon="mdi-stop-circle-outline"
                                @click="cancelPreview"
                            >
                                {{ t('taleAgent.stop') }}
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>

                <v-card
                    v-if="preview && preview.status === 'succeeded'"
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
                            {{ t('taleAgent.previewOnly') }}
                        </v-chip>
                    </v-card-title>
                    <v-card-text>
                        <ManifestPreview :manifest="preview.manifest" /><v-alert
                            type="warning"
                            variant="tonal"
                            class="mt-5"
                        >
                            {{ t('taleAgent.disclosure') }}
                        </v-alert>
                    </v-card-text>
                    <v-card-actions class="px-6 pb-6">
                        <v-btn
                            color="deep-orange-darken-2"
                            prepend-icon="mdi-check-circle-outline"
                            @click="confirmCreate"
                        >
                            {{ t('taleAgent.confirmCreate') }}
                        </v-btn>
                        <v-btn
                            variant="text"
                            @click="startPreview(true)"
                        >
                            {{ t('taleAgent.regenerate') }}
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
                                        {{ t('taleAgent.aiCompanion') }}
                                    </div><h2>{{ activeAgent.display_name }}</h2><p>{{ activeAgent.manifest.introduction }}</p>
                                </div>
                            </div>
                            <div class="d-flex flex-wrap ga-2">
                                <v-btn
                                    size="small"
                                    variant="text"
                                    color="error"
                                    icon="mdi-delete-outline"
                                    :aria-label="t('taleAgent.deleteAgent')"
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
                            {{ t('taleAgent.startConversation') }}
                        </h2>
                        <p>{{ t('taleAgent.startConversationHint') }}</p>
                        <v-btn
                            color="deep-orange-darken-2"
                            class="mt-3"
                            @click="newConversation"
                        >
                            {{ t('taleAgent.newConversation') }}
                        </v-btn>
                    </v-card>

                    <v-card
                        v-else
                        class="chat-shell"
                        rounded="xl"
                    >
                        <div
                            ref="messagesContainer"
                            class="messages"
                            aria-live="polite"
                        >
                            <div
                                v-if="!conversation.messages.length"
                                class="chat-empty"
                            >
                                {{ t('taleAgent.promptIdea') }}
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
                                                {{ t('taleAgent.stop') }}
                                            </v-btn>
                                        </div>
                                        <template v-else-if="message.status === 'succeeded'">
                                            <p class="answer-text">
                                                {{ message.assistant_content }}
                                            </p>
                                            <div class="feedback-row">
                                                <span>{{ t('taleAgent.feedbackPrompt') }}</span>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    :active="message.feedback === 'not_like'"
                                                    :aria-pressed="message.feedback === 'not_like'"
                                                    @click="sendFeedback(message, 'not_like')"
                                                >
                                                    {{ t('taleAgent.notLike') }}
                                                </v-btn>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    :active="message.feedback === 'not_useful'"
                                                    :aria-pressed="message.feedback === 'not_useful'"
                                                    @click="sendFeedback(message, 'not_useful')"
                                                >
                                                    {{ t('taleAgent.notUseful') }}
                                                </v-btn>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    :active="message.feedback === 'too_vague'"
                                                    :aria-pressed="message.feedback === 'too_vague'"
                                                    @click="sendFeedback(message, 'too_vague')"
                                                >
                                                    {{ t('taleAgent.tooVague') }}
                                                </v-btn>
                                            </div>
                                        </template>
                                        <div
                                            v-else
                                            class="message-error"
                                        >
                                            {{ message.error?.message || t('taleAgent.generationFailed') }}
                                            <v-btn
                                                size="x-small"
                                                variant="text"
                                                @click="retryMessage(message)"
                                            >
                                                {{ t('taleAgent.retry') }}
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
                                :label="t('taleAgent.messageLabel')"
                                :placeholder="t('taleAgent.messagePlaceholder')"
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
                                :aria-label="t('taleAgent.send')"
                                :loading="sendingMessage"
                                :disabled="!draft.trim() || hasPendingMessage || sendingMessage"
                            />
                        </form>
                        <div class="composer-note">
                            {{ t('taleAgent.composerNote') }}
                        </div>
                    </v-card>
                </template>
            </v-col>
        </v-row>

        <v-dialog
            v-model="deleteDialog"
            max-width="480"
        >
            <v-card rounded="xl">
                <v-card-title>{{ t('taleAgent.deleteAgent') }}</v-card-title><v-card-text>{{ t('taleAgent.deleteWarning') }}</v-card-text><v-card-actions>
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
const agents = ref<any[]>([]);
const activeAgent = ref<any>(null);
const conversation = ref<any>(null);
const loading = ref(true);
const errorMessage = ref('');
const showCreator = ref(true);
const targetMode = ref<'recommend' | 'custom'>('recommend');
const characterName = ref('');
const customNameError = ref('');
const preview = ref<any>(null);
const previewBusy = computed(() => ['queued', 'running'].includes(preview.value?.status));
const deleteDialog = ref(false);
const draft = ref('');
const sendingMessage = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);
let disposed = false;

const hasPendingMessage = computed(() => conversation.value?.messages?.some((item: any) => ['queued', 'running'].includes(item.status)));
const jsonOptions = (method: string, body: any) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

watch([targetMode, characterName], () => { customNameError.value = ''; });

async function loadPage() {
    loading.value = true;
    try {
        const [bookResponse, agentResponse] = await Promise.all([
            $backend(`/book/${bookId}`),
            $backend(`/ai/tale-agent/agents?book_id=${bookId}`),
        ]);
        if (bookResponse.err !== 'ok') throw new Error(bookResponse.msg);
        book.value = bookResponse.book;
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
        const response = await $backend(`/ai/tale-agent/previews/${id}`);
        if (response.err !== 'ok') throw new Error(response.msg);
        preview.value = response.preview;
        if (['succeeded', 'failed', 'cancelled'].includes(preview.value.status)) return;
        await wait(500);
    }
    if (!disposed && previewBusy.value) throw new Error(t('taleAgent.previewTimeout'));
}

async function startPreview(regenerate = false) {
    errorMessage.value = '';
    preview.value = null;
    const name = targetMode.value === 'custom' ? characterName.value.trim() : '';
    if (targetMode.value === 'custom' && !name) {
        customNameError.value = t('taleAgent.nameRequired');
        return;
    }
    try {
        const response = await $backend('/ai/tale-agent/previews', jsonOptions('POST', { book_id: bookId, name, regenerate }));
        if (response.err !== 'ok') throw new Error(response.msg);
        preview.value = response.preview;
        await pollPreview(response.preview.id);
        if (preview.value.status === 'failed') throw new Error(preview.value.error?.message || t('taleAgent.generationFailed'));
    } catch (error: any) {
        errorMessage.value = error.message || String(error);
    }
}

async function cancelPreview() {
    if (!preview.value?.id) return;
    await $backend(`/ai/tale-agent/previews/${preview.value.id}/cancel`, { method: 'POST' });
}

async function confirmCreate() {
    const response = await $backend('/ai/tale-agent/agents', jsonOptions('POST', { preview_id: preview.value.id }));
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
    const response = await $backend(`/ai/tale-agent/agents/${activeAgent.value.id}/conversations`, { method: 'POST' });
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
        for await (const event of $backend_stream(`/ai/tale-agent/messages/${message.id}/stream`)) {
            if (event.type === 'message') upsertMessage(event.message);
        }
    } catch (error: any) {
        errorMessage.value = error.message || String(error);
        const response = await $backend(`/ai/tale-agent/conversations/${conversation.value.id}`);
        if (response.err === 'ok') conversation.value = response.conversation;
    }
}

async function sendMessage() {
    const content = draft.value.trim();
    if (!content || sendingMessage.value) return;
    sendingMessage.value = true;
    try {
        const response = await $backend(`/ai/tale-agent/conversations/${conversation.value.id}/messages`, jsonOptions('POST', { content }));
        if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
        if (draft.value.trim() === content) draft.value = '';
        upsertMessage(response.message);
        await streamMessage(response.message);
    } catch (error: any) {
        errorMessage.value = error.message || String(error);
    } finally {
        sendingMessage.value = false;
    }
}

async function stopMessage(message: any) {
    const response = await $backend(`/ai/tale-agent/messages/${message.id}/cancel`, { method: 'POST' });
    if (response.err === 'ok') upsertMessage(response.message);
}

async function retryMessage(message: any) {
    const response = await $backend(`/ai/tale-agent/messages/${message.id}/retry`, { method: 'POST' });
    if (response.err !== 'ok') { errorMessage.value = response.msg; return; }
    upsertMessage(response.message);
    await streamMessage(response.message);
}

async function sendFeedback(message: any, feedback: string) {
    const next = message.feedback === feedback ? '' : feedback;
    const response = await $backend(`/ai/tale-agent/messages/${message.id}/feedback`, jsonOptions('PATCH', { feedback: next }));
    if (response.err === 'ok') upsertMessage(response.message);
}

async function deleteAgent() {
    const response = await $backend(`/ai/tale-agent/agents/${activeAgent.value.id}`, { method: 'DELETE' });
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
.tale-agent-page { --agent-accent: #9a4d38; --agent-accent-fill: #9a4d38; --agent-paper: rgb(var(--v-theme-surface)); }
:global(.v-theme--dark) .tale-agent-page { --agent-accent: #e7a38e; }
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
.chat-shell { overflow:hidden; }
.messages { min-height:360px; max-height:62vh; padding:24px; overflow-y:auto; background:linear-gradient(180deg,rgba(var(--v-theme-surface),1),rgba(var(--v-theme-background),.7)); }
.chat-empty { padding:80px 20px; color:rgba(var(--v-theme-on-surface),.68); text-align:center; }
.message-turn + .message-turn { margin-top:26px; }.bubble { width:fit-content; max-width:min(78%,720px); padding:12px 15px; border-radius:16px; white-space:pre-wrap; }.user-bubble { margin-left:auto; color:#fff; border-bottom-right-radius:5px; background:var(--agent-accent-fill); }
.assistant-row { display:flex; align-items:flex-start; gap:11px; margin-top:12px; }.mini-avatar { width:30px; height:30px; border-radius:9px; font:800 .65rem system-ui,sans-serif; }.assistant-content { max-width:min(86%,760px); }.answer-text { margin:0; white-space:pre-wrap; }
.generating,.message-error { display:flex; align-items:center; gap:9px; color:rgba(var(--v-theme-on-surface),.65); }.message-error { color:rgb(var(--v-theme-error)); }
.feedback-row { display:flex; flex-wrap:wrap; align-items:center; gap:3px; margin-top:10px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; }
.composer { display:flex; align-items:flex-end; gap:12px; padding:16px 18px 8px; border-top:1px solid rgba(var(--v-border-color),.12); }.composer-note { padding:0 20px 14px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; }
@media (max-width:700px) { .page-hero,.agent-console__header { flex-direction:column; }.page-hero { padding:22px; }.agent-identity { align-items:flex-start; }.messages { padding:18px 14px; }.bubble { max-width:90%; }.assistant-content { max-width:calc(100% - 42px); }.composer { align-items:center; } }
@media (max-width:420px) { .target-mode-group :deep(.v-selection-control-group) { align-items:flex-start; flex-direction:column; } }
</style>
