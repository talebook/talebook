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
                        504
                    </h1>
                    <h2 class="text-h4 mb-8">
                        网关超时
                    </h2>
                    <p class="text-body-1 mb-12">
                        抱歉，服务器网关超时，请稍后再试。
                    </p>
                    <v-btn
                        color="primary"
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
    name: 'GatewayTimeoutPage',
    // 确保使用默认布局
    layout: 'default',
    head() {
        return {
            title: '504 - 网关超时',
        };
    },
};
</script>