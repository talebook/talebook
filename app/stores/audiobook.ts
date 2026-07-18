import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type AudiobookChapter = {
  id: number
  number: number
  title: string
  duration_ms: number
  audio_url: string
  timeline_url: string
}

type AudiobookEdition = {
  id: number
  book_id: number
  chapters: AudiobookChapter[]
}

type TimelineSegment = {
  id: string
  start_ms: number
  end_ms: number
  text: string
  locator?: Record<string, unknown>
}

type PersistedPlayer = {
  book: { id: number; title: string; img?: string }
  editionId: number
  chapterNumber: number
  positionMs: number
  rate: number
  volume: number
}

const STORAGE_KEY = 'talebook:audiobook-player:v1'

export const useAudiobookStore = defineStore('audiobook', () => {
  const book = ref<PersistedPlayer['book'] | null>(null)
  const edition = ref<AudiobookEdition | null>(null)
  const chapter = ref<AudiobookChapter | null>(null)
  const timeline = ref<TimelineSegment[]>([])
  const playing = ref(false)
  const expanded = ref(false)
  const restoring = ref(false)
  const positionMs = ref(0)
  const durationMs = ref(0)
  const rate = ref(1)
  const volume = ref(1)
  const sessionId = ref('')
  const progressVersion = ref(0)
  const error = ref('')
  let audio: HTMLAudioElement | null = null
  let lastReportedMs = 0
  let lastSavedAt = 0

  const chapters = computed(() => edition.value?.chapters || [])
  const chapterIndex = computed(() => chapters.value.findIndex(item => item.id === chapter.value?.id))
  const hasPrevious = computed(() => chapterIndex.value > 0)
  const hasNext = computed(() => chapterIndex.value >= 0 && chapterIndex.value < chapters.value.length - 1)
  const activeSegment = computed(() => timeline.value.find(
    item => positionMs.value >= item.start_ms && positionMs.value < item.end_ms,
  ) || null)

  function persist() {
    if (!import.meta.client || !book.value || !edition.value || !chapter.value) return
    const state: PersistedPlayer = {
      book: book.value,
      editionId: edition.value.id,
      chapterNumber: chapter.value.number,
      positionMs: positionMs.value,
      rate: rate.value,
      volume: volume.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  async function reportProgress(force = false, completed = false) {
    if (!sessionId.value || !chapter.value) return
    const now = Date.now()
    if (!force && now - lastSavedAt < 10_000) return
    const { $backend } = useNuxtApp()
    const delta = Math.max(0, Math.min(60_000, positionMs.value - lastReportedMs))
    const response = await $backend(`/audiobook-sessions/${sessionId.value}`, {
      method: 'PATCH',
      body: JSON.stringify({
        chapter_id: chapter.value.id,
        position_ms: positionMs.value,
        segment_id: activeSegment.value?.id || '',
        listened_delta_ms: delta,
        completed,
        version: progressVersion.value,
      }),
    })
    if (response.err === 'ok') {
      progressVersion.value = response.version
      lastReportedMs = positionMs.value
      lastSavedAt = now
    } else if (response.err === 'progress.conflict') {
      progressVersion.value = response.version
    }
  }

  function ensureAudio() {
    if (!import.meta.client) return null
    if (audio) return audio
    audio = new Audio()
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', () => {
      durationMs.value = Number.isFinite(audio?.duration) ? Math.round((audio?.duration || 0) * 1000) : (chapter.value?.duration_ms || 0)
      if (audio && positionMs.value > 0) audio.currentTime = Math.min(positionMs.value / 1000, audio.duration || Infinity)
    })
    audio.addEventListener('timeupdate', () => {
      if (!audio) return
      positionMs.value = Math.round(audio.currentTime * 1000)
      persist()
      void reportProgress()
    })
    audio.addEventListener('play', () => { playing.value = true })
    audio.addEventListener('pause', () => {
      playing.value = false
      persist()
      void reportProgress(true)
    })
    audio.addEventListener('ended', async () => {
      await reportProgress(true, !hasNext.value)
      if (hasNext.value) await playAt(chapterIndex.value + 1, true)
    })
    audio.addEventListener('error', () => {
      error.value = 'audio.load_failed'
      playing.value = false
    })
    return audio
  }

  async function ensureSession() {
    if (sessionId.value || !edition.value) return
    const { $backend } = useNuxtApp()
    const response = await $backend(`/audiobooks/${edition.value.id}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ source: 'web', device_id: 'talebook-web' }),
    })
    if (response.err === 'ok') sessionId.value = response.session_id
  }

  async function loadTimeline(target: AudiobookChapter) {
    const { $backend } = useNuxtApp()
    const response = await $backend(`/audiobooks/${edition.value?.id}/chapters/${target.number}/timeline`)
    timeline.value = response.err === 'ok' ? (response.timeline?.segments || []) : []
  }

  async function playAt(index: number, autoplay = true, startMs = 0) {
    const target = chapters.value[index]
    if (!target) return
    chapter.value = target
    positionMs.value = Math.max(0, startMs)
    durationMs.value = target.duration_ms || 0
    error.value = ''
    await loadTimeline(target)
    const element = ensureAudio()
    if (!element) return
    element.src = target.audio_url
    element.playbackRate = rate.value
    element.volume = volume.value
    element.load()
    persist()
    if (autoplay) {
      await ensureSession()
      try {
        await element.play()
      } catch {
        playing.value = false
      }
    }
  }

  async function open(
    selectedBook: PersistedPlayer['book'],
    selectedEdition: AudiobookEdition,
    chapterNumber: number,
    startMs = 0,
    autoplay = true,
  ) {
    book.value = selectedBook
    edition.value = selectedEdition
    expanded.value = true
    const index = Math.max(0, selectedEdition.chapters.findIndex(item => item.number === chapterNumber))
    await playAt(index, autoplay, startMs)
  }

  async function restore() {
    if (!import.meta.client || book.value || restoring.value) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    restoring.value = true
    try {
      const saved = JSON.parse(raw) as PersistedPlayer
      const { $backend } = useNuxtApp()
      const response = await $backend(`/audiobooks/${saved.editionId}/manifest`)
      if (response.err !== 'ok') {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      rate.value = saved.rate || 1
      volume.value = saved.volume ?? 1
      progressVersion.value = response.progress?.version || 0
      await open(saved.book, response.manifest, saved.chapterNumber, response.progress?.position_ms ?? saved.positionMs, false)
      expanded.value = false
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      restoring.value = false
    }
  }

  async function toggle() {
    const element = ensureAudio()
    if (!element || !chapter.value) return
    if (playing.value) element.pause()
    else {
      await ensureSession()
      await element.play()
    }
  }

  function seek(value: number) {
    positionMs.value = Math.max(0, Math.min(durationMs.value, Number(value)))
    if (audio) audio.currentTime = positionMs.value / 1000
    persist()
  }

  function setRate(value: number) {
    rate.value = value
    if (audio) audio.playbackRate = value
    persist()
  }

  function setVolume(value: number) {
    volume.value = value
    if (audio) audio.volume = value
    persist()
  }

  async function previous() {
    if (hasPrevious.value) await playAt(chapterIndex.value - 1)
  }

  async function next() {
    if (hasNext.value) await playAt(chapterIndex.value + 1)
  }

  function close() {
    audio?.pause()
    audio = null
    book.value = null
    edition.value = null
    chapter.value = null
    timeline.value = []
    sessionId.value = ''
    playing.value = false
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return {
    book,
    edition,
    chapter,
    timeline,
    playing,
    expanded,
    restoring,
    positionMs,
    durationMs,
    rate,
    volume,
    error,
    chapters,
    chapterIndex,
    hasPrevious,
    hasNext,
    activeSegment,
    open,
    restore,
    toggle,
    seek,
    setRate,
    setVolume,
    previous,
    next,
    close,
  }
})
