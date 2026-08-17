self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const link = typeof payload.link === 'string' && payload.link.startsWith('/') ? payload.link : '/notifications';
  const deliveryId = new URL(link, self.location.origin).searchParams.get('pushDelivery');
  if (deliveryId) {
    event.waitUntil(fetch('/api/push/receipt', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deliveryId, event: 'RECEIVED' }),
    }).catch(() => undefined));
  }
  event.waitUntil(self.registration.showNotification(payload.title || 'MascoTin', {
    body: [payload.helpType, payload.zone].filter(Boolean).join(' · '),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: deliveryId || link,
    renotify: false,
    data: { link, deliveryId },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/notifications';
  const deliveryId = event.notification.data?.deliveryId;
  const receipt = deliveryId
    ? fetch('/api/push/receipt', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, event: 'CLICKED' }),
      }).catch(() => undefined)
    : Promise.resolve();
  event.waitUntil(receipt.then(async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const targetUrl = new URL(link, self.location.origin).href;
    for (const client of windows) {
      if ('focus' in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  }));
});
