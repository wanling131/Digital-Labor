from __future__ import annotations

import time
import unittest

from digital_labor.utils.cache import (
    CacheManager,
    get_cache,
    set_cache,
    invalidate_cache,
    clear_cache,
    get_cache_size,
)


class TestCacheManager(unittest.TestCase):
    """缓存管理器单元测试"""

    def setUp(self):
        """设置测试环境"""
        # 创建内存缓存管理器（不使用Redis）
        self.cache_manager = CacheManager(redis_url=None)
        # 清除现有缓存
        clear_cache()

    def test_basic_get_set(self):
        """测试基本的get/set操作"""
        # 测试内存缓存
        self.cache_manager.set("test_key", "test_value")
        self.assertEqual(self.cache_manager.get("test_key"), "test_value")

        # 测试便捷函数
        set_cache("test_key2", "test_value2")
        self.assertEqual(get_cache("test_key2"), "test_value2")

    def test_cache_expiry(self):
        """测试缓存过期"""
        # 设置一个短过期时间的缓存
        self.cache_manager.set("expiring_key", "expiring_value", ttl=1)
        self.assertEqual(self.cache_manager.get("expiring_key"), "expiring_value")
        
        # 等待过期
        time.sleep(1.1)
        self.assertIsNone(self.cache_manager.get("expiring_key"))

    def test_invalidate_prefix(self):
        """测试前缀清除"""
        # 设置多个带相同前缀的缓存
        self.cache_manager.set("user:1:name", "Alice")
        self.cache_manager.set("user:1:age", 30)
        self.cache_manager.set("user:2:name", "Bob")
        self.cache_manager.set("product:1:name", "Product 1")

        # 清除user前缀的缓存
        self.cache_manager.invalidate("user:")

        # 验证user前缀的缓存已清除
        self.assertIsNone(self.cache_manager.get("user:1:name"))
        self.assertIsNone(self.cache_manager.get("user:1:age"))
        self.assertIsNone(self.cache_manager.get("user:2:name"))
        # 验证其他前缀的缓存未受影响
        self.assertEqual(self.cache_manager.get("product:1:name"), "Product 1")

    def test_clear_all(self):
        """测试清除所有缓存"""
        # 设置多个缓存
        self.cache_manager.set("key1", "value1")
        self.cache_manager.set("key2", "value2")
        self.assertEqual(self.cache_manager.size(), 2)

        # 清除所有缓存
        self.cache_manager.clear()
        self.assertEqual(self.cache_manager.size(), 0)
        self.assertIsNone(self.cache_manager.get("key1"))
        self.assertIsNone(self.cache_manager.get("key2"))

    def test_cache_size(self):
        """测试缓存大小获取"""
        self.assertEqual(self.cache_manager.size(), 0)
        
        self.cache_manager.set("key1", "value1")
        self.assertEqual(self.cache_manager.size(), 1)
        
        self.cache_manager.set("key2", "value2")
        self.assertEqual(self.cache_manager.size(), 2)
        
        self.cache_manager.invalidate("key1")
        self.assertEqual(self.cache_manager.size(), 1)

    def test_complex_data_types(self):
        """测试复杂数据类型"""
        # 测试字典
        test_dict = {"name": "Alice", "age": 30}
        self.cache_manager.set("test_dict", test_dict)
        self.assertEqual(self.cache_manager.get("test_dict"), test_dict)

        # 测试列表
        test_list = [1, 2, 3, 4, 5]
        self.cache_manager.set("test_list", test_list)
        self.assertEqual(self.cache_manager.get("test_list"), test_list)

        # 测试嵌套结构
        nested_data = {"user": {"name": "Bob", "tags": ["admin", "user"]}}
        self.cache_manager.set("nested_data", nested_data)
        self.assertEqual(self.cache_manager.get("nested_data"), nested_data)


if __name__ == "__main__":
    unittest.main()
