#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DATA_DIR=${TALEBOOK_DATA_DIR:-/data}
VENV_DIR=${TALEBOOK_VENV_DIR:-$ROOT_DIR/.venv}
HOST=${TALEBOOK_HOST:-127.0.0.1}
PORT=${TALEBOOK_PORT:-8080}
RUN_DIR=$DATA_DIR/run
LOG_DIR=$DATA_DIR/log
PID_FILE=$RUN_DIR/talebook.pid
LOG_FILE=$LOG_DIR/talebook.log

is_running() {
    [ -s "$PID_FILE" ] || return 1
    pid=$(sed -n '1p' "$PID_FILE")
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

start() {
    if is_running; then
        echo "Talebook is already running (PID $pid)"
        return 0
    fi

    # Some older PRoot builds misreport executable checks that use statx.
    # Existence plus the real exec below gives a reliable error without it.
    if [ ! -e "$VENV_DIR/bin/python" ]; then
        echo "Missing Python environment: $VENV_DIR" >&2
        echo "Create it with: python3 -m venv --system-site-packages '$VENV_DIR'" >&2
        return 1
    fi

    mkdir -p "$RUN_DIR" "$LOG_DIR"
    cd "$ROOT_DIR"
    nohup "$VENV_DIR/bin/python" server.py \
        --host="$HOST" \
        --port="$PORT" \
        --log-file-prefix="$LOG_FILE" \
        </dev/null >>"$LOG_FILE" 2>&1 &
    pid=$!
    echo "$pid" >"$PID_FILE"

    sleep 1
    if ! kill -0 "$pid" 2>/dev/null; then
        echo "Talebook failed to start; inspect $LOG_FILE" >&2
        return 1
    fi
    echo "Talebook started (PID $pid, http://$HOST:$PORT)"
}

stop() {
    if ! is_running; then
        echo "Talebook is not running"
        return 0
    fi

    kill "$pid"
    count=0
    while kill -0 "$pid" 2>/dev/null && [ "$count" -lt 30 ]; do
        sleep 1
        count=$((count + 1))
    done
    if kill -0 "$pid" 2>/dev/null; then
        echo "Talebook did not stop within 30 seconds (PID $pid)" >&2
        return 1
    fi
    rm -f "$PID_FILE"
    echo "Talebook stopped"
}

status() {
    if is_running; then
        echo "Talebook is running (PID $pid, http://$HOST:$PORT)"
    else
        echo "Talebook is not running"
        return 1
    fi
}

case ${1:-} in
    start) start ;;
    stop) stop ;;
    restart)
        stop
        start
        ;;
    status) status ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}" >&2
        exit 2
        ;;
esac
