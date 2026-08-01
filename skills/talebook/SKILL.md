---
name: talebook
description: Connect to a self-hosted Talebook personal library through its MCP endpoint. Use when the user asks to search or inspect their Talebook books, review authors or categories, manage favorites/wants/reading state and progress, edit or fill book metadata, write metadata into ebook files, search/read/save books from Talebook's network library, or inspect asynchronous network-library tasks.
---

# Talebook

Use Talebook's authenticated MCP endpoint through `scripts/talebook_mcp.py`. Never request or pass a Talebook username or password.

## Connect

Require these environment variables:

- `TALEBOOK_MCP_URL`: Full MCP endpoint, normally `https://books.example.com/mcp`.
- `TALEBOOK_MCP_TOKEN`: Bearer Token configured by the Talebook administrator.

Run a connection check before the first operation:

```bash
python scripts/talebook_mcp.py check
```

If the environment is unavailable, explain which variable is missing. Do not ask the user to paste a Token into chat or place it in a command argument.

## Choose a workflow

- For local books, call `search_books`, then `get_book` when full metadata or formats matter.
- For author and category discovery, call `list_authors` or `list_categories`, then search with the returned name.
- For personal reading activity, call `reading_overview` or `list_bookshelf`; use the corresponding update tool only when the user asks to change state.
- For network books, call `search_network_books`, poll `get_network_search` until `finished` is true, then use the returned `source_id` and URL with detail, table-of-contents, chapter, or save tools.
- After `save_network_book`, poll `get_network_save` only when the user asks to wait for completion. Treat an unchanged running state as normal.

Read [references/tools.md](references/tools.md) when selecting parameters or interpreting a result. For current server schemas, run:

```bash
python scripts/talebook_mcp.py list
```

Call a tool with a JSON object:

```bash
python scripts/talebook_mcp.py call search_books '{"query":"三体","page_size":10}'
```

## Protect user intent

Perform read-only searches, detail lookups, statistics, and chapter reads without extra confirmation.

Before changing data:

1. Resolve the target to an unambiguous local `book_id`, or a network `source_id` plus `book_url`.
2. Restate the exact book and requested change.
3. Ask for confirmation if the request did not already clearly authorize that exact mutation.

Treat these operations as mutations: `update_reading_state`, `update_reading_progress`, `update_book_metadata`, `auto_fill_metadata`, `save_metadata_to_file`, and `save_network_book`.

`tags` and `authors` replace their complete existing lists. Fetch the book first when the user asks to add or remove only one value, merge locally, and then send the full intended list.

Never invent a book ID, source ID, task ID, URL, or metadata value. Never bypass the MCP tool allowlist by calling Talebook's REST API directly.

## Report results

Summarize useful book fields instead of dumping raw JSON. Preserve task and book IDs when the user may need a follow-up. If the response has `ok: false`, explain its error message and suggest a relevant recovery step; do not retry mutations automatically.
