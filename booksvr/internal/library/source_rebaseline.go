package library

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

type SourceRootInspection struct {
	Root, Identity string
	Files          int
}

func InspectSourceRoot(ctx context.Context, root string) (SourceRootInspection, error) {
	result := SourceRootInspection{Root: filepath.Clean(root)}
	if !filepath.IsAbs(root) {
		return result, fmt.Errorf("来源必须是绝对路径")
	}
	before, err := os.Stat(root)
	if err != nil {
		return result, err
	}
	if !before.IsDir() {
		return result, fmt.Errorf("来源不是目录")
	}
	result.Identity = sourceRootIdentity(root, before)
	err = filepath.WalkDir(root, func(path string, d fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if d.Type().IsRegular() && d.Name() != ".talebook-source-health" {
			result.Files++
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	after, err := os.Stat(root)
	if err != nil {
		return result, err
	}
	if sourceRootIdentity(root, after) != result.Identity {
		return result, fmt.Errorf("核对期间目录身份变化")
	}
	if result.Files == 0 {
		return result, fmt.Errorf("空目录不能重建来源基线")
	}
	return result, nil
}

// RebaselineSourceRoot is an explicit administrative action, never an automatic
// fallback for an inaccessible root. It does not change any book availability.
func RebaselineSourceRoot(ctx context.Context, db *sql.DB, root, expected string) (SourceRootInspection, error) {
	result, err := InspectSourceRoot(ctx, root)
	if err != nil {
		return result, err
	}
	if expected == "" || expected != result.Identity {
		return result, fmt.Errorf("目录身份与管理员核对结果不一致")
	}
	marker := filepath.Join(root, ".talebook-source-health")
	token, err := os.ReadFile(marker)
	if os.IsNotExist(err) {
		token = make([]byte, 32)
		if _, err = rand.Read(token); err != nil {
			return result, err
		}
		token = []byte(hex.EncodeToString(token))
		var f *os.File
		f, err = os.OpenFile(marker, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			return result, err
		}
		_, err = f.Write(token)
		closeErr := f.Close()
		if err != nil {
			return result, err
		}
		if closeErr != nil {
			return result, closeErr
		}
	} else if err != nil {
		return result, err
	}
	if len(token) != 64 {
		return result, fmt.Errorf("目录健康标记无效，保留保护状态")
	}
	if _, err = hex.DecodeString(string(token)); err != nil {
		return result, err
	}
	after, err := os.Stat(root)
	if err != nil {
		return result, err
	}
	if sourceRootIdentity(root, after) != expected {
		return result, fmt.Errorf("提交前目录身份变化")
	}
	_, err = db.ExecContext(ctx, `INSERT INTO source_sync_roots(root,identity,token) VALUES(?,?,?) ON CONFLICT(root) DO UPDATE SET identity=excluded.identity,token=excluded.token`, filepath.Clean(root), expected, string(token))
	return result, err
}
