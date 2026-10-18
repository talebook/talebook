package library

import (
	"context"
	"database/sql"
	"path"
	"path/filepath"
	"sort"
	"strings"

	"talebook/booksvr/internal/sourcefile"
)

type BookDirectory struct {
	Path        string `json:"path"`
	Name        string `json:"name"`
	Count       int    `json:"count"`
	HasChildren bool   `json:"has_children"`
}

type bookDirectoryLocation struct {
	id       int64
	formatID int64
	dir      string
}

func readBookDirectoryLocations(ctx context.Context, db *sql.DB, libraryRoot string, excluded map[int64]bool) ([]bookDirectoryLocation, error) {
	rows, err := db.QueryContext(ctx, `SELECT f.book_id,f.id,f.path,'','' FROM book_formats f
		UNION ALL SELECT d.book,0,b.path,d.name,d.format FROM data d JOIN books b ON b.id=d.book
		WHERE NOT EXISTS(SELECT 1 FROM book_formats f WHERE f.book_id=d.book AND UPPER(f.format)=UPPER(d.format))`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	locations := []bookDirectoryLocation{}
	intern := map[string]string{}
	for rows.Next() {
		var id, formatID int64
		var file, name, format string
		if err := rows.Scan(&id, &formatID, &file, &name, &format); err != nil {
			return nil, err
		}
		if excluded[id] {
			continue
		}
		if format != "" {
			if !filepath.IsAbs(file) {
				if libraryRoot == "" {
					continue
				}
				file = filepath.Join(libraryRoot, file)
			}
			file = filepath.Join(file, name+"."+strings.ToLower(format))
		}
		if sourcefile.IsReference(file) {
			ref, e := sourcefile.Decode(file)
			if e != nil {
				continue
			}
			file = ref.Archive
		}
		file = filepath.ToSlash(file)
		if !strings.HasPrefix(file, "/") {
			continue
		}
		dir := path.Dir(file)
		if saved, ok := intern[dir]; ok {
			dir = saved
		} else {
			intern[dir] = dir
		}
		locations = append(locations, bookDirectoryLocation{id: id, formatID: formatID, dir: dir})
	}
	return locations, rows.Err()
}

func BrowseBookDirectory(ctx context.Context, db *sql.DB, libraryRoot, current string, recursive bool, excluded map[int64]bool) ([]BookDirectory, []int64, error) {
	locations, err := readBookDirectoryLocations(ctx, db, libraryRoot, excluded)
	if err != nil {
		return nil, nil, err
	}
	active, formats, err := currentBookDirectoryVisibility(ctx, db)
	if err != nil {
		return nil, nil, err
	}
	dirs, ids := groupBookDirectories(locations, current, recursive, active, excluded, formats)
	return dirs, ids, nil
}

func groupBookDirectories(locations []bookDirectoryLocation, current string, recursive bool, active, excluded map[int64]bool, activeFormats map[int64]int64) ([]BookDirectory, []int64) {
	type child struct {
		books  map[int64]bool
		nested bool
	}
	children := map[string]*child{}
	matched := map[int64]bool{}
	for _, location := range locations {
		id, dir := location.id, location.dir
		if excluded[id] || (active != nil && !active[id]) || (location.formatID > 0 && activeFormats != nil && activeFormats[location.formatID] != id) {
			continue
		}
		if current != "" && (dir == current || (recursive && strings.HasPrefix(dir, strings.TrimSuffix(current, "/")+"/"))) {
			matched[id] = true
		}
		prefix := strings.TrimSuffix(current, "/") + "/"
		if !strings.HasPrefix(dir, prefix) || dir == current {
			continue
		}
		rest := strings.TrimPrefix(dir, prefix)
		if rest == "" {
			continue
		}
		first, tail, _ := strings.Cut(rest, "/")
		childPath := prefix + first
		if children[childPath] == nil {
			children[childPath] = &child{books: map[int64]bool{}}
		}
		children[childPath].books[id] = true
		children[childPath].nested = children[childPath].nested || tail != ""
	}
	dirs := make([]BookDirectory, 0, len(children))
	for p, c := range children {
		dirs = append(dirs, BookDirectory{Path: p, Name: path.Base(p), Count: len(c.books), HasChildren: c.nested})
	}
	sort.Slice(dirs, func(i, j int) bool { return dirs[i].Path < dirs[j].Path })
	ids := make([]int64, 0, len(matched))
	for id := range matched {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] > ids[j] })
	return dirs, ids
}
