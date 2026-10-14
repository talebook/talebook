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
                <v-toolbar color="primary">
                    <v-toolbar-title />
                </v-toolbar>
                <v-card-text>
                    <div class="text-center text-primary">
                        <!-- 文案来自 sign_out 的响应，服务端拿不到。
                             元素结构必须两侧一致（否则节点类型不匹配），
                             因此固定渲染 <p>，只让文本内容在客户端变化。 -->
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
                        :href="withBasePath('/')"
                    >
                        {{ t('common.home') }}
                    </v-btn>
                    <v-spacer />
                </v-card-actions>
            </v-card>
        </v-col>
    </v-row>
</template>

<script setup>
import { withBasePath } from '@/utils/base-path';
import { useMainStore } from '@/stores/main';
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const store = useMainStore();
const { $backend } = useNuxtApp();
const { t } = useI18n();

// 初始文案用 i18n 的默认值：服务端与客户端首帧必须一致，
// 否则会触发 hydration mismatch。sign_out 返回后若文案不同再更新。
const msg = ref(t('auth.loggedOut'));

const logout = async () => {
    try {
        const rsp = await $backend('/user/sign_out');
        msg.value = rsp.msg || t('auth.loggedOut');
    } catch (error) {
        console.error('Logout error:', error);
        msg.value = t('auth.loggedOut');
    }
};

// 在 onMounted 里改导航栏状态：setup 阶段改会让服务端（store 默认 true）
// 与客户端首帧不一致，触发 hydration mismatch。
onMounted(() => {
    store.setNavbar(false);
    logout();
});

useHead(() => ({
    title: t('auth.loggedOutTitle')
}));
</script>
