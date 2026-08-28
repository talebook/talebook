# Comic archive fixtures

`images-rar4.rar` and `images-rar5.rar` are the small image-only RAR fixtures from Komga's test suite (`komga/src/test/resources/archives/rar4.rar` and `rar5.rar`). Komga is MIT licensed. They exercise RAR directory parsing without requiring an `unrar` executable or extracting archive contents.

`encrypted.cbz` contains `komga-1.png` from the RAR4 fixture, encrypted with the test-only password `test`. It verifies that reader indexing rejects encrypted pages before extraction.
