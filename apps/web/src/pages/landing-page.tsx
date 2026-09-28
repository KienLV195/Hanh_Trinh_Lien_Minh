import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="landing">
      <section className="landing__hero">
        <div className="landing__copy">
          <h1>
            HÀNH TRÌNH
            <br />
            LIÊN MINH
          </h1>
          <p>Một miền đất, bảy người đồng hành.</p>
          <nav className="landing__actions" aria-label="Bắt đầu trò chơi">
            <Link className="button button--primary" to="/host">
              TẠO PHÒNG — HOST
            </Link>
            <Link className="button button--secondary" to="/join">
              THAM GIA — PLAYER
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
