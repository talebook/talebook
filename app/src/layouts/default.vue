<template>
    <v-app>
        <loading/>
        <app-header v-if="$store.state.nav"></app-header>
        <v-main>
            <v-container fluid>
                <Nuxt/>
                <app-footer v-if="$store.state.nav"></app-footer>
            </v-container>

            <v-dialog v-model="$store.state.alert.show" persistent :width="$vuetify.breakpoint.smAndDown?'80%':'50%'">
                <v-card>
                    <v-toolbar dark color="primary">
                        <v-toolbar-title align-center></v-toolbar-title>
                    </v-toolbar>
                    <v-card-text class="pt-12">
                        <v-alert outlined v-model="$store.state.alert.show" :type="$store.state.alert.type"
                                 v-html="$store.state.alert.msg"></v-alert>
                    </v-card-text>
                    <v-card-actions v-if="$store.state.alert.type!=='success' || $store.state.alert.to">
                        <v-spacer></v-spacer>
                        <v-btn v-if='$store.state.alert.to' color="primary"
                               @click="$router.push($store.state.alert.to);$store.commit('close_alert')">好的
                        </v-btn>
                        <v-btn v-else color="primary" @click="$store.commit('close_alert')">关闭</v-btn>
                        <v-spacer></v-spacer>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-main>
        <upload v-if="$store.state.nav"></upload>
    </v-app>
</template>

<script>
import AppHeader from "~/components/AppHeader.vue"
import AppFooter from "~/components/AppFooter.vue"
import Loading from "~/components/Loading.vue"
import Upload from "~/components/Upload.vue"

export default {
    name: 'DefaultLayout',
    components: {
        AppHeader,
        AppFooter,
        Loading,
        Upload,
    },
    data: () => ({}),
    head() {
        return {
            title: this.$config.head.title,
            titleTemplate: this.$config.head.titleTemplate,
        }
    },
    mounted() {
        this.$store.commit("loaded");
    },
}
</script>