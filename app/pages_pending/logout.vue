<template>
    <v-row justify=center class='fill-center'>
      <v-col xs=12 sm=8 md=4>
        <v-card class="elevation-12">
            <v-toolbar dark color="blue-grey">
                <v-toolbar-title></v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <div class="text-center title primary--text">
                    <p class="pt-8">{{msg}}</p>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn class="mb-4" rounded color="primary" href="/">返回首页</v-btn>
                <v-spacer></v-spacer>
            </v-card-actions>
        </v-card>
          </v-col>
        </v-row>
</template>

<script>
export default {
    created() {
        this.$store.commit("navbar", false);
        this.logout();
    },
    data: () => ({
        msg: "您已退出登录。",
    }),
    head: () => ({
        title: "已退出登录"
    }),
    methods: {
        logout: function() {
            this.$backend('/user/sign_out')
            .then( rsp => {
                this.msg = rsp.msg;
            });
        }
    },
}
</script>

