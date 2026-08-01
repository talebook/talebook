# Talebook MCP tools

Use `python scripts/talebook_mcp.py list` as the authoritative schema. This reference explains selection and sequencing.

## Local library

| Tool | Purpose | Key arguments |
|---|---|---|
| `library_overview` | Counts for books and metadata plus saved network books | None |
| `search_books` | Search visible local books with Calibre syntax | `query`, optional `page`, `page_size` |
| `get_book` | Full metadata, formats, scope, and reading state | `book_id` |
| `list_authors` | Authors ordered by book count | Optional `limit` |
| `list_categories` | Talebook `BOOK_NAV` category groups and tags | None |

Plain search text matches normal title/author searches. Calibre field syntax may be used when the user specifies a field, such as `tags:"科幻"`, `authors:"刘慈欣"`, or `isbn:978...`.

## Reading activity

| Tool | Purpose | Key arguments |
|---|---|---|
| `reading_overview` | Counts for reading, finished, favorite, and wants | None |
| `list_bookshelf` | List one personal shelf | `shelf`: `favorite`, `wants`, `reading`, or `finished` |
| `update_reading_state` | Change one or more state fields | `book_id`; optional `favorite`, `wants`, `read_state` |
| `get_reading_progress` | Read cross-device progress | `book_id` |
| `update_reading_progress` | Store a progress object up to 8 KiB | `book_id`, `progress` |

Reading states are `0` unread, `1` reading, and `2` finished.

## Metadata

| Tool | Purpose | Important behavior |
|---|---|---|
| `update_book_metadata` | Update selected metadata fields | `authors` and `tags` replace their whole lists |
| `auto_fill_metadata` | Start metadata enrichment for up to the server limit | Asynchronous; requires the server feature to be enabled |
| `save_metadata_to_file` | Write current metadata into EPUB/AZW3/PDF | This changes the ebook file itself |

For a partial tag or author request, call `get_book`, calculate the complete new list, show it to the user when confirmation is needed, and update once.

## Network library

The network library is Talebook's source-driven online book workflow. Search and save are asynchronous.

1. Optionally call `list_network_sources`.
2. Call `search_network_books` with `query`; restrict by `source_ids` or `group` when requested.
3. Poll `get_network_search` with its `task_id` until `finished` is true.
4. Select a result and use `get_network_book`.
5. Use `get_network_toc` and `read_network_chapter` for reading, or `save_network_book` to import it.
6. Poll `get_network_save` with the same `source_id` and `book_url` when completion matters.

`read_network_chapter` reports `truncated: true` when content exceeds the server's MCP response limit. Do not claim the returned text is complete in that case.

`list_saved_network_books` lists imported online books and optionally filters `status` as `serial`, `finished`, or `unknown`.

## Errors

- `book.not_found`: Search again and confirm the current book ID.
- `permission`: Explain that the MCP administrator account lacks the corresponding Talebook permission.
- `feature.disabled`: Explain which Talebook setting must be enabled; do not change server configuration automatically.
- `task.not_found`: The asynchronous task expired or the ID is wrong; ask before starting a new mutation.
- `source.not_found`: Refresh enabled sources or choose another search result.
- `source.js_unsupported`: The selected source depends on JavaScript rules unsupported by the server.
