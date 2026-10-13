package migrate

import "time"

// Report summarises one Calibre import run.
//
// The counters are the operator's only signal about how well the automatic
// grouping performed, so every field is always populated.
type Report struct {
	// SourceBooks is how many rows the Calibre `books` table contained.
	SourceBooks int
	// Works is how many works exist after the import.
	Works int
	// Editions is how many books (editions) exist after the import.
	Editions int
	// Formats is how many format rows exist after the import.
	Formats int
	// Merged counts source books that landed in an edition that already
	// existed, i.e. the automatic grouping recognised them as duplicates.
	//
	// 它只统计「版本层」的合并，不统计格式层：重复运行同一源库时，
	// 每本书都会命中已存在的版本，Merged 会等于 SourceBooks，这是
	// 正确且可预期的（重跑本来就是幂等的）。
	Merged int
	// DuplicateFormats counts formats that already existed on their edition.
	//
	// 与 Merged 分开计数：格式重复是源库自身的问题（同一版次存了两份
	// 同名文件），与「自动归组把两本书认成同一版本」是两件事。
	// 合并计数会让重复运行看起来像发生了新的合并。
	DuplicateFormats int
	// EmptyFingerprints counts source books with no publisher/pubdate/translator.
	// Those are never auto-merged, so a high number means the automatic
	// grouping had little to work with.
	EmptyFingerprints int
	// Skipped counts source rows that could not be imported (e.g. no format).
	Skipped int
	// Duration is how long the import took.
	Duration time.Duration
}

// String renders the report for CLI output.
func (r Report) String() string {
	return "calibre import: " +
		"source=" + itoa(r.SourceBooks) +
		" works=" + itoa(r.Works) +
		" editions=" + itoa(r.Editions) +
		" formats=" + itoa(r.Formats) +
		" merged=" + itoa(r.Merged) +
		" duplicate_formats=" + itoa(r.DuplicateFormats) +
		" empty_fingerprints=" + itoa(r.EmptyFingerprints) +
		" skipped=" + itoa(r.Skipped) +
		" duration=" + r.Duration.String()
}

// itoa avoids pulling strconv into the hot path for a handful of small ints.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
