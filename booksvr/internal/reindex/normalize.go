// Package reindex 提供全库归一化重算：遍历全部 book，重算
// title_norm / author_norm / work_key / edition_key，重建 works 归组，
// 并输出差异报告。
//
// 使用场景：归一化规则（繁简表、后缀识别、标点折叠）发生变更后，
// 已入库的归一化键会变陈旧，需要一次性重算，让作品归组与新规则一致。
package reindex

import (
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"talebook/booksvr/internal/library"
	"talebook/booksvr/internal/normalize"
)

// Options 控制重算行为。
type Options struct {
	// BackupPath 是数据库文件路径。非空且文件存在时，重算前会复制一份
	// 带时间戳的备份；为空或文件不存在时跳过备份（不阻断重算）。
	BackupPath string

	// Now 允许测试注入时间，为 nil 时使用 time.Now。
	Now func() time.Time
}

// Diff 是重算的差异报告。
type Diff struct {
	// BooksScanned 是扫描的 book 总数。
	BooksScanned int
	// NormalizedFieldsUpdated 是 title_norm/author_norm 被改写的 book 数。
	NormalizedFieldsUpdated int
	// EditionKeysUpdated 是 edition_key 被改写的 book 数。
	EditionKeysUpdated int
	// WorksCreated 是新建的 work 数。
	WorksCreated int
	// WorksMerged 是因归一化后 work_key 相同而被合并的 work 数。
	WorksMerged int
	// WorksSplit 是因归一化后 work_key 不同而从同一 work 拆出的 work 数。
	WorksSplit int
	// EmptyEditionKeys 是重算后 edition_key 仍为空的 book 数。
	EmptyEditionKeys int
	// BackupFile 是备份文件路径，未备份时为空。
	BackupFile string
	// BackupError 记录备份失败的原因；未要求备份或备份成功时为空。
	//
	// 它的存在让调用方能区分「没要求备份」与「要求了但失败」——
	// 后者不应被静默忽略。
	BackupError string
}

// String 输出人类可读的报告。
func (d Diff) String() string {
	var b strings.Builder
	fmt.Fprintf(&b, "归一化重算报告\n")
	fmt.Fprintf(&b, "  扫描书籍:        %d\n", d.BooksScanned)
	fmt.Fprintf(&b, "  归一化字段更新:  %d\n", d.NormalizedFieldsUpdated)
	fmt.Fprintf(&b, "  edition_key 更新: %d\n", d.EditionKeysUpdated)
	fmt.Fprintf(&b, "  新建作品:        %d\n", d.WorksCreated)
	fmt.Fprintf(&b, "  合并作品:        %d\n", d.WorksMerged)
	fmt.Fprintf(&b, "  拆分作品:        %d\n", d.WorksSplit)
	fmt.Fprintf(&b, "  空 edition_key:  %d\n", d.EmptyEditionKeys)
	if d.BackupFile != "" {
		fmt.Fprintf(&b, "  备份文件:        %s\n", d.BackupFile)
	}
	if d.BackupError != "" {
		fmt.Fprintf(&b, "  备份失败:        %s\n", d.BackupError)
	}
	return b.String()
}

// bookRow 是重算时读入的一行 book。
type bookRow struct {
	ID         int64
	Title      string
	Author     string
	WorkID     sql.NullInt64
	EditionKey sql.NullString
	TitleNorm  sql.NullString
	AuthorNorm sql.NullString
}

// ReindexNormalize 重算全库归一化键并重建作品归组。
//
// 流程：
//  1. 可选备份数据库文件；
//  2. 读入全部 book；
//  3. 逐本重算 title_norm / author_norm / edition_key，写回有变化的行；
//  4. 按新的 work_key 重建 works 归组（复用 FindOrCreateWork 的合并语义）；
//  5. 清理不再被引用的空 work；
//  6. 输出 Diff。
//
// 幂等：数据已正确时第二次运行不产生任何更新。
func ReindexNormalize(db *sql.DB, opts Options) (Diff, error) {
	var diff Diff

	// --- 1. 备份 ---
	//
	// 备份失败不阻断重算（重算是幂等的），但必须把失败原因记入 Diff，
	// 否则调用方无法区分「没要求备份」与「要求了但失败」。
	if opts.BackupPath != "" {
		backup, err := backupDatabase(opts.BackupPath, opts.now())
		if err != nil {
			diff.BackupError = err.Error()
		} else {
			diff.BackupFile = backup
		}
	}

	// --- 2. 读入全部 book ---
	rows, err := loadBooks(db)
	if err != nil {
		return diff, err
	}
	diff.BooksScanned = len(rows)

	// --- 3. 重算归一化字段 ---
	for _, b := range rows {
		titleNorm := normalize.NormalizeTitle(b.Title)
		authorNorm := normalize.NormalizeAuthor(b.Author)

		// 版本后缀必须从原始标题提取：NormalizeTitle 已经把它剥掉了。
		suffixes := normalize.ExtractVersionSuffix(
			normalize.NormalizePunct(normalize.NormalizeWidth(b.Title)),
		).Suffixes

		// 关键：books 表只存 edition_key，不单独存 publisher/pubdate/translator。
		// 因此重算时只能重建「后缀」那一段，前三段必须从现有 edition_key 原样保留，
		// 否则会把出版社/版次/译者信息抹掉。
		editionKey := rebuildEditionKey(b.EditionKey.String, suffixes)

		fieldsChanged := b.TitleNorm.String != titleNorm || b.AuthorNorm.String != authorNorm
		keyChanged := b.EditionKey.String != editionKey

		if fieldsChanged {
			if _, err := db.Exec(
				`UPDATE books SET title_norm = ?, author_norm = ? WHERE id = ?`,
				titleNorm, authorNorm, b.ID,
			); err != nil {
				return diff, fmt.Errorf("reindex: update book %d norms: %w", b.ID, err)
			}
			diff.NormalizedFieldsUpdated++
		}
		if keyChanged {
			if _, err := db.Exec(
				`UPDATE books SET edition_key = ? WHERE id = ?`,
				editionKey, b.ID,
			); err != nil {
				return diff, fmt.Errorf("reindex: update book %d edition_key: %w", b.ID, err)
			}
			diff.EditionKeysUpdated++
		}
		if editionKey == "" {
			diff.EmptyEditionKeys++
		}
	}

	// --- 4. 重建 works 归组 ---
	created, merged, split, err := regroupWorks(db, rows)
	if err != nil {
		return diff, err
	}
	diff.WorksCreated = created
	diff.WorksMerged = merged
	diff.WorksSplit = split

	// --- 5. 清理空 work ---
	if err := pruneEmptyWorks(db); err != nil {
		return diff, err
	}

	return diff, nil
}

func (o Options) now() time.Time {
	if o.Now != nil {
		return o.Now()
	}
	return time.Now()
}

// rebuildEditionKey 用新的后缀段重建 edition_key，保留原有的前三段。
//
// edition_key 形如 出版社\x1f版次\x1f译者[\x1f后缀]。
// books 表不单独存前三段，因此它们必须从现有 key 原样保留；
// 只有后缀段可以从标题重新提取。
//
// 现有 key 为空（无指纹）时，若新后缀非空则用占位符补齐前三段，
// 否则仍返回空（空指纹不自动合并的安全阀）。
func rebuildEditionKey(existing string, suffixes []string) string {
	suffixPart := ""
	if len(suffixes) > 0 {
		normalized := make([]string, 0, len(suffixes))
		for _, s := range suffixes {
			s = normalize.NormalizeTitle(s)
			if s != "" {
				normalized = append(normalized, s)
			}
		}
		suffixPart = strings.Join(normalized, ",")
	}

	if existing == "" {
		if suffixPart == "" {
			return ""
		}
		// 无原指纹但有后缀：用占位符补齐前三段，保持 key 形状稳定。
		return "-\x1f-\x1f-\x1f" + suffixPart
	}

	parts := strings.Split(existing, normalize.KeySeparator)
	if len(parts) < 3 {
		// 形状异常：不猜测，保留原值。
		return existing
	}

	base := parts[0] + normalize.KeySeparator + parts[1] + normalize.KeySeparator + parts[2]
	if suffixPart == "" {
		return base
	}
	return base + normalize.KeySeparator + suffixPart
}

// loadBooks 读入全部 book 的归一化相关字段。
func loadBooks(db *sql.DB) ([]bookRow, error) {
	rows, err := db.Query(
		`SELECT id, title, author_sort, work_id, edition_key, title_norm, author_norm
		 FROM books ORDER BY id`,
	)
	if err != nil {
		return nil, fmt.Errorf("reindex: load books: %w", err)
	}
	defer rows.Close()

	var out []bookRow
	for rows.Next() {
		var b bookRow
		if err := rows.Scan(
			&b.ID, &b.Title, &b.Author, &b.WorkID, &b.EditionKey, &b.TitleNorm, &b.AuthorNorm,
		); err != nil {
			return nil, fmt.Errorf("reindex: scan book: %w", err)
		}
		out = append(out, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("reindex: iterate books: %w", err)
	}
	return out, nil
}

// regroupWorks 按重算后的 work_key 重建归组。
//
// 返回 (新建 work 数, 合并 work 数, 拆分 work 数)。
//
// 语义：
//   - 同一 work_key 的多本书必须归入同一个 work（合并）；
//   - 同一 work 下的书若 work_key 不同，必须分属不同 work（拆分）。
func regroupWorks(db *sql.DB, books []bookRow) (created, merged, split int, err error) {
	// 记录每个 work 原本包含哪些 work_key，用于判定合并/拆分。
	originalKeys := map[int64]map[string]bool{}
	for _, b := range books {
		if !b.WorkID.Valid {
			continue
		}
		key := normalize.WorkKey(b.Title, b.Author)
		if originalKeys[b.WorkID.Int64] == nil {
			originalKeys[b.WorkID.Int64] = map[string]bool{}
		}
		originalKeys[b.WorkID.Int64][key] = true
	}

	// 逐本归位：FindOrCreateWork 按 work_key 找或建，天然实现合并。
	before := map[int64]bool{}
	for _, b := range books {
		if b.WorkID.Valid {
			before[b.WorkID.Int64] = true
		}
	}

	assigned := map[int64]int64{} // bookID -> new workID
	for _, b := range books {
		workID, err := library.FindOrCreateWork(db, b.Title, b.Author)
		if err != nil {
			return 0, 0, 0, fmt.Errorf("reindex: regroup book %d: %w", b.ID, err)
		}
		assigned[b.ID] = workID
	}

	// 统计新建的 work（不在 before 集合里的）
	after := map[int64]bool{}
	for _, workID := range assigned {
		after[workID] = true
	}
	for workID := range after {
		if !before[workID] {
			created++
		}
	}

	// 统计拆分：某个原 work 下原本含多个不同 work_key，
	// 重算后这些书必然分属不同 work。
	for _, keys := range originalKeys {
		if len(keys) <= 1 {
			continue
		}
		split++
	}

	// 统计合并：多个原 work 的书现在共享同一个新 work
	newWorkToOldWorks := map[int64]map[int64]bool{}
	for _, b := range books {
		if !b.WorkID.Valid {
			continue
		}
		newID := assigned[b.ID]
		if newWorkToOldWorks[newID] == nil {
			newWorkToOldWorks[newID] = map[int64]bool{}
		}
		newWorkToOldWorks[newID][b.WorkID.Int64] = true
	}
	for _, olds := range newWorkToOldWorks {
		if len(olds) > 1 {
			merged += len(olds) - 1
		}
	}

	// 写回 work_id
	for _, b := range books {
		newID := assigned[b.ID]
		if b.WorkID.Valid && b.WorkID.Int64 == newID {
			continue
		}
		if _, err := db.Exec(`UPDATE books SET work_id = ? WHERE id = ?`, newID, b.ID); err != nil {
			return 0, 0, 0, fmt.Errorf("reindex: set book %d work_id: %w", b.ID, err)
		}
	}

	return created, merged, split, nil
}

// pruneEmptyWorks 删除不再被任何 book 引用的 work。
func pruneEmptyWorks(db *sql.DB) error {
	if _, err := db.Exec(
		`DELETE FROM works WHERE id NOT IN (SELECT DISTINCT work_id FROM books WHERE work_id IS NOT NULL)`,
	); err != nil {
		return fmt.Errorf("reindex: prune empty works: %w", err)
	}
	return nil
}

// backupDatabase 把数据库文件复制一份带时间戳的备份，返回备份路径。
//
// 文件不存在时返回空字符串与 nil（调用方据此跳过备份）。
func backupDatabase(path string, now time.Time) (string, error) {
	src, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("reindex: open db for backup: %w", err)
	}
	defer src.Close()

	info, err := src.Stat()
	if err != nil {
		return "", fmt.Errorf("reindex: stat db: %w", err)
	}
	if info.IsDir() {
		return "", fmt.Errorf("reindex: backup path %q is a directory", path)
	}

	backupPath := fmt.Sprintf("%s.%s.bak", path, now.Format("20060102-150405"))

	dst, err := os.Create(backupPath)
	if err != nil {
		return "", fmt.Errorf("reindex: create backup: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("reindex: copy backup: %w", err)
	}
	if err := dst.Sync(); err != nil {
		return "", fmt.Errorf("reindex: sync backup: %w", err)
	}

	abs, err := filepath.Abs(backupPath)
	if err != nil {
		return backupPath, nil
	}
	return abs, nil
}
