// cube-field-element.js — side-effect-модуль: регистрирует customElement
// <cube-field> и ничего не экспортирует. JSX-типизация элемента живёт здесь,
// чтобы любой импорт модуля приносил её с собой.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "cube-field": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        accent?: string;
        count?: number | string;
        mode?: string;
        faces?: string;
        scale?: number | string;
        dust?: number | string;
      };
    }
  }
}

export {};
