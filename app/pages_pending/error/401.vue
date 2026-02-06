<template>
    <div>
        <v-container
            fluid
            class="d-flex align-center justify-center min-vh-100"
        >
            <v-row justify="center">
                <v-col
                    cols="12"
                    class="text-center"
                >
                    <h1 class="display-1 font-weight-bold mb-4">
                        401
                    </h1>
                    <h2 class="text-h4 mb-8">
                        未授权
                    </h2>
                    <p class="text-body-1 mb-12">
                        抱歉，您需要登录才能访问此页面。
                    </p>
                    <v-btn
                        color="primary"
                        href="/login"
                        large
                        rounded
                        class="mr-4"
                    >
                        登录
                    </v-btn>
                    <v-btn
                        color="secondary"
                        href="/"
                        large
                        rounded
                    >
                        返回首页
                    </v-btn>
                </v-col>
            </v-row>
        </v-container>
    </div>
</template>

<script>
export default {
    name: 'UnauthorizedPage',
    // 确保使用默认布局
    layout: 'default',
    head() {
        return {
            title: '401 - 未授权',
        };
    },
};
</script>