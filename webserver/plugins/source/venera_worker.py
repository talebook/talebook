"""Isolated QuickJS worker. HTTP requests cross a bounded JSON pipe to the host."""

import json
import resource
import sys

import quickjs


def main():
    resource.setrlimit(resource.RLIMIT_CPU, (3, 4))
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    payload = json.loads(sys.stdin.readline())
    ctx = quickjs.Context()
    ctx.set_memory_limit(48 * 1024 * 1024)
    ctx.set_max_stack_size(512 * 1024)
    ctx.set_time_limit(0.3)
    ctx.set("__input_json", json.dumps(payload["input"]))
    ctx.eval("const __input = JSON.parse(__input_json);")
    ctx.eval(payload["host"])
    ctx.eval(payload["source"] + "\nconst source = new MangaDex();")
    ctx.eval(
        "__run(source).then(value => {__result = {result: value}}, "
        "error => {__result = {error: true, requestId: error?.__requestId}});"
    )
    for _ in range(10000):
        # Every job retains the QuickJS execution limit; no Python callback is exposed.
        if ctx.execute_pending_job():
            continue
        result = ctx.eval("JSON.stringify(__result)")
        if result is not None:
            print(result, flush=True)
            return
        requests = json.loads(ctx.eval("JSON.stringify(__requests.splice(0))"))
        if not requests:
            raise ValueError("Unresolved source operation")
        for request in requests:
            print(json.dumps({"request": request}), flush=True)
            reply = sys.stdin.readline()
            if not reply:
                return
            ctx.set("__reply_json", reply)
            ctx.eval("var __reply = JSON.parse(__reply_json); __deliver();")
    raise ValueError("Source job limit exceeded")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never print source code, upstream bodies, headers or exception text.
        print(json.dumps({"error": True}), flush=True)
