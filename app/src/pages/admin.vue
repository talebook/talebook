<template>
    <v-row>
        <v-col xs=10 offset-xs1 >

<v-card>
    <v-tabs v-model="tab_active" color="primary" slider-color="yellow" >
        <v-tabs-slider></v-tabs-slider>
        <v-tab ripple>系统设置</v-tab>
        <v-tab ripple>用户管理</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab_active">
        <v-tab-item >
            <v-card-text>
            <settings></settings>
            </v-card-text>
        </v-tab-item>
        <v-tab-item >
            <users></users>
        </v-tab-item>
    </v-tabs-items>
</v-card>

        </v-col>
    </v-row>
</template>

<script>
import Settings from "~/components/Settings.vue"
import Users from "~/components/Users.vue"
export default {
    created()  {
        this.$store.commit('navbar', true);
    },
    components: {
        Settings,
        Users,
    },
    data: () => ({
        tab_active: null,
        show1: false,
        show2: false,
        show3: false,
    }),
    head: () => ({
        title: "管理员",
    }),
    methods: {
    },
  }
</script>

