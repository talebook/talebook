<template>
    <ClientOnly>
        <v-sheet
            v-if="player.book && player.chapter"
            class="audiobook-player"
            color="rgb(var(--v-theme-surface))"
            elevation="18"
            data-testid="audiobook-player"
        >
            <v-progress-linear
                :model-value="progressPercent"
                color="amber-darken-2"
                height="3"
            />
            <div class="player-main">
                <button
                    class="player-identity"
                    type="button"
                    @click="player.expanded = !player.expanded"
                >
                    <v-avatar
                        rounded="lg"
                        size="46"
                        color="blue-grey-darken-4"
                    >
                        <v-img
                            v-if="player.book.img"
                            :src="player.book.img"
                            cover
                        />
                        <v-icon
                            v-else
                            color="amber-lighten-2"
                        >
                            mdi-book-music
                        </v-icon>
                    </v-avatar>
                    <span class="player-copy">
                        <strong>{{ player.book.title }}</strong>
                        <small>{{ player.chapter.title }}</small>
                    </span>
                </button>

                <div class="player-controls">
                    <v-btn
                        :disabled="!player.hasPrevious"
                        icon="mdi-skip-previous"
                        variant="text"
                        size="small"
                        @click="player.previous"
                    />
                    <v-btn
                        :aria-label="player.playing ? t('audiobook.pause') : t('audiobook.play')"
                        :icon="player.playing ? 'mdi-pause' : 'mdi-play'"
                        color="amber-darken-2"
                        variant="flat"
                        size="large"
                        data-testid="player-toggle"
                        @click="player.toggle"
                    />
                    <v-btn
                        :disabled="!player.hasNext"
                        icon="mdi-skip-next"
                        variant="text"
                        size="small"
                        @click="player.next"
                    />
                </div>

                <div class="player-timeline d-none d-md-flex">
                    <span>{{ formatTime(player.positionMs) }}</span>
                    <v-slider
                        :model-value="player.positionMs"
                        :max="Math.max(player.durationMs, 1)"
                        hide-details
                        color="amber-darken-2"
                        @update:model-value="player.seek"
                    />
                    <span>{{ formatTime(player.durationMs) }}</span>
                </div>

                <v-select
                    class="player-rate d-none d-sm-flex"
                    :model-value="player.rate"
                    :items="rates"
                    density="compact"
                    hide-details
                    variant="plain"
                    @update:model-value="player.setRate"
                />
                <v-btn
                    :icon="player.expanded ? 'mdi-chevron-down' : 'mdi-chevron-up'"
                    variant="text"
                    size="small"
                    @click="player.expanded = !player.expanded"
                />
                <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="small"
                    :aria-label="t('common.close')"
                    @click="player.close"
                />
            </div>

            <v-expand-transition>
                <div
                    v-if="player.expanded"
                    class="player-expanded"
                >
                    <div class="mobile-timeline d-md-none">
                        <v-slider
                            :model-value="player.positionMs"
                            :max="Math.max(player.durationMs, 1)"
                            hide-details
                            color="amber-darken-2"
                            @update:model-value="player.seek"
                        />
                    </div>
                    <p class="active-dialogue">
                        <v-icon
                            size="18"
                            color="amber-darken-2"
                        >
                            mdi-format-quote-open
                        </v-icon>
                        {{ player.activeSegment?.text || t('audiobook.waitingForDialogue') }}
                    </p>
                    <div class="expanded-actions">
                        <v-slider
                            class="volume-slider"
                            :model-value="player.volume"
                            :max="1"
                            :step="0.05"
                            prepend-icon="mdi-volume-high"
                            hide-details
                            @update:model-value="player.setVolume"
                        />
                        <v-btn
                            variant="text"
                            size="small"
                            :to="`/audio/${player.edition?.id}`"
                        >
                            {{ t('audiobook.openBook') }}
                        </v-btn>
                    </div>
                </div>
            </v-expand-transition>
        </v-sheet>
    </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAudiobookStore } from '@/stores/audiobook';

const player = useAudiobookStore();
const { t } = useI18n();
const rates = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const progressPercent = computed(() => player.durationMs ? player.positionMs / player.durationMs * 100 : 0);

function formatTime(ms: number) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

onMounted(() => player.restore());
</script>

<style scoped>
.audiobook-player {
    position: fixed;
    z-index: 1200;
    right: 18px;
    bottom: 16px;
    left: 258px;
    overflow: hidden;
    border: 1px solid rgba(var(--v-border-color), .16);
    border-radius: 18px;
    backdrop-filter: blur(18px);
}
.player-main { min-height: 68px; padding: 8px 12px; display: flex; align-items: center; gap: 12px; }
.player-identity { min-width: 220px; max-width: 310px; display: flex; align-items: center; gap: 10px; text-align: left; }
.player-copy { display: grid; min-width: 0; }
.player-copy strong, .player-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-copy small { color: rgb(var(--v-theme-on-surface-variant)); }
.player-controls { display: flex; align-items: center; gap: 2px; }
.player-timeline { flex: 1; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; font-size: .76rem; }
.player-timeline :deep(.v-slider) { flex: 1; }
.player-rate { max-width: 74px; }
.player-expanded { padding: 4px 18px 14px; border-top: 1px solid rgba(var(--v-border-color), .12); }
.active-dialogue { max-width: 880px; margin: 10px auto; text-align: center; font-family: Georgia, 'Noto Serif SC', serif; font-size: 1rem; }
.expanded-actions { display: flex; align-items: center; justify-content: space-between; }
.volume-slider { max-width: 220px; }
@media (max-width: 959px) {
    .audiobook-player { right: 8px; bottom: 8px; left: 8px; }
    .player-identity { min-width: 0; flex: 1; }
}
@media (max-width: 599px) {
    .player-main { gap: 4px; }
    .player-identity { max-width: 145px; }
    .player-copy strong { font-size: .86rem; }
    .player-copy small { font-size: .72rem; }
}
</style>
