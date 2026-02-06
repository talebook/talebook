<template>
    <v-app>
        <Loading />
        <v-main>
            <v-container fluid>
                <slot />
            </v-container>

            <v-dialog
                v-model="store.alert.show"
                persistent
                :width="display.smAndDown.value ? '80%' : '50%'"
            >
                <v-card>
                    <v-toolbar
                        dark
                        color="primary"
                    >
                        <v-toolbar-title align-center />
                    </v-toolbar>
                    <v-card-text class="pt-12">
                        <v-alert
                            outlined
                            :model-value="store.alert.show"
                            :type="store.alert.type"
                        >
                            {{ store.alert.msg }}
                        </v-alert>
                    </v-card-text>
                    <v-card-actions v-if="store.alert.type!=='success' || store.alert.to">
                        <v-spacer />
                        <v-btn
                            v-if="store.alert.to"
                            color="primary"
                            @click="router.push(store.alert.to); store.closeAlert()"
                        >
                            好的
                        </v-btn>
                        <v-btn
                            v-else
                            color="primary"
                            @click="store.closeAlert()"
                        >
                            关闭
                        </v-btn>
                        <v-spacer />
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-main>
    </v-app>
</template>

<script setup>
import { useMainStore } from '@/stores/main';
import { useDisplay } from 'vuetify';

const store = useMainStore();
const display = useDisplay();
const router = useRouter();

useHead({
    title: computed(() => store.site_title),
    titleTemplate: computed(() => store.site_title_template),
});

onMounted(() => {
    store.setLoading(false);
});
</script>
