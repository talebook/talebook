<template>
    <v-row
        justify="center"
        class="fill-height align-center"
    >
        <v-col
            cols="12"
            sm="8"
            md="4"
        >
            <v-card class="elevation-12">
                <v-toolbar
                    color="primary"
                    theme="dark"
                >
                    <v-toolbar-title class="text-center">
                        激活成功
                    </v-toolbar-title>
                </v-toolbar>
                <v-card-text>
                    <p class="mt-12 mb-8 text-center">
                        你已成功激活账号，请前往首页浏览吧！
                    </p>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        to="/"
                        color="primary"
                        variant="elevated"
                    >
                        Go
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { onMounted } from 'vue';
import { useMainStore } from '@/stores/main';

const mainStore = useMainStore();

useHead({
    title: '激活成功'
});

onMounted(() => {
    mainStore.setNavbar(false);
});
</script>
