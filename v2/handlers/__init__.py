
import book_handlers
import user_handlers
import meta_handlers
import file_handlers
def routes():
    routes = []
    routes += book_handlers.routes()
    routes += user_handlers.routes()
    routes += meta_handlers.routes()
    routes += file_handlers.routes()
    return routes
