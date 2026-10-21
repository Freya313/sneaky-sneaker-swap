import SignupCard from './SignupCard.jsx';

export default function Hero({ session }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="badge">100% FREE · NO FEES · EVER</span>
        <h1 className="hero-title">Welcome to the <em className="hero-title-accent">swap.</em></h1>
        <p className="hero-lead">
          You wear your sneakers to lectures, parties and everything in between. Here you can
          trade, sell and buy them with other students. Free.
        </p>
        <div className="hero-image">sneaker product shot</div>
      </div>
      <SignupCard session={session} />
    </section>
  );
}
