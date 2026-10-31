import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type DashboardStatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Заполнение мини-бара под значением, 0..1 (например, доля трафика). */
  meter?: number | null;
  /** Декоративный слой под контентом (например, <CubeField />); плитка сама ничего не рисует. */
  decoration?: ReactNode;
};

export function DashboardStatTile({ icon: Icon, label, value, meter, decoration }: DashboardStatTileProps) {
  const meterWidth =
    typeof meter === "number" && Number.isFinite(meter)
      ? `${Math.min(100, Math.max(0, meter * 100)).toFixed(1)}%`
      : null;

  return (
    <article className="dashStatTile">
      {decoration}
      <div className="dashStatTileIcon">
        <Icon className="dashStatTileGlyph" aria-hidden="true" />
      </div>
      <div className="dashStatTileBody">
        <p className="dashStatTileValue">{value}</p>
        <p className="dashStatTileLabel">{label}</p>
        {meterWidth ? (
          <div className="dashStatTileMeter" aria-hidden="true">
            <div className="dashStatTileMeterFill" style={{ width: meterWidth }} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
