<script>
 // don't create a template for the section
import ListBook from '~/pages/ListBook.vue'
ListBook.head = function() {
    var name = decodeURIComponent(this.$route.params.name);
    var titles = {
        tag: `"${name}”标签的书籍`,
        series: `${name}丛书`,
        rating: `${name}星书籍`,
        author: `${name}的著作`,
        publisher: `${name}出版的书籍`,
    }
    var meta = this.$route.path.split("/")[1];
    if ( titles[meta] !== undefined ) {
        return {
            title: titles[meta]
        }
    }
    return {}
}
export default ListBook
</script>
