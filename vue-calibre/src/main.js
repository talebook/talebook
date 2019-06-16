import Vue from 'vue'
import VueRouter from 'vue-router'
Vue.use(VueRouter)

import Vuex from 'vuex'
Vue.use(Vuex)

import Vuetify from 'vuetify/lib'
import 'vuetify/src/stylus/app.styl'
Vue.use(Vuetify, { iconfont: 'md' })

import App        from './App.vue'
import Index      from './pages/Index.vue'
import Install    from './pages/Install.vue'
import BookDetail from './pages/BookDetail.vue'
import BookRead   from './pages/BookRead.vue'
import BookList   from './pages/BookList.vue'
import Login      from './pages/Login.vue'
import MetaList   from './pages/MetaList.vue'
import Settings   from './pages/Settings.vue'

Vue.config.productionTip = false

const router = new VueRouter({
    mode: 'history',
    routes: [
        { path: '/', component: Index },
        { path: '/install', component: Install },
        { path: '/recent', component: BookList },
        { path: '/hot', component: BookList },
        { path: '/book/:bookid(\\d+)', component: BookDetail },
        { path: '/book/:bookid(\\d+)/read', component: BookRead },
        { path: '/:meta(pub|tag|author|rating)', component: MetaList },
        { path: '/:meta(pub|tag|author|rating)/:name', component: BookList },
        { path: '/settings', component: Settings },
        { path: '/login', component: Login },
        { path: '.*', component: Install },
    ]
})

const store = new Vuex.Store({
    state: {
        nav: true,
        loading: false,
        count: 0
    },
    mutations: {
        loading(state) {
            state.loading = true;
        },
        loaded(state) {
            state.loading = false;
        },
        puremode(state) {
            state.nav = false;
        },
        increment (state) {
            state.count++
        },
    }
})

window.app = new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app')

