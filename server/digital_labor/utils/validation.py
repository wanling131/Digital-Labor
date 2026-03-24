"""
通用输入验证工具。
"""
from __future__ import annotations

import re
from typing import List, Optional, Set, Tuple


# 文件上传白名单
ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
ALLOWED_DOCUMENT_EXTENSIONS: Set[str] = {".pdf", ".doc", ".docx", ".xls", ".xlsx"}
ALLOWED_TEMPLATE_EXTENSIONS: Set[str] = {".pdf", ".doc", ".docx"}

# 文件大小限制
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_DOCUMENT_SIZE = 20 * 1024 * 1024  # 20MB
MAX_TEMPLATE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file_extension(filename: str, allowed_extensions: Set[str]) -> Tuple[bool, str]:
    """
    验证文件扩展名。

    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名集合

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if not filename:
        return False, "文件名不能为空"

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if not ext:
        return False, "文件缺少扩展名"

    if f".{ext}" not in allowed_extensions:
        return False, f"不支持的文件类型，仅允许: {', '.join(sorted(allowed_extensions))}"

    return True, ""


def validate_file_size(size: int, max_size: int) -> Tuple[bool, str]:
    """
    验证文件大小。

    Args:
        size: 文件大小（字节）
        max_size: 最大允许大小（字节）

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"文件大小超过限制（最大 {max_mb:.0f}MB）"

    return True, ""


def validate_phone(phone: str) -> Tuple[bool, str]:
    """
    验证手机号格式。

    Args:
        phone: 手机号

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if not phone:
        return False, "手机号不能为空"

    if not re.match(r"^1[3-9]\d{9}$", phone):
        return False, "手机号格式不正确"

    return True, ""


def validate_id_card(id_card: str) -> Tuple[bool, str]:
    """
    验证身份证号格式（18位）。

    Args:
        id_card: 身份证号

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if not id_card:
        return False, "身份证号不能为空"

    # 18位身份证号正则
    pattern = r"^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$"
    if not re.match(pattern, id_card):
        return False, "身份证号格式不正确"

    return True, ""


def validate_bank_card(bank_card: str) -> Tuple[bool, str]:
    """
    验证银行卡号格式。

    Args:
        bank_card: 银行卡号

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if not bank_card:
        return True, ""  # 银行卡号可选

    # 银行卡号：16-19位数字
    if not re.match(r"^\d{16,19}$", bank_card):
        return False, "银行卡号格式不正确（应为16-19位数字）"

    return True, ""


def validate_work_no(work_no: str) -> Tuple[bool, str]:
    """
    验证工号格式。

    Args:
        work_no: 工号

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if not work_no:
        return True, ""  # 工号可选

    if len(work_no) > 50:
        return False, "工号长度不能超过50字符"

    return True, ""


def validate_name(name: str, field_name: str = "姓名") -> Tuple[bool, str]:
    """
    验证姓名格式。

    Args:
        name: 姓名
        field_name: 字段名称（用于错误消息）

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    if not name or not name.strip():
        return False, f"{field_name}不能为空"

    if len(name.strip()) > 100:
        return False, f"{field_name}长度不能超过100字符"

    return True, ""


def sanitize_string(value: Optional[str], max_length: Optional[int] = None) -> Optional[str]:
    """
    清理字符串输入。

    Args:
        value: 输入字符串
        max_length: 最大长度（可选）

    Returns:
        Optional[str]: 清理后的字符串
    """
    if value is None:
        return None

    result = str(value).strip()

    if not result:
        return None

    if max_length and len(result) > max_length:
        result = result[:max_length]

    return result


def validate_positive_integer(value: int, field_name: str = "ID") -> Tuple[bool, str]:
    """
    验证正整数。

    Args:
        value: 整数值
        field_name: 字段名称

    Returns:
        Tuple[bool, str]: (是否有效, 错误消息)
    """
    try:
        if int(value) <= 0:
            return False, f"{field_name}必须为正整数"
        return True, ""
    except (ValueError, TypeError):
        return False, f"{field_name}必须为整数"
