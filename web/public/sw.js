// Service Worker - 不缓存任何请求，确保实时数据
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// 网络优先策略，不缓存 API 和 WebSocket
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 不拦截 API 请求
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) {
    return;
  }

  // 不拦截 POST/PUT/DELETE/PATCH 请求
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return;
  }

  // 其他请求使用网络优先
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((response) => {
        return response || Promise.reject(new Error('Network error'));
      });
    })
  );
});
