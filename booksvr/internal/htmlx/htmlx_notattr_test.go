package htmlx

import "testing"

// TestSelectNotPlusAttr 覆盖 `a:not([class])[href*="x"]` 两种书写顺序。
func TestSelectNotPlusAttr(t *testing.T) {
	const h = `<html><body>` +
		`<a href="authorarticle.php?author=x">AuthorX</a>` +
		`<a class="c" href="authorarticle.php?author=y">AuthorY</a>` +
		`<a href="other.php">Other</a>` +
		`</body></html>`
	doc, err := Parse(h)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	for _, sel := range []string{
		`a:not([class])[href*="authorarticle.php"]`,
		`a[href*="authorarticle.php"]:not([class])`,
	} {
		got := doc.SelectOne(sel)
		if got == nil || got.Text() != "AuthorX" {
			t.Errorf("SelectOne(%q) = %v", sel, got)
		}
	}
}
