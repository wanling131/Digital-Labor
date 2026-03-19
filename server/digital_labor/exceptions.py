"""
自定义异常类，用于细化错误处理。
"""
from __future__ import annotations

from typing import Any, Dict, Optional


class DigitalLaborError(Exception):
    """基础异常类"""
    
    def __init__(
        self, 
        message: str, 
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code or "UNKNOWN_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(DigitalLaborError):
    """数据验证错误"""
    
    def __init__(self, message: str, field: Optional[str] = None):
        details = {"field": field} if field else {}
        super().__init__(message, code="VALIDATION_ERROR", details=details)


class NotFoundError(DigitalLaborError):
    """资源不存在错误"""
    
    def __init__(self, resource: str, resource_id: Optional[str] = None):
        message = f"{resource}不存在"
        if resource_id:
            message = f"{resource}(ID: {resource_id})不存在"
        details = {"resource": resource, "id": resource_id} if resource_id else {"resource": resource}
        super().__init__(message, code="NOT_FOUND", details=details)


class AuthenticationError(DigitalLaborError):
    """认证错误"""
    
    def __init__(self, message: str = "认证失败"):
        super().__init__(message, code="AUTHENTICATION_ERROR")


class AuthorizationError(DigitalLaborError):
    """授权错误"""
    
    def __init__(self, message: str = "无操作权限"):
        super().__init__(message, code="AUTHORIZATION_ERROR")


class DatabaseError(DigitalLaborError):
    """数据库错误"""
    
    def __init__(self, message: str = "数据库操作失败", original_error: Optional[Exception] = None):
        details = {"original_error": str(original_error)} if original_error else {}
        super().__init__(message, code="DATABASE_ERROR", details=details)


class ExternalServiceError(DigitalLaborError):
    """外部服务错误"""
    
    def __init__(self, service: str, message: str = "外部服务调用失败"):
        details = {"service": service}
        super().__init__(message, code="EXTERNAL_SERVICE_ERROR", details=details)


class FileProcessingError(DigitalLaborError):
    """文件处理错误"""
    
    def __init__(self, message: str, filename: Optional[str] = None):
        details = {"filename": filename} if filename else {}
        super().__init__(message, code="FILE_PROCESSING_ERROR", details=details)
