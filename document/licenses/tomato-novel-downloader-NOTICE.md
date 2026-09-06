Tomato Novel Downloader v2.4.15

- Upstream: https://github.com/zhongbai2333/Tomato-Novel-Downloader
- Source/tag commit: e2197970c366180bb566b8acfbda67cc1331a1ef
- Copyright (c) 2025 zhongbai2333
- License: MIT; complete text in tomato-novel-downloader-MIT.txt (installed as LICENSE).
- Talebook's Python adapter is an independent implementation of the upstream Web interface.
  No Rust code, secret API addresses or tokens are copied into the adapter.
- The optional installer downloads the unmodified Linux musl release directly from upstream.
  The executable is not included in Talebook's repository or default image.
- The adapter introduces no Python dependencies: requests is already required by Talebook
  and is licensed Apache-2.0; the installer uses only the Python standard library.
- Upstream's Cargo.toml/Cargo.lock list public Rust dependencies, but its local
  tomato-novel-official-api crate is not published in the selected source tree.
  Its implementation, transitive dependencies and separate license notices cannot be
  independently audited from this release. The upstream MIT declaration is verified;
  it is not a complete binary SBOM or proof of all embedded dependency licenses.
  This integration does not relicense upstream components or the downloaded books.
