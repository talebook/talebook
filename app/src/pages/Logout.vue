<template>
    <v-content>
      <v-container fluid fill-height>
        <v-layout align-center justify-center>
          <v-flex xs12 sm8 md4>
            <v-alert :value="msg" type="success">{{msg}}</v-alert>
            <div style="padding: 50px"></div>
            <div align="center">
                <v-btn large round color="primary" href="/">返回首页</v-btn>
            </div>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
</template>

<script>
export default {
    created() {
        this.$store.commit("puremode", true);
        this.logout();
    },
    data: () => ({
        msg: "您已退出登录。",
    }),
    methods: {
        logout: function() {
            this.backend('/user/sign_out')
            .then( rsp => rsp.json() )
            .then( rsp => {
                this.msg = rsp.msg;
            });
        }
    },
}
</script>

