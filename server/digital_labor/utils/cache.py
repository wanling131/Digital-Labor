from __future__ import annotations

import json
import time
from typing import Any, Dict, Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None  # type: ignore
    REDIS_AVAILABLE = False


class CacheManager:
    """缓存管理器，支持内存缓存和Redis缓存"""

    def __init__(self, default_ttl: int = 60, redis_url: Optional[str] = None):
        self._cache: Dict[str, tuple[float, Any]] = {}
        self._default_ttl = default_ttl
        self._redis_client = None

        # 只有在 redis 模块可用且配置了 redis_url 时才尝试连接
        if REDIS_AVAILABLE and redis_url and redis is not None:
            try:
                self._redis_client = redis.from_url(redis_url, decode_responses=True)
                self._redis_client.ping()
            except Exception:
                # Redis连接失败，降级为内存缓存
                self._redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        # 优先使用Redis缓存
        if self._redis_client:
            try:
                value = self._redis_client.get(key)
                if value:
                    return json.loads(value)
            except Exception:
                pass
        
        # Redis失败或无值，使用内存缓存
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
        
        # 优先使用Redis缓存
        if self._redis_client:
            try:
                self._redis_client.setex(key, ttl, json.dumps(value))
                return
            except Exception:
                pass
        
        # Redis失败，使用内存缓存
        self._cache[key] = (time.time() + ttl, value)
    
    def invalidate(self, prefix: str) -> None:
        """清除指定前缀的缓存"""
        # 优先使用Redis缓存
        if self._redis_client:
            try:
                keys = self._redis_client.keys(f"{prefix}*")
                if keys:
                    self._redis_client.delete(*keys)
            except Exception:
                pass
        
        # 清除内存缓存
        keys_to_delete = [k for k in self._cache if k.startswith(prefix)]
        for k in keys_to_delete:
            del self._cache[k]
    
    def clear(self) -> None:
        """清除所有缓存"""
        # 优先使用Redis缓存
        if self._redis_client:
            try:
                self._redis_client.flushdb()
            except Exception:
                pass
        
        # 清除内存缓存
        self._cache.clear()
    
    def size(self) -> int:
        """获取缓存大小"""
        # 优先使用Redis缓存
        if self._redis_client:
            try:
                return self._redis_client.dbsize()
            except Exception:
                pass
        
        # 返回内存缓存大小
        return len(self._cache)


# 默认缓存管理器实例
import os
from digital_labor.settings import settings

redis_url = os.getenv('REDIS_URL', settings.redis_url if hasattr(settings, 'redis_url') else None)
cache_manager = CacheManager(redis_url=redis_url)


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
