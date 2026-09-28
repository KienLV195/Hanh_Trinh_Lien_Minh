interface StatusItemProps {
  label: string;
  value: string;
  tone: "ready" | "waiting" | "error";
}

export function StatusItem({ label, value, tone }: StatusItemProps) {
  return (
    <div className="status-item">
      <span className="status-item__label">{label}</span>
      <span className={`status-item__value status-item__value--${tone}`}>{value}</span>
    </div>
  );
}
