package sourcewatch

import (
	"context"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unsafe"

	"golang.org/x/sys/unix"
)

type Watcher struct {
	fd       int
	mu       sync.Mutex
	paths    map[string]int
	names    map[int]string
	changes  map[string]bool
	overflow bool
	pending  map[uint32]string
	moves    []Move
	events   chan struct{}
	cancel   context.CancelFunc
	done     chan struct{}
}

func New(parent context.Context) (*Watcher, error) {
	fd, err := unix.InotifyInit1(unix.IN_NONBLOCK | unix.IN_CLOEXEC)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithCancel(parent)
	w := &Watcher{fd: fd, paths: map[string]int{}, names: map[int]string{}, changes: map[string]bool{}, pending: map[uint32]string{}, events: make(chan struct{}, 1), cancel: cancel, done: make(chan struct{})}
	go func() {
		defer close(w.done)
		ticker := time.NewTicker(100 * time.Millisecond)
		defer ticker.Stop()
		buffer := make([]byte, 64<<10)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				n, err := unix.Read(fd, buffer)
				if n > 0 {
					w.recordEvents(buffer[:n])
				}
				if n > 0 || err != nil && err != unix.EAGAIN {
					select {
					case w.events <- struct{}{}:
					default:
					}
				}
			}
		}
	}()
	return w, nil
}
func (w *Watcher) Events() <-chan struct{} { return w.events }
func (w *Watcher) Changes() []string {
	w.mu.Lock()
	defer w.mu.Unlock()
	out := make([]string, 0, len(w.changes))
	for path := range w.changes {
		out = append(out, path)
	}
	w.changes = map[string]bool{}
	return out
}
func (w *Watcher) Overflowed() bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	overflow := w.overflow
	w.overflow = false
	return overflow
}
func (w *Watcher) Moves() []Move {
	w.mu.Lock()
	defer w.mu.Unlock()
	moves := w.moves
	w.moves = nil
	return moves
}
func (w *Watcher) recordEvents(buffer []byte) {
	w.mu.Lock()
	defer w.mu.Unlock()
	for offset := 0; offset+unix.SizeofInotifyEvent <= len(buffer); {
		event := (*unix.InotifyEvent)(unsafe.Pointer(&buffer[offset]))
		end := offset + unix.SizeofInotifyEvent + int(event.Len)
		if end > len(buffer) {
			w.overflow = true
			break
		}
		if event.Mask&unix.IN_Q_OVERFLOW != 0 {
			w.overflow = true
			w.pending = map[uint32]string{}
			w.moves = nil
		}
		if parent := w.names[int(event.Wd)]; parent != "" {
			name := strings.TrimRight(string(buffer[offset+unix.SizeofInotifyEvent:end]), "\x00")
			path := filepath.Join(parent, name)
			w.changes[path] = true
			if event.Mask&unix.IN_MOVED_FROM != 0 && event.Cookie != 0 {
				w.pending[event.Cookie] = path
			}
			if event.Mask&unix.IN_MOVED_TO != 0 && event.Cookie != 0 {
				if old, ok := w.pending[event.Cookie]; ok {
					w.moves = append(w.moves, Move{old, path})
					delete(w.pending, event.Cookie)
				}
			}
			if event.Mask&(unix.IN_DELETE|unix.IN_CREATE) != 0 {
				kept := w.moves[:0]
				for _, move := range w.moves {
					if move.To != path && !strings.HasPrefix(move.To, path+string(filepath.Separator)) {
						kept = append(kept, move)
					}
				}
				w.moves = kept
			}
			if len(w.pending) > 8192 || len(w.moves) > 8192 {
				w.pending = map[uint32]string{}
				w.moves = nil
				w.overflow = true
			}
		}
		offset = end
	}
}
func (w *Watcher) SetDirectories(paths []string) error {
	w.mu.Lock()
	defer w.mu.Unlock()
	wanted := map[string]bool{}
	var first error
	for _, path := range paths {
		wanted[path] = true
	}
	// A renamed directory keeps its watch descriptor. Remove obsolete path
	// aliases BEFORE adding new names, otherwise removing the old alias also
	// removes the newly added watch for that same inode.
	for path, wd := range w.paths {
		if !wanted[path] {
			unix.InotifyRmWatch(w.fd, uint32(wd))
			delete(w.paths, path)
			delete(w.names, wd)
		}
	}
	for _, path := range paths {
		wd, err := unix.InotifyAddWatch(w.fd, path, unix.IN_CREATE|unix.IN_DELETE|unix.IN_MOVED_FROM|unix.IN_MOVED_TO|unix.IN_DELETE_SELF|unix.IN_MOVE_SELF|unix.IN_UNMOUNT|unix.IN_CLOSE_WRITE|unix.IN_ATTRIB)
		if err != nil {
			if first == nil {
				first = err
			}
			continue
		}
		w.paths[path] = wd
		w.names[wd] = path
	}
	return first
}
func (w *Watcher) Close() { w.cancel(); <-w.done; unix.Close(w.fd) }
