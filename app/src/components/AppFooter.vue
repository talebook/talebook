<template>
    <v-row>
        <v-col cols=12 class='text-center'>
            <v-divider class='mt-10 mb-3' ></v-divider>
            <p v-if="footer_inject" class='mb-0 text-center footer-text' v-html="footer_inject"></p>
            <p class='mb-0 text-center footer-text' v-html="footer_text"></p>
            <p>
            <v-btn small text target="_blank" href="https://github.com/talebook/talebook">Github</v-btn>
            | <v-btn small text target="_blank" href="https://hub.docker.com/r/talebook/talebook">Docker</v-btn>
            | <v-btn small text target="_blank" href="http://talebook.org">Project</v-btn>
            </p>
        </v-col>
    </v-row>
</template>

<script>
export default {
    name: 'AppFooter',
    computed: {
        footer_text: function() {
            return this.$store.state.sys.footer || '';
        },
        footer_inject: function() {
            return this.$store.state.sys.footer_inject || '';
        },
    }
}
</script>

<style>

</style>
