<template>
    <div class="manifest-preview">
        <p class="introduction">
            {{ manifest.introduction }}
        </p>
        <div class="manifest-grid">
            <section>
                <h3>{{ t('protagonist.traits') }}</h3><v-chip
                    v-for="item in manifest.traits"
                    :key="item"
                    size="small"
                    class="mr-2 mb-2"
                    color="deep-orange-darken-2"
                    variant="tonal"
                >
                    {{ item }}
                </v-chip>
            </section>
            <section>
                <h3>{{ t('protagonist.principles') }}</h3><ul>
                    <li
                        v-for="item in manifest.principles"
                        :key="item"
                    >
                        {{ item }}
                    </li>
                </ul>
            </section>
            <section>
                <h3>{{ t('protagonist.relationshipBoundaries') }}</h3><ul>
                    <li
                        v-for="item in manifest.relationship_boundaries"
                        :key="item"
                    >
                        {{ item }}
                    </li>
                </ul>
            </section>
            <section>
                <h3>{{ t('protagonist.expressionConstraints') }}</h3><ul>
                    <li
                        v-for="item in manifest.expression_constraints"
                        :key="item"
                    >
                        {{ item }}
                    </li>
                </ul>
            </section>
        </div>
        <div class="source-list">
            <v-icon size="18">
                mdi-source-branch
            </v-icon><span>{{ t('protagonist.sourcesLine', { sources: formattedSources }) }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ manifest: any }>();
const { locale, t } = useI18n();
const formattedSources = computed(() => new Intl.ListFormat(locale?.value || 'en-US', {
    style: 'long',
    type: 'conjunction',
}).format(props.manifest.sources.map((item: any) => item.title)));
</script>

<style scoped>
.introduction { margin:0 0 18px; color:rgba(var(--v-theme-on-surface),.72); font-size:1.02rem; }.manifest-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.manifest-grid section { padding:15px; border:1px solid rgba(var(--v-border-color),.14); border-radius:14px; background:rgba(var(--v-theme-background),.42); }.manifest-grid h3 { margin:0 0 9px; font-size:.82rem; }.manifest-grid ul { margin:0; padding-inline-start:20px; color:rgba(var(--v-theme-on-surface),.72); font-size:.85rem; }.source-list { display:flex; gap:8px; margin-top:15px; color:rgba(var(--v-theme-on-surface),.68); font-size:.75rem; overflow-wrap:anywhere; } @media(max-width:650px){.manifest-grid{grid-template-columns:1fr;}}
</style>
