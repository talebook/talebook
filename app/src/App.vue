<template>
    <v-app>
        <app-header v-if="$store.state.nav"></app-header>
        <v-content>
            <v-container fluid fill-height v-if="$store.state.loading">
                <v-row>
                    <v-col align=center justify=center>
                        <v-progress-circular indeterminate color="primary" ></v-progress-circular>
                    </v-col>
                </v-row>
            </v-container>

            <v-container fluid v-show="!$store.state.loading">
                <router-view></router-view>
            </v-container>

            <v-dialog v-model="$store.state.alert.show" persistent width="300">
                <v-card>
                    <v-toolbar dark color="primary">
                        <v-toolbar-title align-center></v-toolbar-title>
                    </v-toolbar>
                    <v-card-text class="pt-12" >
                        <v-alert outlined v-model="$store.state.alert.show" :type="$store.state.alert.type">
                            {{$store.state.alert.msg}}
                        </v-alert>
                    </v-card-text>
                    <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn color="primary" @click="$store.commit('close_alert')">关闭</v-btn>
                        <v-spacer></v-spacer>
                    </v-card-actions>
                </v-card>
            </v-dialog>
        </v-content>
        <app-footer v-if="$store.state.nav"></app-footer>
    </v-app>
</template>

<script>
import AppHeader from "./components/AppHeader.vue"
import AppFooter from "./components/AppFooter.vue"
export default {
    name: 'App',
    components: {
        AppHeader,
        AppFooter,
    },
    data () {
        return {
            dialog_msg: false,
        }
    }
}
</script>
