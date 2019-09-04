<template>
    <v-row justify=center class='fill-center'>
      <v-col xs=12 sm=8 md=4>
        <v-card class="elevation-12">
            <v-toolbar dark color="red lighten-1">
                <v-toolbar-title></v-toolbar-title>
            </v-toolbar>
            <v-card-text>
                <div class="text-center title primary--text">
                    <br/> <br/>
                    <p>{{msg}}</p>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-row>
                    <v-col>
                        <div align="center">
                            <v-btn large rounded color="primary" href="/">返回首页</v-btn>
                        </div>
                    </v-col>
                </v-row>
            </v-card-actions>
        </v-card>
          </v-col>
        </v-row>
</template>

<script>
export default {
    created() {
        this.$store.commit("navbar", false);
        this.$store.commit("loaded");
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

