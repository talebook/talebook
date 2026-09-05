"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[8166],{8166:(E,e,T)=>{T.d(e,{getMigrations:()=>N});let t={opds:[{name:"2026052701_opds_source_mappings",sql:`
        CREATE TABLE IF NOT EXISTS opds_source_mappings (
          catalog_id TEXT NOT NULL,
          source_url TEXT NOT NULL,
          book_hash TEXT NOT NULL,
          PRIMARY KEY (catalog_id, source_url)
        );
      `}],"hardcover-sync":[{name:"2026032901_hardcover_note_mappings",sql:`
        CREATE TABLE IF NOT EXISTS hardcover_note_mappings (
          book_hash TEXT NOT NULL,
          note_id TEXT NOT NULL,
          hardcover_journal_id INTEGER NOT NULL,
          payload_hash TEXT NOT NULL,
          synced_at INTEGER NOT NULL,
          PRIMARY KEY (book_hash, note_id)
        );

        CREATE INDEX IF NOT EXISTS idx_hardcover_note_mappings_synced_at
        ON hardcover_note_mappings (synced_at);
      `}],statistics:[{name:"2026061501_statistics_koreader_schema",sql:`
        CREATE TABLE IF NOT EXISTS book (
          id integer PRIMARY KEY autoincrement,
          title text, authors text, notes integer, last_open integer,
          highlights integer, pages integer, series text, language text,
          md5 text, total_read_time integer, total_read_pages integer
        );

        CREATE UNIQUE INDEX IF NOT EXISTS book_title_authors_md5 ON book(title, authors, md5);

        CREATE TABLE IF NOT EXISTS page_stat_data (
          id_book integer,
          page integer NOT NULL DEFAULT 0,
          start_time integer NOT NULL DEFAULT 0,
          duration integer NOT NULL DEFAULT 0,
          total_pages integer NOT NULL DEFAULT 0,
          UNIQUE (id_book, page, start_time)
        );

        CREATE INDEX IF NOT EXISTS page_stat_data_start_time ON page_stat_data(start_time);

        CREATE TABLE IF NOT EXISTS numbers (number INTEGER PRIMARY KEY);

        INSERT OR IGNORE INTO numbers(number)
          SELECT h.n * 100 + t.n * 10 + o.n + 1
          FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) o,
               (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t,
               (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) h;

        -- turso ignores IF NOT EXISTS on CREATE VIEW (READEST-13), so a plain
        -- CREATE VIEW IF NOT EXISTS still throws "already exists" when the view
        -- is present (KOReader-imported stats DB, or a partially-applied run).
        -- DROP first (turso honors DROP VIEW IF EXISTS) to stay idempotent.
        DROP VIEW IF EXISTS page_stat;

        CREATE VIEW page_stat AS
          SELECT id_book, first_page + idx - 1 AS page, start_time, duration / (last_page - first_page + 1) AS duration
          FROM (
            SELECT id_book, page, total_pages, pages, start_time, duration,
              ((page - 1) * pages) / total_pages + 1 AS first_page,
              max(((page - 1) * pages) / total_pages + 1, (page * pages) / total_pages) AS last_page,
              idx
            FROM page_stat_data
            JOIN book ON book.id = id_book
            JOIN (SELECT number as idx FROM numbers) AS N ON idx <= (last_page - first_page + 1)
          );

        CREATE TABLE IF NOT EXISTS readest_page_ext (
          book_hash text NOT NULL, page integer NOT NULL, start_time integer NOT NULL,
          ext text, PRIMARY KEY (book_hash, page, start_time)
        );

        CREATE TABLE IF NOT EXISTS readest_book_ext (
          book_hash text PRIMARY KEY, ext text
        );

        CREATE TABLE IF NOT EXISTS readest_stat_sync_state (
          key text PRIMARY KEY, value integer NOT NULL DEFAULT 0
        );
      `}],reedy:[{name:"2026052601_reedy_init",sql:`
        CREATE TABLE IF NOT EXISTS reedy_book_meta (
          book_hash TEXT PRIMARY KEY,
          indexing_status TEXT NOT NULL,
          chunk_count INTEGER NOT NULL DEFAULT 0,
          embedding_model TEXT NOT NULL,
          embedding_dim INTEGER NOT NULL,
          indexed_at INTEGER,
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS reedy_book_chunks (
          id TEXT PRIMARY KEY,
          book_hash TEXT NOT NULL,
          section_index INTEGER NOT NULL,
          chapter_title TEXT,
          start_cfi TEXT NOT NULL,
          end_cfi TEXT NOT NULL,
          position_index INTEGER NOT NULL,
          text TEXT NOT NULL,
          token_count INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_chunks_book_position
        ON reedy_book_chunks (book_hash, position_index);

        CREATE INDEX IF NOT EXISTS idx_chunks_fts
        ON reedy_book_chunks USING fts (text) WITH (tokenizer = 'ngram');
      `},{name:"2026052602_reedy_metrics",sql:`
        CREATE TABLE IF NOT EXISTS reedy_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ts INTEGER NOT NULL,
          event TEXT NOT NULL,
          book_hash TEXT,
          session_id TEXT,
          turn_id TEXT,
          message_id TEXT,
          app_version TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          payload TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_metrics_ts ON reedy_metrics (ts DESC);
        CREATE INDEX IF NOT EXISTS idx_metrics_session ON reedy_metrics (session_id, ts DESC);
      `},{name:"2026052603_reedy_memory",sql:`
        CREATE TABLE IF NOT EXISTS reedy_memory (
          id TEXT PRIMARY KEY,
          scope TEXT NOT NULL,
          scope_key TEXT NOT NULL,
          key TEXT NOT NULL,
          summary TEXT NOT NULL,
          source_message_id TEXT,
          updated_at INTEGER NOT NULL,
          UNIQUE(scope, scope_key, key)
        );

        CREATE INDEX IF NOT EXISTS idx_memory_scope
        ON reedy_memory (scope, scope_key, updated_at DESC);
      `},{name:"2026052604_reedy_skills",sql:`
        CREATE TABLE IF NOT EXISTS reedy_skills (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          instructions TEXT NOT NULL,
          tool_allowlist TEXT,
          builtin INTEGER NOT NULL DEFAULT 1,
          enabled INTEGER NOT NULL DEFAULT 1
        );
      `}]};function N(E){return t[E]??[]}}}]);
//# sourceMappingURL=8166.5db799a33dc0f4af.js.map