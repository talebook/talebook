
import book
import user
import meta
import files
import opds
def routes():
    routes = []
    routes += opds.routes()
    routes += book.routes()
    routes += user.routes()
    routes += meta.routes()
    routes += files.routes()
    return routes
