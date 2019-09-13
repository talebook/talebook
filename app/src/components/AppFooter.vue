<template>
    <v-footer app color="blue" class="white--text" >
        <span>&nbsp;读万卷书,行万里路({{$vuetify.breakpoint.name}})</span>
        <v-spacer></v-spacer>
        <span><v-btn small text color="white" href="https://github.com/talebook/calibre-webserver">Github</v-btn>&nbsp;</span>
    </v-footer>
</template>

<script>
  export default {
      name: 'AppFooter',
    data: () => ({
    })
  }
</script>

<style>

</style>
