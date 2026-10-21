const features = [
  { title: 'Marketplace', text: 'List your pairs to sell or swap. Browse what other students offer.' },
  { title: 'Infinite feed', text: 'Keep scrolling. New drops from the community load as you go.' },
  { title: 'Filters', text: 'Narrow down by brand, size, condition and price.' },
  { title: 'Live chat', text: 'Message sellers directly and agree on a deal in real time.' },
  { title: 'Notifications', text: 'Get pinged in the app for new messages, offers and matches.' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="how-head">
        <h2 className="how-title">How it works</h2>
        <p className="how-sub">Everything you need to find, sell and swap sneakers in one app.</p>
      </div>
      <div className="feature-grid">
        {features.map((f, i) => (
          <div key={f.title} className="feature">
            <span className="feature-num">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-text">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
