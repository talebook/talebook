from calibre.ebooks.metadata.meta import get_metadata

path = "/data/books/imports/todo/【精排】红星照耀中国 （又名：西行漫记）.mobi"
with open(path, "rb") as f:
    mi = get_metadata(f, stream_type="mobi")

print("title:", mi.title)
print("authors:", mi.authors)
fmt, data = mi.cover_data
print("cover format:", fmt, "size:", len(data) if data else 0)
if data:
    with open("/tmp/calibre_cover.jpg", "wb") as out:
        out.write(data)
    print("written to /tmp/calibre_cover.jpg")