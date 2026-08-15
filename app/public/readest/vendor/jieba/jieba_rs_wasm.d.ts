/* tslint:disable */
/* eslint-disable */
export function cut(text: string, hmm?: boolean | null): string[];
export function cut_all(text: string): string[];
export function cut_for_search(text: string, hmm?: boolean | null): string[];
export function tokenize(text: string, mode: string, hmm?: boolean | null): Token[];
export function add_word(word: string, freq?: number | null, tag?: string | null): number;
export function tag(sentence: string, hmm?: boolean | null): Tag[];
export function with_dict(dict: string): void;

/** Represents a single token with its word and position. */
export interface Token {
    word: string;
    start: number;
    end: number;
}

/** Represents a single word and its part-of-speech tag. */
export interface Tag {
    word: string;
    tag: string;
}



export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly cut: (a: number, b: number, c: number) => [number, number];
  readonly cut_all: (a: number, b: number) => [number, number];
  readonly cut_for_search: (a: number, b: number, c: number) => [number, number];
  readonly tokenize: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
  readonly add_word: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly tag: (a: number, b: number, c: number) => [number, number];
  readonly with_dict: (a: number, b: number) => [number, number];
  readonly rust_zstd_wasm_shim_qsort: (a: number, b: number, c: number, d: number) => void;
  readonly rust_zstd_wasm_shim_malloc: (a: number) => number;
  readonly rust_zstd_wasm_shim_memcmp: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_calloc: (a: number, b: number) => number;
  readonly rust_zstd_wasm_shim_free: (a: number) => void;
  readonly rust_zstd_wasm_shim_memcpy: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memmove: (a: number, b: number, c: number) => number;
  readonly rust_zstd_wasm_shim_memset: (a: number, b: number, c: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __externref_drop_slice: (a: number, b: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
