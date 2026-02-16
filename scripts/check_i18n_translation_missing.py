import os
import re
import json


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def flatten_json(y):
    out = {}

    def flatten(x, name=""):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + ".")
        else:
            out[name[:-1]] = x

    flatten(y)
    return out


def scan_files(root_dir):
    keys = set()
    # Regex to match $t('key') or t('key') or "key" inside t()
    # Matches: t('a.b'), $t('a.b'), i18n.t('a.b')
    # We look for [^a-zA-Z0-9_]t\(['"]... or ^t\(['"]...
    pattern = re.compile(r"(?:[^a-zA-Z0-9_]t|\$t)\(['\"]([a-zA-Z0-9_.]+)['\"]\)")

    for root, dirs, files in os.walk(root_dir):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in ["node_modules", ".nuxt", "dist", ".git", "coverage", ".output"]]

        for file in files:
            if file.endswith(".vue") or file.endswith(".js") or file.endswith(".ts"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = pattern.findall(content)
                        for match in matches:
                            keys.add(match)
                            if match == "actions.bulkDelete":
                                print(f"Found actions.bulkDelete in {path}")
                except Exception as e:
                    print(f"Error reading {path}: {e}")
    return keys


def main():
    base_dir = "/Users/bytedance/code/talebook"
    app_dir = os.path.join(base_dir, "app")
    locales_dir = os.path.join(base_dir, "app/i18n/locales")

    print(f"Scanning files in {app_dir}...")
    code_keys = scan_files(app_dir)
    print(f"Found {len(code_keys)} unique keys used in code.")

    if not os.path.exists(locales_dir):
        print(f"Error: {locales_dir} not found")
        return

    # Scan all json files in locales_dir
    json_files = [f for f in os.listdir(locales_dir) if f.endswith(".json")]

    for json_file in sorted(json_files):
        json_path = os.path.join(locales_dir, json_file)
        print(f"\nChecking {json_file}...")

        try:
            json_data = load_json(json_path)
            json_keys = flatten_json(json_data)
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
            continue

        missing = []
        for key in code_keys:
            if key not in json_keys:
                missing.append(key)

        if missing:
            print(f"Found {len(missing)} missing keys in {json_file}:")
            for key in sorted(missing):
                print(f"  - {key}")
        else:
            print(f"All keys found in {json_file}.")


if __name__ == "__main__":
    main()
