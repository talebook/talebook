#!/usr/bin/env python3
"""Compare scan SQL hot paths on synthetic SQLite records (not end-to-end import)."""

import argparse
import json
import sqlite3
import time
import tracemalloc


def elapsed(operation):
    start = time.perf_counter()
    operation()
    return round(time.perf_counter() - start, 6)


def progress(connection, aggregate):
    tracemalloc.start()
    start = time.perf_counter()
    if aggregate:
        result = dict(connection.execute("SELECT status, COUNT(id) FROM scanfiles WHERE scan_id=1 GROUP BY status").fetchall())
    else:
        rows = connection.execute("SELECT status FROM scanfiles WHERE scan_id=1").fetchall()
        result = {}
        for (status,) in rows:
            result[status] = result.get(status, 0) + 1
    seconds = time.perf_counter() - start
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return {"seconds": round(seconds, 6), "python_peak_bytes": peak, "counts": result}


def benchmark(size, probes):
    with sqlite3.connect(":memory:") as connection:
        connection.execute(
            "CREATE TABLE scanfiles (id INTEGER PRIMARY KEY, path TEXT, hash TEXT UNIQUE, "
            "status TEXT, scan_id INTEGER, import_id INTEGER)"
        )
        connection.executemany(
            "INSERT INTO scanfiles VALUES (?, ?, ?, ?, 1, 2)",
            ((n + 1, "/imports/%d.epub" % n, "sha256:%d" % n, "ready" if n % 10 == 0 else "imported") for n in range(size)),
        )
        connection.commit()

        def lookup():
            for n in range(probes):
                path = "/imports/%d.epub" % ((n * 9973) % size)
                connection.execute("SELECT id FROM scanfiles WHERE path=?", (path,)).fetchone()

        result = {
            "records": size,
            "path_probes": probes,
            "path_before_seconds": elapsed(lookup),
            "progress_before": progress(connection, False),
        }

        def indexes():
            for name, columns in [
                ("path", "path"),
                ("scan_id_status", "scan_id,status"),
                ("import_id_status", "import_id,status"),
                ("status_id", "status,id"),
            ]:
                connection.execute("CREATE INDEX ix_scanfiles_%s ON scanfiles(%s)" % (name, columns))

        result["index_build_seconds"] = elapsed(indexes)
        result["path_after_seconds"] = elapsed(lookup)
        result["progress_after"] = progress(connection, True)
        assert result["progress_before"]["counts"] == result["progress_after"]["counts"]
        return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, nargs="+", default=[10000, 100000, 1000000])
    parser.add_argument("--probes", type=int, default=100)
    args = parser.parse_args()
    if args.probes < 1 or any(size < 1 for size in args.rows):
        parser.error("rows and probes must be positive")
    for size in args.rows:
        print(json.dumps(benchmark(size, args.probes)), flush=True)
