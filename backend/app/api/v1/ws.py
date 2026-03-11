"""WebSocket 路由."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.websocket import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 连接端点."""
    await manager.connect(websocket)
    try:
        while True:
            # 保持连接，接收心跳消息
            data = await websocket.receive_text()
            # 响应心跳
            if data == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
