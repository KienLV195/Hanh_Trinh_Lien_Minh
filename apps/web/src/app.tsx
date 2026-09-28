import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/landing-page";
import { SimplePage } from "./pages/simple-page";

const HostPage = lazy(async () => ({ default: (await import("./pages/host-page")).HostPage }));
const JourneyMapPage = lazy(async () => ({ default: (await import("./pages/journey-map-page")).JourneyMapPage }));
const CharacterGallery = lazy(async () => ({ default: (await import("./pages/character-gallery")).CharacterGallery }));
const PlayerPage = lazy(async () => ({
  default: (await import("./pages/player-page")).PlayerPage
}));

function RouteFallback() {
  return <div className="route-fallback">Loading development shell</div>;
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dev/characters" element={<CharacterGallery />} />
          <Route path="/dev/map" element={<JourneyMapPage />} />
          <Route path="/host" element={<HostPage />} />
          <Route path="/host/:roomCode" element={<HostPage />} />
          <Route path="/join" element={<PlayerPage />} />
          <Route path="/join/:roomCode" element={<PlayerPage />} />
          <Route path="/play/:roomCode" element={<PlayerPage />} />
          <Route
            path="/reconnect"
            element={<SimplePage title="Reconnect" subtitle="Session recovery foundation." />}
          />
          <Route
            path="/unsupported"
            element={
              <SimplePage
                title="Unsupported browser"
                subtitle="Device guidance will be added later."
              />
            }
          />
          <Route
            path="*"
            element={
              <SimplePage
                title="Route not found"
                subtitle="Return to the development landing page."
              />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
