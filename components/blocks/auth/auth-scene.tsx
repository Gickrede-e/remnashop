// components/blocks/auth/auth-scene.tsx
//
// Сцена авторизации: невесомая геометрия за карточкой (шаблон auth из
// Claude Design). Кубы приглушены до 0.55; карточка поднята над канвасом.

import type { ReactNode } from "react";

import { CubeField } from "@/components/effects/cube-field";

export function AuthScene({ children }: { children: ReactNode }) {
  return (
    <main className="authScene">
      <CubeField
        count={12}
        scale={0.8}
        dust={40}
        style={{ position: "absolute", inset: 0, opacity: 0.55 }}
      />
      <div className="authSceneViewport">
        {children}
      </div>
    </main>
  );
}
