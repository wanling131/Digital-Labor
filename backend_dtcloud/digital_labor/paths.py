from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Paths:
    """
    统一管理与旧 Node 后端兼容的目录结构。

    关键点：
    - 旧系统将静态资源暴露在 `/uploads/**`，且 DB 中存的是相对 `server/` 的路径；
      因此新后端使用 `backend_dtcloud/uploads`，避免前端路径失效。
    """

    workspace_root: str

    @property
    def server_root(self) -> str:
        return os.path.join(self.workspace_root, "server")

    @property
    def uploads_root(self) -> str:
        return os.path.join(self.workspace_root, "uploads")

    @property
    def uploads_templates(self) -> str:
        return os.path.join(self.uploads_root, "templates")

    @property
    def uploads_contracts(self) -> str:
        return os.path.join(self.uploads_root, "contracts")

    @property
    def uploads_signatures(self) -> str:
        return os.path.join(self.uploads_root, "signatures")

    @property
    def uploads_signatures_contracts(self) -> str:
        return os.path.join(self.uploads_signatures, "contracts")

    @property
    def uploads_signatures_settlements(self) -> str:
        return os.path.join(self.uploads_signatures, "settlements")


def get_paths() -> Paths:
    # backend_dtcloud/digital_labor/paths.py -> backend_dtcloud root
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    return Paths(workspace_root=backend_root)

