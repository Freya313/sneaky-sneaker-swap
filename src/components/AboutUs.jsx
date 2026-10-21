const values = [
  {
    title: 'Students first',
    text: 'Built by students, for students. Every feature starts with what you actually need on campus.',
  },
  {
    title: 'Fair trades',
    text: 'Honest listings with clear sizes and conditions, so you know exactly what you get.',
  },
  {
    title: 'Less waste',
    text: 'Every swapped pair is one less pair in the bin and one less new pair shipped across the world.',
  },
];

export default function AboutUs() {
  return (
    <section id="about" className="about">
      <div className="about-intro">
        <h2 className="about-title">About us</h2>
        <div className="about-copy">
          <p className="about-lead">
            We're CIUP students too. We started Sneaky Sneaker Swap because great pairs sit unworn
            in dorm rooms while someone in another house is looking for exactly that size but gets
            lost in the CIUP market place group chat.
          </p>
          <p className="about-text">
            Selling online usually means fees, shipping and strangers. Here you trade with people
            from your own campus, meet up on campus and keep every cent.
          </p>
        </div>
      </div>
      <div className="values">
        {values.map((v) => (
          <div key={v.title} className="value">
            <h3 className="value-title">{v.title}</h3>
            <p className="value-text">{v.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
