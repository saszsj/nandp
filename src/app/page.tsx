export default function Home() {
  return (
    <main className="container stack">
      <h1>Nouveautes & Promos</h1>
      <p className="muted">
        Plateforme B2B2C de promotions et nouveautes pour boutiques de
        vetements.
      </p>
      <div className="stack card">
        <div className="row space-between">
          <span>Kiosk (tablette)</span>
          <a className="link" href="/kiosk/demo-boutique">
            Ouvrir
          </a>
        </div>
        <div className="row space-between">
          <span>Admin</span>
          <a className="link" href="/admin/login">
            Se connecter
          </a>
        </div>
        <div className="row space-between">
          <span>Gerant</span>
          <a className="link" href="/gerant/login">
            Se connecter
          </a>
        </div>
      </div>
    </main>
  );
}
