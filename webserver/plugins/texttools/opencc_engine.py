# -*- coding: utf-8 -*-

##########################################################
# Author: Yichen Huang (Eugene)
# GitHub: https://github.com/yichen0831/opencc-python
# January, 2016
##########################################################

##########################################################
# Revised by: Hopkins
# December, 2022
# Apache License Version 2.0, January 2004
# - Use a tree-like structure hold the result during conversion
# - Always choose the longest matching string from left to right in dictionary
#   by trying lookups in the dictionary rather than looping
# - Split the incoming string into smaller strings before processing to improve speed
# - Only match once per dictionary
# - If a dictionary is configured as part of a group, only match once per group
#   in order of the listed dictionaries
# - Cache the results of reading a dictionary in self.dict_cache
##########################################################

##########################################################
# 繁简转换工具移植说明（Apache License 2.0）
# - 从 Hopkins1/TradSimpChinese (calibre 插件) 中移植 opencc-python 引擎，
#   去掉 calibre 的资源加载抽象，改为直接读取本包 config/ 与 dictionary/ 目录。
# - 新增 extra_dicts 参数：将额外字典注入每个转换链 group 的“最前位置”，
#   用于“增强词表”（a5566123s 个人修正版）优先于 OpenCC 默认词表匹配。
# - 字典与配置数据来自 OpenCC (https://github.com/BYVoid/OpenCC)，Apache License 2.0。
##########################################################

import json
import os
import re

_PKG_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_DIR = os.path.join(_PKG_DIR, "config")
DICT_DIR = os.path.join(_PKG_DIR, "dictionary")

# 支持的全部转换方向（与 config/ 下 json 文件名一致）
DIRECTIONS = ("hk2s", "hk2sp", "hk2t", "jp2t", "s2hk", "s2hkp", "s2t", "s2tw",
              "s2twp", "t2hk", "t2jp", "t2s", "t2tw", "tw2s", "tw2sp", "tw2t")
# 本工具实际内置的字典/配置（仅中文繁简相关）
BUILTIN_DIRECTIONS = ("t2s", "tw2s", "tw2sp", "s2t", "s2tw", "s2twp", "t2tw", "tw2t")

# 方向 → 展示文案（成功消息等场景使用，与 8 个内置方向一一对应）
DIRECTION_LABELS = {
    "t2s": "繁体→简体",
    "tw2s": "台湾繁体→简体",
    "tw2sp": "台湾繁体（含台湾用词）→简体",
    "s2t": "简体→繁体",
    "s2tw": "简体→台湾繁体",
    "s2twp": "简体→台湾繁体（含台湾用词）",
    "t2tw": "繁体→台湾繁体",
    "tw2t": "台湾繁体→繁体",
}


class OpenCC:
    """OpenCC 纯 Python 实现（无第三方依赖）。

    :param conversion: 转换方向，如 't2s' / 's2t' / 'tw2s' / 's2tw' / 'tw2sp' /
        's2twp' / 't2tw' / 'tw2t'
    :param extra_dicts: 可选，附加字典的绝对路径列表；每个字典按
        OpenCC 字典格式（``key\\tvalue``）组织，会被注入各转换链
        group 的最前位置（优先匹配，同名键覆盖默认词表）。
    """

    # 类级字典缓存：多实例共享，避免重复读取大字典
    _class_dict_cache = {}

    def __init__(self, conversion=None, extra_dicts=None):
        self.conversion_name = ""
        self.conversion = conversion
        self._dict_init_done = False
        self._dict_chain_data = list()
        # 统一为绝对路径，避免被当作 dictionary/ 目录下的相对文件名
        self.extra_dicts = [os.path.abspath(d) for d in (extra_dicts or [])]
        # List of sentence separators from OpenCC PhraseExtract.cpp. None of
        # these separators are allowed as part of a dictionary entry
        self.split_chars_re = re.compile(
            r'(\s+|-|,|\.|\?|!|\*|　|，|。|、|；|：|？|！|…|“|”|‘|’|『|』|「|」|﹁|﹂|—|－|（|）|《|》|〈|〉|～|．|／|＼|︒|︑|︔|︓|︿|﹀|︹|︺|︙|︐|［|﹇|］|﹈|︕|︖|︰|︳|︴|︽|︾|︵|︶|｛|︷|｝|︸|﹃|﹄|【|︻|】|︼|—|， |： |︲|～)')
        if self.conversion is not None:
            self._init_dict()

    def convert(self, string):
        """将字符串从源语种转换为目标语种。"""
        if self.conversion == "no_conversion":
            return string

        if not self._dict_init_done:
            self._init_dict()
            self._dict_init_done = True

        result = []
        # Separate string using the list of separators in a regular expression
        split_string_list = self.split_chars_re.split(string)
        for i in range(0, len(split_string_list)):
            if i % 2 == 0:
                # Work with the text string
                result.append(self._convert(split_string_list[i], self._dict_chain_data))
            else:
                # Work with the separator
                result.append(split_string_list[i])
        return "".join(result)

    def _convert(self, string, dictionary=(), is_dict_group=False):
        """按字典链转换；group 内命中即停，group 之间依次应用。"""
        tree = StringTree(string)
        for c_dict in dictionary:
            if isinstance(c_dict, tuple):
                tree.convert_tree(c_dict)
                if not is_dict_group:
                    tree = StringTree("".join(tree.inorder()))
            else:
                tree = StringTree(self._convert("".join(tree.inorder()), c_dict, True))
        return "".join(tree.inorder())

    def _init_dict(self):
        if self.conversion is None:
            raise ValueError("conversion is not set")

        config_path = os.path.join(CONFIG_DIR, self.conversion + ".json")
        if not os.path.isfile(config_path):
            raise IOError("unable to open opencc config file: %s" % config_path)
        with open(config_path, encoding="utf-8") as f:
            setting_json = json.load(f)

        self.conversion_name = setting_json.get("name")

        dict_chain = []
        for chain in setting_json.get("conversion_chain"):
            self._add_dict_chain(dict_chain, chain.get("dict"))

        # 注入增强词表：在每个 group 的最前位置插入 extra 字典
        if self.extra_dicts:
            dict_chain = self._inject_extra_dicts(dict_chain)

        self._dict_chain_data = []
        self._add_dictionaries(dict_chain, self._dict_chain_data)
        self._dict_init_done = True

    def _inject_extra_dicts(self, chain_list):
        """把 extra_dicts 递归插入所有 group 开头；非 group 的字典项包成单元素 group。"""
        result = []
        for item in chain_list:
            if isinstance(item, list):
                result.append(self.extra_dicts + item)
            else:
                result.append(self.extra_dicts + [item])
        return result

    def _add_dictionaries(self, chain_list, chain_data):
        for item in chain_list:
            if isinstance(item, list):
                chain = []
                self._add_dictionaries(item, chain)
                chain_data.append(chain)
            else:
                if isinstance(item, str) and os.path.isabs(item):
                    cache_key = item
                    file_path = item
                else:
                    cache_key = item
                    file_path = os.path.join(DICT_DIR, item)
                if cache_key not in self._class_dict_cache:
                    map_dict = {}
                    max_len = 1
                    with open(file_path, encoding="utf-8") as f:
                        for line in f:
                            line = line.rstrip("\n").rstrip("\r")
                            if (len(line) == 0) or (line[0] == "#"):
                                continue
                            if "\t" not in line:
                                continue
                            key, value = line.split("\t", 1)
                            key = key.strip()
                            value = value.strip()
                            if not key or not value:
                                continue
                            map_dict[key] = value
                            if len(key) > max_len:
                                max_len = len(key)
                    chain_data.append((max_len, map_dict))
                    self._class_dict_cache[cache_key] = (max_len, map_dict)
                else:
                    chain_data.append(self._class_dict_cache[cache_key])

    def _add_dict_chain(self, dict_chain, dict_dict):
        if dict_dict.get("type") == "group":
            chain = []
            for dict_item in dict_dict.get("dicts"):
                self._add_dict_chain(chain, dict_item)
            dict_chain.append(chain)
        elif dict_dict.get("type") == "txt":
            dict_chain.append(dict_dict.get("file"))

    def set_conversion(self, conversion):
        """运行时切换转换方向；'no_conversion' 表示原样输出。"""
        if self.conversion == conversion:
            return
        elif conversion == "no_conversion":
            self.conversion = conversion
        else:
            self._dict_init_done = False
            self.conversion = conversion


class StringTree:
    """转换过程使用的树结构：最长匹配 + 左右子树递归。"""

    def __init__(self, string):
        self.string = string
        self.left = None
        self.right = None
        self.string_len = len(string)
        self.matched = False

    def convert_tree(self, test_dict):
        """从左到右尝试最长匹配；命中后剩余部分递归处理。"""
        if self.matched:
            if self.left is not None:
                self.left.convert_tree(test_dict)
            if self.right is not None:
                self.right.convert_tree(test_dict)
        else:
            test_len = min(self.string_len, test_dict[0])
            while test_len != 0:
                for i in range(0, self.string_len - test_len + 1):
                    if self.string[i:i + test_len] in test_dict[1]:
                        if i > 0:
                            self.left = StringTree(self.string[:i])
                            self.left.convert_tree(test_dict)
                        if (i + test_len) < self.string_len:
                            self.right = StringTree(self.string[i + test_len:])
                            self.right.convert_tree(test_dict)
                        value = test_dict[1][self.string[i:i + test_len]]
                        if len(value.split(" ")) > 1:
                            # multiple mapping, use the first one for now
                            value = value.split(" ")[0]
                        self.string = value
                        self.string_len = len(self.string)
                        self.matched = True
                        return
                test_len -= 1

    def inorder(self):
        """中序遍历：还原为字符串列表。"""
        result = []
        if self.left is not None:
            result += self.left.inorder()
        result.append(self.string)
        if self.right is not None:
            result += self.right.inorder()
        return result
