<template>
    <v-app>
        <app-header v-if="$store.state.nav"></app-header>
        <v-content>
            <v-container fluid fill-height v-show="$store.state.loading">
                <v-row>
                    <v-col align=center justify=center>
                        <v-progress-circular indeterminate color="primary" ></v-progress-circular>
                    </v-col>
                </v-row>
            </v-container>

            <v-container fluid v-show="!$store.state.loading">
                <router-view></router-view>
            </v-container>

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
        }
    }
}
</script>
