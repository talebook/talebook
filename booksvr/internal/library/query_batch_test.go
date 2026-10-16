package library

import "testing"

func TestGetBooksDataExceedsSQLiteParameterLimit(t *testing.T) {
	db := newQueryDB(t)
	// The unique IDs exceed SQLite's 32766 parameter build limit, even though
	// most books are absent. Existing metadata spans multiple batch boundaries.
	ids := make([]int64, 40000)
	for i := range ids {
		ids[i] = int64(i + 1)
	}
	ids[0], ids[1500] = ids[1500], ids[0]
	ids[1], ids[39999] = ids[39999], ids[1]
	ids = append(ids, 1, 2, 3)
	books, err := GetBooksData(db, ids)
	if err != nil {
		t.Fatal(err)
	}
	if len(books) != 3 || books[0].ID != 3 || books[1].ID != 1 || books[2].ID != 2 {
		t.Fatalf("order/dedup/missing IDs: %+v", books)
	}
	b := books[1]
	if b.Title != "三体" || len(b.Authors) != 1 || b.Authors[0] != "刘慈欣" || len(b.Tags) != 1 || b.Publisher != "重庆出版社" || b.Series != "三体" || b.Rating != 8 || b.Language != "zho" || b.ISBN != "9787536692930" || b.Comments == "" || len(b.Formats) != 1 || b.Formats[0] != "EPUB" {
		t.Fatalf("metadata lost: %+v", b)
	}
}
