import { useEffect, useRef, useState } from 'react';

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso);
  if (ms < 60000)    return 'Just now';
  if (ms < 3600000)  return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

const ICONS = { favourite: '❤️', offer: '💰', message: '💬' };

export default function ActivityBell({ notifications = [], onOpen, onDismiss }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const unread = notifications.filter((n) => !n.read_at).length;

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        type="button"
        className="bell-btn"
        onClick={() => setOpen((p) => !p)}
        aria-label={`Activity (${unread} unread)`}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        {unread > 0 && (
          <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="bell-dropdown activity-dropdown">
          <p className="bell-header">Activity</p>

          {notifications.length === 0 ? (
            <p className="bell-empty">No activity yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`bell-item${!n.read_at ? ' bell-item--unread' : ''}`}>
                <div className="bell-item-body">
                  <span className="activity-icon">{ICONS[n.type] || '🔔'}</span>
                  <div className="activity-text">
                    <span className="activity-body">{n.body}</span>
                    <span className="activity-time">{timeAgo(n.created_at)}</span>
                  </div>
                </div>
                <div className="bell-item-actions">
                  <button
                    type="button"
                    className="pill-btn"
                    style={{ fontSize: 12, padding: '3px 10px' }}
                    onClick={() => { setOpen(false); onOpen(n); }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="bell-dismiss"
                    onClick={() => onDismiss(n.id)}
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
