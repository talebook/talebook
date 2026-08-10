# Readest source and license notice

The `/readest/` browser application included in Talebook container images is a separately built distribution of Readest, licensed under GNU AGPLv3.

- Source repository: https://github.com/hehetoshang/readest
- Exact source commit: `40aec944b890965232810394e7acf7ae03ee52c3`
- Integration pull request: https://github.com/hehetoshang/readest/pull/8
- License included beside the application: `LICENSE-AGPL-3.0.txt`

Build inputs are pinned in the Talebook `Dockerfile`:

- `hehetoshang/foliate-js` at `dd71f2be356563c16a23272686189fcfb45d0b82`
- `readest/simplecc-wasm` at `5e5b56f5b82394e7df07f9171ac70f4578b24a32`
- `readest/js-mdict` at `d01bf62af872b1fbeacb2f18446460960e7400de`

Talebook's own BSD-2-Clause license does not replace or relicense Readest or its dependencies. Operators who modify and make the embedded Readest application available over a network must satisfy the corresponding-source obligations of AGPLv3 for their modified version.
