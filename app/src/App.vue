<template>
    <v-app>
        <app-header v-if="$store.state.nav"></app-header>
        <v-content>
            <v-container fluid fill-height>
                <v-layout v-show="$store.state.loading" row wrap align-center justify-center>
                    <v-flex >
                        <div class="text-xs-center">
                            <v-progress-circular indeterminate color="primary" ></v-progress-circular>
                        </div>
                    </v-flex>
                </v-layout>
                <router-view v-show="! $store.state.loading" ></router-view>
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
