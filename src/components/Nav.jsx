import Logo from './Logo.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Nav({
  session, view, onNavigate,
  notifications, onApplyNotification, onDismissNotification,
  inboxUnreadCount = 0,
  activityNotifs = [], onOpenActivityNotif, onDismissActivityNotif,
}) {
  const handleHomeAnchor = (e) => {
    if (view !== 'home') { e.preventDefault(); onNavigate('home'); }
  };

  return (
    <nav className="nav">
      <button type="button" className="brand nav-brand-btn" onClick={() => onNavigate('home')}>
        <Logo />
        <div className="brand-text">
          <span className="brand-name">Sneaky Sneaker Swap</span>
          <span className="brand-tag">STUDENT SNEAKER MARKETPLACE</span>
        </div>
      </button>

      <div className="nav-links">
        <a href="#how"   className="nav-link" onClick={handleHomeAnchor}>How it works</a>
        <button
          type="button"
          className={`nav-link nav-link-btn${view === 'marketplace' ? ' nav-link--active' : ''}`}
          onClick={() => onNavigate('marketplace')}
        >
          Marketplace
        </button>
        <a href="#about" className="nav-link" onClick={handleHomeAnchor}>About us</a>

        {session ? (
          <>
            <button
              type="button"
              className={`nav-link nav-link-btn${view === 'inbox' || view === 'chat' ? ' nav-link--active' : ''}`}
              onClick={() => onNavigate('inbox')}
              style={{ position: 'relative' }}
            >
              Inbox
              {inboxUnreadCount > 0 && (
                <span className="inbox-badge">{inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`pill-btn${view === 'favourites' ? ' pill-btn--active' : ''}`}
              onClick={() => onNavigate('favourites')}
            >
              My favourites
            </button>
            <NotificationBell
              notifications={notifications}
              onApply={onApplyNotification}
              onDismiss={onDismissNotification}
              activityNotifs={activityNotifs}
              onOpenActivity={onOpenActivityNotif}
              onDismissActivity={onDismissActivityNotif}
            />
          </>
        ) : (
          <>
            <a href="#signup" className="nav-link" onClick={handleHomeAnchor}>Log in</a>
            <a href="#signup" className="pill-btn" onClick={handleHomeAnchor}>Sign up free</a>
          </>
        )}
      </div>
    </nav>
  );
}
