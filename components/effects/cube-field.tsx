"use client";

// Обёртка над vanilla web-компонентом <cube-field> (./cube-field-element.js).
// Модуль регистрирует customElements при выполнении, поэтому импортируется
// после маунта; до этого элемент рендерится инертным с той же геометрией и
// апгрейдится на месте, как только будет определён.
import { useEffect, type CSSProperties } from "react";

export type CubeFieldProps = {
  accent?: string;
  count?: number;
  mode?: "отталкивание" | "притяжение";
  faces?: "каркас" | "грани";
  scale?: number;
  dust?: number;
  className?: string;
  style?: CSSProperties;
};

// Цвет по умолчанию задаёт сам элемент (см. cube-field-element.js).
export function CubeField({ accent, count = 14, mode, faces, scale, dust, className, style }: CubeFieldProps) {
  useEffect(() => {
    void import("./cube-field-element.js");
  }, []);

  return (
    <cube-field
      className={className}
      style={style}
      accent={accent}
      count={count}
      mode={mode}
      faces={faces}
      scale={scale}
      dust={dust}
      aria-hidden="true"
    />
  );
}
