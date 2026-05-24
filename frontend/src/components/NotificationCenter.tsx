import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, MailOpen, RefreshCw, X } from 'lucide-react';
import { api, extractError } from '../api/client';
import { NotificationItem } from '../types';

const notificationPollIntervalMs = 30_000;

function buildNotificationsWebSocketUrl() {
  const apiBaseUrl = api.defaults.baseURL ?? '/api';
  const url = new URL(apiBaseUrl, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/notifications/ws`;
  url.search = '';
  return url.toString();
}

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ahora';
  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function notificationTone(type: string) {
  if (type === 'success' || type === 'activation') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (type === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
}

export function NotificationCenter({ align = 'right' }: { align?: 'right' | 'left' }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);
  const visibleItems = items.slice(0, 10);

  const showPushNotification = useCallback((notification: NotificationItem) => {
    setToast(notification);
    window.setTimeout(() => {
      setToast((current) => (current?.id === notification.id ? null : current));
    }, 7000);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.svg',
        tag: notification.id
      });
    }
  }, []);

  const loadNotifications = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoading(true);
      setError('');
    }
    try {
      const response = await api.get<NotificationItem[]>('/notifications', {
        params: { limit: 100 }
      });
      const nextItems = response.data;
      if (initializedRef.current) {
        const newUnread = nextItems.find((item) => !item.is_read && !knownIdsRef.current.has(item.id));
        if (newUnread) showPushNotification(newUnread);
      } else {
        initializedRef.current = true;
      }
      knownIdsRef.current = new Set(nextItems.map((item) => item.id));
      setItems(nextItems);
    } catch (err) {
      if (!options.silent) setError(extractError(err));
    } finally {
      if (!options.silent) setIsLoading(false);
    }
  }, [showPushNotification]);

  async function markAsRead(notificationId: string) {
    try {
      const response = await api.put<NotificationItem>(`/notifications/${notificationId}/read`);
      setItems((current) => current.map((item) => (item.id === notificationId ? response.data : item)));
      setToast((current) => (current?.id === notificationId ? null : current));
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function markAllAsRead() {
    try {
      await api.put('/notifications/read-all');
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setToast(null);
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function requestBrowserPermission() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  }

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, notificationPollIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let stopped = false;
    let attempt = 0;

    function connect() {
      if (stopped) return;
      try {
        socket = new WebSocket(buildNotificationsWebSocketUrl());
      } catch {
        return;
      }

      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { event?: string; notification?: NotificationItem };
          if (payload.event !== 'notification_created' || !payload.notification) return;
          const notification = {
            ...payload.notification,
            created_at: payload.notification.created_at || new Date().toISOString()
          };
          knownIdsRef.current.add(notification.id);
          setItems((current) => {
            const exists = current.some((item) => item.id === notification.id);
            if (exists) {
              return current.map((item) => (item.id === notification.id ? notification : item));
            }
            return [notification, ...current].slice(0, 100);
          });
          showPushNotification(notification);
        } catch {
          // WebSocket payloads outside the notification contract are ignored.
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
      socket.onclose = () => {
        if (stopped) return;
        attempt += 1;
        reconnectTimer = window.setTimeout(connect, Math.min(30_000, 1500 * attempt));
      };
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [showPushNotification]);

  return (
    <div className="relative">
      <button
        aria-label="Notificaciones"
        className="relative flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-semibold leading-5 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute top-12 z-40 w-[min(92vw,24rem)] rounded-md border border-slate-200 bg-white shadow-xl ${align === 'left' ? 'left-0' : 'right-0'}`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Notificaciones</p>
              <p className="text-xs text-slate-500">{unreadCount} sin leer</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="icon-button" type="button" title="Actualizar" onClick={() => loadNotifications()}>
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button className="icon-button" type="button" title="Marcar todas como leídas" disabled={unreadCount === 0} onClick={markAllAsRead}>
                <CheckCheck size={16} />
              </button>
            </div>
          </div>

          {browserPermission === 'default' && (
            <div className="border-b border-slate-100 p-3">
              <button className="btn-secondary w-full justify-center" type="button" onClick={requestBrowserPermission}>
                Activar avisos del navegador
              </button>
            </div>
          )}

          {error && <div className="m-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          <div className="max-h-96 overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="grid place-items-center gap-2 p-8 text-center text-sm text-slate-500">
                <MailOpen size={26} />
                No tienes notificaciones.
              </div>
            ) : (
              visibleItems.map((item) => (
                <article key={item.id} className={`border-b border-slate-100 p-3 ${item.is_read ? 'bg-white' : 'bg-blue-50/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatNotificationDate(item.created_at)}</p>
                    </div>
                    {!item.is_read && (
                      <button className="icon-button shrink-0" type="button" title="Marcar como leída" onClick={() => markAsRead(item.id)}>
                        <CheckCheck size={16} />
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed right-4 top-4 z-50 w-[min(92vw,22rem)] rounded-md border p-4 shadow-xl ${notificationTone(toast.type)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{toast.title}</p>
              <p className="mt-1 text-sm">{toast.message}</p>
            </div>
            <button className="rounded-md p-1 hover:bg-white/60" type="button" aria-label="Cerrar notificación" onClick={() => setToast(null)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
