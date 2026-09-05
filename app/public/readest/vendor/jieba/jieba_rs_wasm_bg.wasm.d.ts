/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const cut: (a: number, b: number, c: number) => [number, number];
export const cut_all: (a: number, b: number) => [number, number];
export const cut_for_search: (a: number, b: number, c: number) => [number, number];
export const tokenize: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
export const add_word: (a: number, b: number, c: number, d: number, e: number) => number;
export const tag: (a: number, b: number, c: number) => [number, number];
export const with_dict: (a: number, b: number) => [number, number];
export const rust_zstd_wasm_shim_qsort: (a: number, b: number, c: number, d: number) => void;
export const rust_zstd_wasm_shim_malloc: (a: number) => number;
export const rust_zstd_wasm_shim_memcmp: (a: number, b: number, c: number) => number;
export const rust_zstd_wasm_shim_calloc: (a: number, b: number) => number;
export const rust_zstd_wasm_shim_free: (a: number) => void;
export const rust_zstd_wasm_shim_memcpy: (a: number, b: number, c: number) => number;
export const rust_zstd_wasm_shim_memmove: (a: number, b: number, c: number) => number;
export const rust_zstd_wasm_shim_memset: (a: number, b: number, c: number) => number;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_export_2: WebAssembly.Table;
export const __externref_drop_slice: (a: number, b: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
