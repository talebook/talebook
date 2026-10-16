package convert

import (
	"errors"
	"strings"
	"time"
)

// StartForReading queues one book without holding the HTTP request open. The
// queue shares the batch converter lock and deduplicates repeated reader tabs.
func (s *Service) StartForReading(id int64) {
	s.mu.Lock()
	if s.readerJobs == nil {
		s.readerJobs = make(map[int64]string)
	}
	if state, exists := s.readerJobs[id]; exists && state == "" {
		s.mu.Unlock()
		return
	}
	s.readerJobs[id] = ""
	s.readerQueue = append(s.readerQueue, id)
	if s.readerWorker {
		s.mu.Unlock()
		return
	}
	s.readerWorker = true
	s.mu.Unlock()
	go s.readingWorker()
}

func (s *Service) readingWorker() {
	for {
		s.mu.Lock()
		if len(s.readerQueue) == 0 {
			s.readerWorker = false
			s.mu.Unlock()
			return
		}
		id := s.readerQueue[0]
		s.readerQueue = s.readerQueue[1:]
		s.mu.Unlock()
		for {
			progress, err := s.ConvertAll([]int64{id})
			if errors.Is(err, ErrBusy) {
				time.Sleep(250 * time.Millisecond)
				continue
			}
			missing := false
			if err == nil && progress.Skip > 0 {
				formats, e := s.formatsOf(id)
				missing = e != nil
				hasEPUB := false
				for _, f := range formats {
					if strings.EqualFold(f, "epub") {
						hasEPUB = true
					}
				}
				missing = missing || !hasEPUB
			}
			s.mu.Lock()
			if missing || err != nil || progress.Fail > 0 {
				s.readerJobs[id] = "转换失败，请返回详情页重试或下载原文件。"
			} else {
				delete(s.readerJobs, id)
			}
			s.mu.Unlock()
			break
		}
	}
}

// ReadingError is empty while queued/running or after a successful conversion.
func (s *Service) ReadingError(id int64) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readerJobs[id]
}
