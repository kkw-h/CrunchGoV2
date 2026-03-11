"""WebSocket 管理器."""

import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    """WebSocket 连接管理器."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """接受连接."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """断开连接."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict[str, Any]):
        """广播消息给所有连接."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # 清理断开的连接
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal_message(self, message: dict[str, Any], websocket: WebSocket):
        """发送个人消息."""
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)


# 全局连接管理器
manager = ConnectionManager()


async def notify_queue_update(queue_data: dict):
    """通知队列更新."""
    await manager.broadcast({
        "type": "queue_update",
        "data": queue_data,
    })


async def notify_order_update(order_data: dict):
    """通知订单更新."""
    await manager.broadcast({
        "type": "order_update",
        "data": order_data,
    })
