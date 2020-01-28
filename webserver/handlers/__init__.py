
import book_handlers
import user_handlers
import meta_handlers
import file_handlers
import opds
def routes():
    routes = []
    routes += opds.routes()
    routes += book_handlers.routes()
    routes += user_handlers.routes()
    routes += meta_handlers.routes()
    routes += file_handlers.routes()
    return routes
