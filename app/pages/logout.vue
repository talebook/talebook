<template>
    <v-row
        justify="center"
        class="fill-center"
    >
        <v-col
            cols="12"
            sm="8"
            md="4"
        >
            <v-card elevation="12">
                <v-toolbar color="blue-grey">
                    <v-toolbar-title />
                </v-toolbar>
                <v-card-text>
                    <div class="text-center text-primary">
                        <p class="pt-8 text-h6">
                            {{ msg }}
                        </p>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn
                        class="mb-4"
                        rounded
                        color="primary"
                        variant="elevated"
                        href="/"
                    >
                        {{ $t('common.home') }}
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { useMainStore } from '@/stores/main';
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const store = useMainStore();
const { $backend } = useNuxtApp();
const { t } = useI18n();

const msg = ref(t('auth.loggedOut'));

const logout = async () => {
    try {
        const rsp = await $backend('/user/sign_out');
        msg.value = rsp.msg || '您已退出登录。';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

store.setNavbar(false);

onMounted(() => {
    logout();
});

useHead(() => ({
    title: t('auth.loggedOutTitle')
}));
</script>
