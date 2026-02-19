#!/usr/bin/env python3


import json
import logging
import unittest
import hashlib

from webserver import models


class TestUser(unittest.TestCase):
    def test_shrink_extra_size(self):
        n = 1024
        a = models.Reader()
        a.extra = {}
        a.extra["download_history"] = [{"id": 123, "title": "name", "timestamp": 1643347670}] * n
        a.shrink_column_extra()
        self.assertLess(len(json.dumps(a.extra)), 32 * 1024)

    def test_shrink_extra_size2(self):
        n = 200
        a = models.Reader()
        a.extra = {}
        a.extra["download_history"] = [{"id": 123, "title": "name", "timestamp": 1643347670}] * n
        a.shrink_column_extra()
        # should not shrink
        self.assertEqual(len(a.extra["download_history"]), n)
        
    def test_bcrypt_password_correct_verification(self):
        """测试bcrypt密码正确验证"""
        a = models.Reader()
        password = "SecureP@ssw0rd123!"
        a.set_secure_password(password)
        self.assertEqual(a.salt, "__bcrypt__")
        self.assertEqual(a.get_secure_password(password), a.password)
        
    def test_bcrypt_password_incorrect_verification(self):
        """测试bcrypt密码错误验证"""
        a = models.Reader()
        correct_password = "SecureP@ssw0rd123!"
        a.set_secure_password(correct_password)
        self.assertNotEqual(a.get_secure_password("WrongPassword123!"), a.password)
        
    def test_bcrypt_password_different_salts(self):
        """测试相同密码产生不同的bcrypt哈希（因为盐值不同）"""
        user1 = models.Reader()
        user2 = models.Reader()
        same_password = "SamePasswordForBothUsers123"
        user1.set_secure_password(same_password)
        user2.set_secure_password(same_password)
        self.assertEqual(user1.salt, "__bcrypt__")
        self.assertEqual(user2.salt, "__bcrypt__")
        self.assertNotEqual(user1.password, user2.password)
        
    def test_bcrypt_password_various_lengths(self):
        """测试各种长度密码的bcrypt加密"""
        test_passwords = [
            "a" * 8,           # 最小长度
            "MediumPass123",    # 中等长度
            "VeryLongPasswordThatIsSafe1234567890!@#$%^&*()"  # 长密码
        ]
        
        for password in test_passwords:
            a = models.Reader()
            a.set_secure_password(password)
            self.assertEqual(a.salt, "__bcrypt__")
            self.assertEqual(a.get_secure_password(password), a.password)
            
    def test_sha256_password_compatibility_exact_match(self):
        """测试SHA256+salt密码精确兼容性验证"""
        a = models.Reader()
        a.salt = models.mksalt()
        raw_password = "LegacyPassword1234"
        
        p1 = hashlib.sha256(raw_password.encode("UTF-8")).hexdigest()
        p2 = hashlib.sha256((a.salt + p1).encode("UTF-8")).hexdigest()
        a.password = p2
        
        self.assertEqual(a.get_secure_password(raw_password), a.password)
        
    def test_sha256_password_compatibility_wrong_password(self):
        """测试SHA256+salt密码错误验证"""
        a = models.Reader()
        a.salt = models.mksalt()
        correct_password = "LegacyPassword1234"
        wrong_password = "TotallyWrong9876"
        
        p1 = hashlib.sha256(correct_password.encode("UTF-8")).hexdigest()
        p2 = hashlib.sha256((a.salt + p1).encode("UTF-8")).hexdigest()
        a.password = p2
        
        self.assertNotEqual(a.get_secure_password(wrong_password), a.password)
        
    def test_sha256_password_using_original_get_secure(self):
        """使用原来的get_secure_password方法计算SHA256密码并验证"""
        a = models.Reader()
        a.salt = models.mksalt()
        raw_password = "TestLegacyPassword"
        
        # 使用原算法计算
        p1 = hashlib.sha256(raw_password.encode("UTF-8")).hexdigest()
        expected_hash = hashlib.sha256((a.salt + p1).encode("UTF-8")).hexdigest()
        
        # 使用我们的get_secure_password验证是否相同
        a.password = expected_hash
        self.assertEqual(a.get_secure_password(raw_password), expected_hash)
        
    def test_get_active_code_bcrypt_user(self):
        """测试bcrypt用户的get_active_code方法"""
        import datetime
        a = models.Reader()
        a.create_time = datetime.datetime(2023, 1, 1, 12, 0, 0)
        a.salt = "__bcrypt__"
        
        active_code = a.get_active_code()
        self.assertTrue(active_code)
        
        # 确保激活码是SHA256格式（64字符十六进制）
        self.assertEqual(len(active_code), 64)
        
    def test_get_active_code_sha256_user(self):
        """测试SHA256用户的get_active_code方法"""
        import datetime
        a = models.Reader()
        a.create_time = datetime.datetime(2023, 1, 1, 12, 0, 0)
        a.salt = models.mksalt()
        
        active_code = a.get_active_code()
        self.assertTrue(active_code)
        
        # 确保激活码是SHA256格式（64字符十六进制）
        self.assertEqual(len(active_code), 64)
        
    def test_empty_password_rejection(self):
        """测试空密码在两种模式下都不会匹配"""
        a = models.Reader()
        
        # bcrypt模式
        a.set_secure_password("ValidPassword123")
        self.assertNotEqual(a.get_secure_password(""), a.password)
        
        # SHA256模式
        b = models.Reader()
        b.salt = models.mksalt()
        correct_password = "ValidLegacyPassword"
        p1 = hashlib.sha256(correct_password.encode("UTF-8")).hexdigest()
        p2 = hashlib.sha256((b.salt + p1).encode("UTF-8")).hexdigest()
        b.password = p2
        
        self.assertNotEqual(b.get_secure_password(""), b.password)
        
    def test_password_special_characters(self):
        """测试包含特殊字符的密码"""
        special_passwords = [
            'Pass!@#$%^&*()_+',
            'Pass"\\|[]{}:;\'<>?,./',
            'Pass with space 123',
            'Pass中文测试',
        ]
        
        for password in special_passwords:
            # bcrypt模式测试
            a = models.Reader()
            a.set_secure_password(password)
            self.assertEqual(a.get_secure_password(password), a.password)
            
            # SHA256模式测试
            b = models.Reader()
            b.salt = models.mksalt()
            p1 = hashlib.sha256(password.encode("UTF-8")).hexdigest()
            p2 = hashlib.sha256((b.salt + p1).encode("UTF-8")).hexdigest()
            b.password = p2
            self.assertEqual(b.get_secure_password(password), b.password)

    def test_migrate_password_from_sha256_to_bcrypt(self):
        """测试密码从 SHA256 迁移到 bcrypt"""
        a = models.Reader()
        a.salt = models.mksalt()
        raw_password = "LegacyPassword1234"
        
        # 设置 SHA256 密码
        p1 = hashlib.sha256(raw_password.encode("UTF-8")).hexdigest()
        p2 = hashlib.sha256((a.salt + p1).encode("UTF-8")).hexdigest()
        a.password = p2
        
        # 验证迁移前是 SHA256
        self.assertNotEqual(a.salt, "__bcrypt__")
        
        # 执行迁移
        result = a.migrate_password(raw_password)
        
        # 验证迁移成功
        self.assertTrue(result)
        self.assertEqual(a.salt, "__bcrypt__")
        self.assertEqual(a.get_secure_password(raw_password), a.password)
        
    def test_migrate_password_already_bcrypt(self):
        """测试已经是 bcrypt 的密码不会重复迁移"""
        a = models.Reader()
        raw_password = "SecureP@ssw0rd123!"
        a.set_secure_password(raw_password)
        
        # 记录迁移前的密码
        original_password = a.password
        
        # 尝试迁移
        result = a.migrate_password(raw_password)
        
        # 验证没有进行迁移
        self.assertFalse(result)
        self.assertEqual(a.password, original_password)
        self.assertEqual(a.salt, "__bcrypt__")
        
    def test_migrate_password_wrong_password(self):
        """测试错误密码不会触发迁移"""
        a = models.Reader()
        a.salt = models.mksalt()
        correct_password = "CorrectPassword123"
        wrong_password = "WrongPassword456"
        
        # 设置 SHA256 密码
        p1 = hashlib.sha256(correct_password.encode("UTF-8")).hexdigest()
        p2 = hashlib.sha256((a.salt + p1).encode("UTF-8")).hexdigest()
        a.password = p2
        original_salt = a.salt
        
        # 使用错误密码尝试迁移
        result = a.migrate_password(wrong_password)
        
        # 验证迁移未执行
        self.assertFalse(result)
        self.assertEqual(a.salt, original_salt)
        self.assertEqual(a.password, p2)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
