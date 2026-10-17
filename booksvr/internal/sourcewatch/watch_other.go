//go:build !linux

package sourcewatch

import (
	"context"
	"fmt"
)

type Watcher struct{}

func New(context.Context) (*Watcher, error) {
	return nil, fmt.Errorf("native watcher unavailable; using periodic reconciliation")
}
func (*Watcher) Events() <-chan struct{}       { return nil }
func (*Watcher) Changes() []string             { return nil }
func (*Watcher) Overflowed() bool              { return true }
func (*Watcher) Moves() []Move                 { return nil }
func (*Watcher) SetDirectories([]string) error { return nil }
func (*Watcher) Close()                        {}
