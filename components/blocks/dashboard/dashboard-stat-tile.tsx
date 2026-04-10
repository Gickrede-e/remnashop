import type { LucideIcon } from "lucide-react";

type DashboardStatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function DashboardStatTile({ icon: Icon, label, value }: DashboardStatTileProps) {
  return (
    <article className="dashStatTile">
      <div className="dashStatTileIcon">
        <Icon className="dashStatTileGlyph" aria-hidden="true" />
      </div>
      <div className="dashStatTileBody">
        <p className="dashStatTileValue">{value}</p>
        <p className="dashStatTileLabel">{label}</p>
      </div>
    </article>
  );
}
