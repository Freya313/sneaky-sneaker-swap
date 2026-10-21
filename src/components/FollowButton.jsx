export default function FollowButton({ sellerId, isFollowing, onToggle, session, currentUserId }) {
  if (!session || !sellerId || sellerId === currentUserId) return null;
  return (
    <button
      type="button"
      className={`follow-btn${isFollowing ? ' is-following' : ''}`}
      onClick={onToggle}
    >
      {isFollowing ? '✓ Following' : '+ Follow'}
    </button>
  );
}
