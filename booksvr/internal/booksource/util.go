package booksource

import (
	"strconv"
	"time"
)

// itoa 是 strconv.Itoa 的短别名，用于页码等小整数。
func itoa(v int) string { return strconv.Itoa(v) }

// timeDuration 是 time.Duration 的别名，避免与字段名冲突。
type timeDuration = time.Duration

// secondsToDuration 把秒数转为 time.Duration；非正数返回 0。
func secondsToDuration(seconds float64) time.Duration {
	if seconds <= 0 {
		return 0
	}
	return time.Duration(seconds * float64(time.Second))
}
