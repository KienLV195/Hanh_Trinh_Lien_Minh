import { useParams } from "react-router-dom";
import { PageShell } from "../components/page-shell";

interface SimplePageProps {
  title: string;
  subtitle: string;
}

export function SimplePage({ title, subtitle }: SimplePageProps) {
  const { roomCode } = useParams();
  return (
    <PageShell compact title={title} subtitle={subtitle}>
      <section className="placeholder-state">
        <p>Room code: {roomCode ?? "Not provided"}</p>
        <p>This route is reserved for a later milestone.</p>
      </section>
    </PageShell>
  );
}
