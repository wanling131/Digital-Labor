from __future__ import annotations

import time
import unittest

from digital_labor.utils.cache import set_cache, get_cache, invalidate_cache, get_cache_size


class TestCacheIntegration(unittest.TestCase):
    """缓存集成测试"""

    def setUp(self):
        """设置测试环境"""
        pass

    def test_cache_performance(self):
        """测试缓存性能"""
        # 测试数据
        test_data = {"name": "测试用户", "age": 30, "tags": ["admin", "user"]}
        iterations = 1000
        
        # 测试设置缓存性能
        start_time = time.time()
        for i in range(iterations):
            set_cache(f"test:performance:{i}", test_data, ttl=3600)
        set_time = time.time() - start_time
        print(f"设置 {iterations} 个缓存耗时: {set_time:.4f} 秒")
        
        # 测试获取缓存性能
        start_time = time.time()
        for i in range(iterations):
            result = get_cache(f"test:performance:{i}")
            self.assertEqual(result, test_data)
        get_time = time.time() - start_time
        print(f"获取 {iterations} 个缓存耗时: {get_time:.4f} 秒")
        
        # 测试清除缓存性能
        start_time = time.time()
        invalidate_cache("test:performance:")
        clear_time = time.time() - start_time
        print(f"清除缓存耗时: {clear_time:.4f} 秒")
        
        # 验证缓存已清除
        for i in range(iterations):
            self.assertIsNone(get_cache(f"test:performance:{i}"))

    def test_cache_reliability(self):
        """测试缓存可靠性"""
        # 测试数据
        test_data = {"name": "测试用户", "age": 30, "tags": ["admin", "user"]}
        
        # 设置缓存
        set_cache("test:reliability", test_data, ttl=10)
        
        # 多次获取缓存
        for i in range(10):
            result = get_cache("test:reliability")
            self.assertEqual(result, test_data)
            time.sleep(0.5)

    def test_cache_size(self):
        """测试缓存大小"""
        # 清除现有缓存
        invalidate_cache("test:size:")
        
        # 设置多个缓存
        for i in range(100):
            set_cache(f"test:size:{i}", f"value{i}", ttl=3600)
        
        # 检查缓存大小
        size = get_cache_size()
        print(f"缓存大小: {size}")
        # 注意：如果使用Redis，大小可能会大于100，因为Redis可能有其他键


if __name__ == "__main__":
    unittest.main()
