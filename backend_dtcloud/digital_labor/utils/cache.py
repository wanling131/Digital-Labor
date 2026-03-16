from __future__ import annotations

import time
from typing import Any, Dict, Optional


class CacheManager:
    """简单的内存缓存管理器"""
    
    def __init__(self, default_ttl: int = 60):
        self._cache: Dict[str, tuple[float, Any]] = {}
        self._default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        if key in self._cache:
            exp, value = self._cache[key]
            if exp > time.time():
                return value
            # 缓存过期，删除
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """设置缓存值"""
        ttl = ttl or self._default_ttl
        self._cache[key] = (time.time() + ttl, value)
    
    def invalidate(self, prefix: str) -> None:
        """清除指定前缀的缓存"""
        keys_to_delete = [k for k in self._cache if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._cache[k]
    
    def clear(self) -> None:
        """清除所有缓存"""
        self._cache.clear()
    
    def size(self) -> int:
        """获取缓存大小"""
        return len(self._cache)


# 默认缓存管理器实例
cache_manager = CacheManager()


# 便捷函数
def get_cache(key: str) -> Optional[Any]:
    """获取缓存值"""
    return cache_manager.get(key)


def set_cache(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """设置缓存值"""
    cache_manager.set(key, value, ttl)


def invalidate_cache(prefix: str) -> None:
    """清除指定前缀的缓存"""
    cache_manager.invalidate(prefix)


def clear_cache() -> None:
    """清除所有缓存"""
    cache_manager.clear()


def get_cache_size() -> int:
    """获取缓存大小"""
    return cache_manager.size()
