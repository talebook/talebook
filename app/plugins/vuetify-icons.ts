import { aliases } from 'vuetify/iconsets/mdi-svg';
import { LocalMdiIcon } from '@/utils/local-mdi-icons';

export default defineNuxtPlugin({
    name: 'talebook:local-icons',
    order: 20,
    setup(nuxtApp) {
        nuxtApp.hook('vuetify:before-create', ({ vuetifyOptions }) => {
            vuetifyOptions.icons = {
                defaultSet: 'mdi',
                aliases,
                sets: {
                    mdi: { component: LocalMdiIcon },
                },
            };
        });
    },
});

