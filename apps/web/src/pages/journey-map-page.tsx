import { Link } from "react-router-dom";
import { JourneyMapExperience } from "../components/journey-map-experience";
import "../journey-map.css";

export function JourneyMapPage() {
  return (
    <main className="journey-review">
      <header className="journey-review__header">
        <div><Link to="/">HÀNH TRÌNH LIÊN MINH</Link><h1>Một miền đất, bảy người đồng hành</h1></div>
        <Link to="/dev/characters">Xem nhân vật</Link>
      </header>
      <JourneyMapExperience mode="dev" />
      <p className="journey-review__caption" role="status">
        Khởi hành → 7 khu vực → Trung tâm Liên Minh. Chạm khu vực hoặc dùng điều hướng để khám phá.
      </p>
    </main>
  );
}
