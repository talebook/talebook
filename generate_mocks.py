import sqlite3
import json
import os
import datetime

DB_PATH = "tests/cases/metadata.db"
OUTPUT_DIR = "app/test/e2e/mocks"


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def get_books(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM books")
    books = cursor.fetchall()

    result = []
    for book in books:
        book_id = book["id"]

        # Get authors
        cursor.execute(
            """
            SELECT name FROM authors 
            JOIN books_authors_link ON authors.id = books_authors_link.author 
            WHERE books_authors_link.book = ?
        """,
            (book_id,),
        )
        authors = [row["name"] for row in cursor.fetchall()]

        # Get tags
        cursor.execute(
            """
            SELECT name FROM tags 
            JOIN books_tags_link ON tags.id = books_tags_link.tag 
            WHERE books_tags_link.book = ?
        """,
            (book_id,),
        )
        tags = [row["name"] for row in cursor.fetchall()]

        # Get publisher
        cursor.execute(
            """
            SELECT name FROM publishers 
            JOIN books_publishers_link ON publishers.id = books_publishers_link.publisher 
            WHERE books_publishers_link.book = ?
        """,
            (book_id,),
        )
        publisher_row = cursor.fetchone()
        publisher = publisher_row["name"] if publisher_row else ""

        # Get series
        cursor.execute(
            """
            SELECT name FROM series 
            JOIN books_series_link ON series.id = books_series_link.series 
            WHERE books_series_link.book = ?
        """,
            (book_id,),
        )
        series_row = cursor.fetchone()
        series = series_row["name"] if series_row else ""

        # Get rating
        cursor.execute(
            """
            SELECT ratings.rating FROM ratings 
            JOIN books_ratings_link ON ratings.id = books_ratings_link.rating 
            WHERE books_ratings_link.book = ?
        """,
            (book_id,),
        )
        rating_row = cursor.fetchone()
        rating = rating_row["rating"] if rating_row else 0

        # Get comments
        cursor.execute("SELECT text FROM comments WHERE book = ?", (book_id,))
        comment_row = cursor.fetchone()
        comments = comment_row["text"] if comment_row else ""

        # Get formats (data)
        cursor.execute("SELECT format, uncompressed_size FROM data WHERE book = ?", (book_id,))
        formats = []
        available_formats = []
        for row in cursor.fetchall():
            fmt = row["format"].lower()
            available_formats.append(fmt)
            formats.append({"format": fmt, "size": row["uncompressed_size"], "href": f"/api/book/{book_id}.{fmt}"})

        # Get language
        cursor.execute(
            """
            SELECT languages.lang_code FROM languages 
            JOIN books_languages_link ON languages.id = books_languages_link.lang_code 
            WHERE books_languages_link.book = ?
        """,
            (book_id,),
        )
        lang_row = cursor.fetchone()
        language = lang_row["lang_code"] if lang_row else ""

        # Format timestamp
        ts = book["timestamp"]
        if isinstance(ts, str):
            # Attempt to parse if string, though sqlite3 usually returns str for timestamp
            try:
                dt = datetime.datetime.strptime(ts, "%Y-%m-%d %H:%M:%S.%f")
            except:
                try:
                    dt = datetime.datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
                except:
                    dt = datetime.datetime.now()
        else:
            dt = ts

        # Construct book object
        book_obj = {
            "id": book_id,
            "title": book["title"],
            "rating": rating,
            "timestamp": str(ts),
            "pubdate": str(book["pubdate"]),
            "author": ", ".join(authors),
            "authors": authors,
            "author_sort": book.get("author_sort", authors[0] if authors else ""),
            "tag": " / ".join(tags),
            "tags": tags,
            "publisher": publisher,
            "comments": comments,
            "series": series,
            "language": language,
            "isbn": book.get("isbn", ""),
            "img": f"/get/cover/{book_id}.jpg",
            "thumb": f"/get/thumb_60x80/{book_id}.jpg",
            "collector": "admin",  # Mock collector
            "count_visit": 0,
            "count_download": 0,
            "available_formats": available_formats,  # internal use
            "files": formats,
        }

        result.append(book_obj)

    return result


def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory

    books = get_books(conn)
    conn.close()

    print(f"Found {len(books)} books.")

    # 1. Save all books (internal helper)
    with open(os.path.join(OUTPUT_DIR, "books.json"), "w") as f:
        json.dump(books, f, indent=2, ensure_ascii=False)

    # 2. Generate api/index mock
    # Random books and New books
    # For mock, just take first 10 for both
    index_data = {
        "err": "ok",
        "random_books_count": len(books),
        "new_books_count": len(books),
        "random_books": books[:10],
        "new_books": books[:10],
    }
    with open(os.path.join(OUTPUT_DIR, "api_index.json"), "w") as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)

    # 3. Generate api/recent mock
    recent_data = {"err": "ok", "title": "新书推荐", "total": len(books), "books": books}
    with open(os.path.join(OUTPUT_DIR, "api_recent.json"), "w") as f:
        json.dump(recent_data, f, indent=2, ensure_ascii=False)

    # 4. Generate api/book/{id} mock
    for book in books:
        detail_data = {"err": "ok", "kindle_sender": "", "book": book}
        # Add permission fields
        detail_data["book"]["is_public"] = True
        detail_data["book"]["is_owner"] = True

        with open(os.path.join(OUTPUT_DIR, f"api_book_{book['id']}.json"), "w") as f:
            json.dump(detail_data, f, indent=2, ensure_ascii=False)

    # 5. Generate api/hot mock
    hot_data = {"err": "ok", "title": "热度榜单", "total": len(books), "books": books}
    with open(os.path.join(OUTPUT_DIR, "api_hot.json"), "w") as f:
        json.dump(hot_data, f, indent=2, ensure_ascii=False)

    print(f"Mock data generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
