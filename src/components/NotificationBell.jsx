import { useEffect, useRef, useState } from 'react';

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso);
  if (ms < 60000)    return 'Just now';
  if (ms < 3600000)  return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const ACTIVITY_ICON = { favourite: '❤️', offer: '💰', message: '💬' };

export default function NotificationBell({
  // saved-search alerts
  notifications = [], onApply, onDismiss,
  // activity (favourites, etc.)
  activityNotifs = [], onOpenActivity, onDismissActivity,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const searchTotal   = notifications.reduce((s, n) => s + n.count, 0);
  const activityUnread = activityNotifs.filter((n) => !n.read_at).length;
  const totalBadge     = searchTotal + activityUnread;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasAnything = notifications.length > 0 || activityNotifs.length > 0;

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        type="button"
        className="bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${totalBadge > 0 ? ` — ${totalBadge} new` : ''}`}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        {totalBadge > 0 && (
          <span className="bell-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>
        )}
      </button>

      {open && (
        <div className="bell-dropdown">

          {/* ── Activity section ── */}
          {activityNotifs.length > 0 && (
            <>
              <p className="bell-header">Activity</p>
              {activityNotifs.map((n) => (
                <div key={n.id} className={`bell-item${!n.read_at ? ' bell-item--unread' : ''}`}>
                  <div className="bell-item-body">
                    <span className="activity-icon">{ACTIVITY_ICON[n.type] || '🔔'}</span>
                    <div className="activity-text">
                      <span className="activity-body">{n.body}</span>
                      <span className="activity-time">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  <div className="bell-item-actions">
                    <button type="button" className="link-btn"
                      onClick={() => { setOpen(false); onOpenActivity?.(n); }}>
                      View
                    </button>
                    <button type="button" className="bell-dismiss" aria-label="Dismiss"
                      onClick={() => onDismissActivity?.(n.id)}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Saved search alerts section ── */}
          <p className="bell-header" style={activityNotifs.length > 0 ? { borderTop: '1px solid var(--lavender)' } : {}}>
            Saved search alerts
          </p>
          {notifications.length === 0 ? (
            <p className="bell-empty">No new results for your saved searches.</p>
          ) : notifications.map((n) => (
            <div key={n.id} className="bell-item">
              <div className="bell-item-body" style={{ flexDirection: 'column' }}>
                <strong style={{ fontSize: 13 }}>{n.name}</strong>
                <span className="feature-text" style={{ fontSize: 12 }}>
                  {n.count} new result{n.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="bell-item-actions">
                <button type="button" className="link-btn"
                  onClick={() => { onApply(n); setOpen(false); }}>
                  View
                </button>
                <button type="button" className="bell-dismiss" aria-label="Dismiss"
                  onClick={() => onDismiss(n.id)}>
                  ×
                </button>
              </div>
            </div>
          ))}

          {!hasAnything && (
            <p className="bell-empty">No notifications yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
