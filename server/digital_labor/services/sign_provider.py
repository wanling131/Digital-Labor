"""
签名提供者接口模块。

提供抽象的签名接口，支持多种签名方式的适配：
- PdfSignProvider: 本地 PDF 签名（当前使用）
- EsignProvider: e签宝对接（预留）
"""
from __future__ import annotations

import abc
import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class SignResult:
    """签名结果。"""
    success: bool
    message: str = ""
    sign_url: Optional[str] = None  # 第三方签署链接
    evidence_id: Optional[str] = None  # 存证ID
    flow_id: Optional[str] = None  # 签署流程ID
    extra: Optional[Dict[str, Any]] = None  # 额外信息


@dataclass
class EvidenceResult:
    """存证结果。"""
    success: bool
    message: str = ""
    evidence_type: str = "本地存证"
    evidence_data: Optional[Dict[str, Any]] = None


class SignProvider(abc.ABC):
    """签名提供者抽象基类。"""

    @abc.abstractmethod
    def get_sign_url(self, contract_id: int, person_id: int, **kwargs) -> SignResult:
        """
        获取签署链接。

        Args:
            contract_id: 合同ID
            person_id: 签署人ID
            **kwargs: 额外参数

        Returns:
            SignResult: 签署结果，包含签署链接
        """
        pass

    @abc.abstractmethod
    def sign(self, contract_id: int, person_id: int, **kwargs) -> SignResult:
        """
        执行签署。

        Args:
            contract_id: 合同ID
            person_id: 签署人ID
            **kwargs: 额外参数

        Returns:
            SignResult: 签署结果
        """
        pass

    @abc.abstractmethod
    def get_evidence(self, contract_id: int) -> EvidenceResult:
        """
        获取存证信息。

        Args:
            contract_id: 合同ID

        Returns:
            EvidenceResult: 存证结果
        """
        pass

    @abc.abstractmethod
    def verify_signature(self, contract_id: int) -> Dict[str, Any]:
        """
        验证签名。

        Args:
            contract_id: 合同ID

        Returns:
            Dict: 验证结果
        """
        pass


class PdfSignProvider(SignProvider):
    """
    本地 PDF 签名提供者。

    使用本地 PDF 文件叠加签名图片的方式进行签署。
    """

    def get_sign_url(self, contract_id: int, person_id: int, **kwargs) -> SignResult:
        """本地签署不需要跳转链接，直接返回本地签署标识。"""
        return SignResult(
            success=True,
            message="使用本地签署流程",
            sign_url=None,
            extra={"local": True}
        )

    def sign(self, contract_id: int, person_id: int, **kwargs) -> SignResult:
        """
        本地签署由 contract_service.sign 函数处理。
        这里只返回成功标识，实际签署逻辑在 contract_service 中。
        """
        return SignResult(
            success=True,
            message="本地签署流程已启动"
        )

    def get_evidence(self, contract_id: int) -> EvidenceResult:
        """本地存证，返回基本信息。"""
        return EvidenceResult(
            success=True,
            message="本地存证成功",
            evidence_type="本地存证",
            evidence_data={"type": "local", "contract_id": contract_id}
        )

    def verify_signature(self, contract_id: int) -> Dict[str, Any]:
        """
        验证签名。
        实际验证逻辑在 contract_service.verify_signature 中。
        """
        return {"ok": True, "message": "请使用 contract_service.verify_signature 进行验证"}


class EsignProvider(SignProvider):
    """
    e签宝签名提供者（预留实现）。

    后续对接 e签宝 API 时实现具体逻辑。
    """

    def __init__(self, app_id: Optional[str] = None, app_secret: Optional[str] = None, api_host: Optional[str] = None):
        """
        初始化 e签宝提供者。

        Args:
            app_id: e签宝应用ID
            app_secret: e签宝应用密钥
            api_host: e签宝 API 地址
        """
        self.app_id = app_id
        self.app_secret = app_secret
        self.api_host = api_host or "https://openapi.esign.cn"
        self._configured = bool(app_id and app_secret)

    def get_sign_url(self, contract_id: int, person_id: int, **kwargs) -> SignResult:
        """获取 e签宝签署链接（预留）。"""
        if not self._configured:
            logger.warning("e签宝未配置，将使用本地签署")
            return SignResult(
                success=False,
                message="e签宝未配置",
                extra={"fallback": "local"}
            )

        # TODO: 实现 e签宝签署链接获取
        # 1. 创建签署流程
        # 2. 添加签署文档
        # 3. 添加签署方
        # 4. 获取签署链接

        logger.info("e签宝签署链接获取: contract_id=%s, person_id=%s", contract_id, person_id)
        return SignResult(
            success=False,
            message="e签宝对接尚未实现",
            extra={"fallback": "local"}
        )

    def sign(self, contract_id: int, person_id: int, **kwargs) -> SignResult:
        """执行 e签宝签署（预留）。"""
        if not self._configured:
            return SignResult(
                success=False,
                message="e签宝未配置",
                extra={"fallback": "local"}
            )

        # TODO: 实现 e签宝签署
        logger.info("e签宝签署: contract_id=%s, person_id=%s", contract_id, person_id)
        return SignResult(
            success=False,
            message="e签宝对接尚未实现",
            extra={"fallback": "local"}
        )

    def get_evidence(self, contract_id: int) -> EvidenceResult:
        """获取 e签宝存证信息（预留）。"""
        if not self._configured:
            return EvidenceResult(
                success=False,
                message="e签宝未配置"
            )

        # TODO: 实现 e签宝存证获取
        logger.info("e签宝存证获取: contract_id=%s", contract_id)
        return EvidenceResult(
            success=False,
            message="e签宝对接尚未实现"
        )

    def verify_signature(self, contract_id: int) -> Dict[str, Any]:
        """验证 e签宝签名（预留）。"""
        if not self._configured:
            return {"ok": False, "message": "e签宝未配置"}

        # TODO: 实现 e签宝签名验证
        logger.info("e签宝签名验证: contract_id=%s", contract_id)
        return {"ok": False, "message": "e签宝对接尚未实现"}


# 默认签名提供者实例
_default_provider: Optional[SignProvider] = None


def get_sign_provider() -> SignProvider:
    """
    获取签名提供者实例。

    根据配置返回相应的签名提供者：
    - 如果配置了 e签宝，返回 EsignProvider
    - 否则返回 PdfSignProvider

    Returns:
        SignProvider: 签名提供者实例
    """
    global _default_provider

    if _default_provider is not None:
        return _default_provider

    # 检查是否配置了 e签宝
    try:
        from digital_labor.settings import settings
        esign_app_id = getattr(settings, 'esign_app_id', None)
        esign_app_secret = getattr(settings, 'esign_app_secret', None)

        if esign_app_id and esign_app_secret:
            logger.info("使用 e签宝签名提供者")
            _default_provider = EsignProvider(
                app_id=esign_app_id,
                app_secret=esign_app_secret,
                api_host=getattr(settings, 'esign_api_host', None)
            )
        else:
            logger.info("使用本地 PDF 签名提供者")
            _default_provider = PdfSignProvider()
    except Exception as e:
        logger.warning("获取签名提供者配置失败，使用本地签署: %s", e)
        _default_provider = PdfSignProvider()

    return _default_provider


def set_sign_provider(provider: SignProvider) -> None:
    """
    设置签名提供者实例（用于测试或手动配置）。

    Args:
        provider: 签名提供者实例
    """
    global _default_provider
    _default_provider = provider
