<!-- 网站公告 -->
<template>
    <v-row v-if="show_press" >
        <v-col cols=12>
            <v-alert outlined colored-border dismissible @input="close"
               border="left" color="deep-purple accent-4" type="info">
                <div v-html="press_message"></div>
            </v-alert>
        </v-col>
    </v-row>
</template>

<script>
export default {
    name: 'AppPress',
    computed: {
        has_press: function() {
            return ( this.$store.state.sys.header != undefined );
        },
        press_message: function() {
            if ( this.$store.state.sys.header != undefined ) {
                return this.$store.state.sys.header;
            }
            return "";
        },
        show_press: function() {
            if (!this.has_press) {
                return false;
            }
            var msg = this.press_message;
            var hash = this.hash_code(this.press_message);
            var cookie = this.$cookies.get('close_press', 'none');

            if ( msg == "" || hash == cookie ) {
                return false;
            }

            return true;
        },
    },
    methods: {
        hash_code: function(s) {
            var hash = 0, i, chr;
            if (s.length === 0) return hash;
            for (i = 0; i < s.length; i++) {
                chr   = s.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        },
        close: function() {
            var hash = this.hash_code(this.press_message);
            this.$cookies.set('close_press', hash);
        },
    },
    data: () => ({
    })
}
</script>

<style>
</style>
