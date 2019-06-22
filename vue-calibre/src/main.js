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
import Welcome    from './pages/Welcome.vue'
import NotFound   from './pages/NotFound.vue'

Vue.config.productionTip = false

const router = new VueRouter({
    mode: 'history',
    routes: [
        { path: '/',         component: Index    },
        { path: '/all',      component: NotFound },
        { path: '/install',  component: Install  },
        { path: '/recent',   component: BookList },
        { path: '/hot',      component: BookList },
        { path: '/settings', component: Settings },
        { path: '/welcome',  component: Welcome  },
        { path: '/login',    component: Login    },

        { path: '/book/:bookid(\\d+)', component: BookDetail },
        { path: '/book/:bookid(\\d+)/read', component: BookRead },
        { path: '/:meta(pub|tag|author|rating)', component: MetaList },
        { path: '/:meta(pub|tag|author|rating)/:name', component: BookList },

        { path: '*', component: NotFound },
    ]
})

const store = new Vuex.Store({
    state: {
        nav: true,
        loading: false,
        count: 0,
        user: {
            avatar: "https://q.qlogo.cn/qqapp/101187047/D7B5E27D5440740246E23C8E981E22A2/40",
            nickname: "",
        },
    },
    mutations: {
        loading(state) {
            state.loading = true;
        },
        loaded(state) {
            state.loading = false;
        },
        puremode(state, pure) {
            if ( pure ) {
                state.nav = false;
            } else {
                state.nav = true;
            }
        },
        increment(state) {
            state.count++
        },
        login(state, user) {
            state.user = user;
        },
    }
})

window.app = new Vue({
    router,
    store,
    render: h => h(App)
}).$mount('#app')

