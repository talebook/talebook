import os
import re
import json
import sys
import argparse


def load_json(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def flatten_json(y):
    out = {}

    def flatten(x, name=""):
        if isinstance(x, dict):
            for a in x:
                flatten(x[a], name + a + ".")
        else:
            out[name[:-1]] = x

    flatten(y)
    return out


def find_i18n_usages_in_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Matches:
    # t('key') or t("key") or t(`key`)
    # $t('key') ...
    # keypath="key"
    # Capture the content inside the quotes
    patterns = [
        r"(?:^|[^\w])t\(\s*(['\"`])(.*?)\1\s*[\),]",
        r"\$t\(\s*(['\"`])(.*?)\1\s*[\),]",
        r"keypath=(['\"])(.*?)\1",
    ]

    usages = []  # list of (line_num, line_content, raw_key, quote_char)
    for i, line in enumerate(lines):
        for pattern in patterns:
            # re.findall might not be enough if we want to capture multiple groups correctly
            # use finditer
            for match in re.finditer(pattern, line):
                quote_char = match.group(1)
                raw_key = match.group(2)
                usages.append((i + 1, line.strip(), raw_key, quote_char))

    return usages


def scan_directory(root_dir):
    all_usages = []
    exclude_dirs = {"node_modules", ".nuxt", ".output", "public", "dist", "coverage"}

    for root, dirs, files in os.walk(root_dir):
        # Modify dirs in-place to exclude unwanted directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]

        for file in files:
            file_path = os.path.join(root, file)
            # Extra safety check
            if any(part in file_path.split(os.sep) for part in exclude_dirs):
                continue

            if file.endswith((".vue", ".js", ".ts")):
                file_usages = find_i18n_usages_in_file(file_path)
                for line_num, line_content, raw_key, quote_char in file_usages:
                    all_usages.append(
                        {
                            "file_path": file_path,
                            "line_num": line_num,
                            "line_content": line_content,
                            "raw_key": raw_key,
                            "quote_char": quote_char,
                        }
                    )
    return all_usages


def check_json_file(json_path, usage_map, args, base_dir):
    filename = os.path.basename(json_path)
    print(f"\n" + "=" * 60)
    print(f"Checking {filename}...")
    print("=" * 60)

    try:
        json_data = load_json(json_path)
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return

    # Flatten JSON to get all defined keys
    all_defined_keys = flatten_json(json_data)
    print(f"Found {len(all_defined_keys)} translation keys defined in {filename}.")

    unused_keys = []

    # Iterate through all keys defined in JSON
    for key in sorted(all_defined_keys.keys()):
        value = all_defined_keys[key]

        # Check if used in code (exact match)
        if key in usage_map:
            if args.verbose:
                print(f"[USED] {key}: {value}")
                # Print usages
                for u in usage_map[key][:1]:  # Just show first usage
                    rel_path = os.path.relpath(u["file_path"], base_dir)
                    print(f"       -> {rel_path}:{u['line_num']} | {u['line_content'].strip()}")
                if len(usage_map[key]) > 1:
                    print(f"       -> ... and {len(usage_map[key]) - 1} more locations")
        else:
            is_covered_by_dynamic = False
            for u_key in usage_map.keys():
                # If usage key contains ${} or ends with dot, it might cover this key
                if "${" in u_key or u_key.endswith("."):
                    # Try to match prefix
                    prefix = u_key.split("${")[0]
                    if prefix and key.startswith(prefix):
                        is_covered_by_dynamic = True
                        break

            if is_covered_by_dynamic:
                if args.verbose:
                    print(f"[DYNAMIC?] {key}: {value}")
                    print(f"       -> Covered by dynamic usage pattern")
            else:
                print(f"[UNUSED?] {key}: {value}")
                unused_keys.append(key)

    if unused_keys:
        print(f"Found {len(unused_keys)} potentially unused keys in {filename} (no exact match found in code):")
        for k in unused_keys:
            print(f"  - {k}")
        print("\nNote: Some keys might be used dynamically (e.g. t('prefix.' + var)).")
    else:
        print(f"All defined keys in {filename} seem to be used!")


def main():
    parser = argparse.ArgumentParser(description="Check i18n keys against JSON translation file.")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show ignored/dynamic keys")
    args = parser.parse_args()

    base_dir = "/Users/bytedance/code/talebook"
    app_dir = os.path.join(base_dir, "app")
    locales_dir = os.path.join(base_dir, "app/i18n/locales")

    print(f"Scanning files in {app_dir}...")
    usages = scan_directory(app_dir)
    print(f"Found {len(usages)} usages of t()/$t()/keypath.")

    # Map raw_key -> list of usages
    usage_map = {}
    for u in usages:
        k = u["raw_key"]
        if k not in usage_map:
            usage_map[k] = []
        usage_map[k].append(u)

    if not os.path.exists(locales_dir):
        print(f"Error: {locales_dir} not found")
        return

    json_files = [f for f in os.listdir(locales_dir) if f.endswith(".json")]
    for json_file in sorted(json_files):
        check_json_file(os.path.join(locales_dir, json_file), usage_map, args, base_dir)


if __name__ == "__main__":
    main()
