// Пасхалка: ASCII-кот выглядывает из-за логотипа при ховере контейнера с
// data-logo. Геометрия «откуда выглядывает» задаётся модификатором размещения.
const CAT_LINES = [" /\\_/\\", "( o.o )", " > ^ <"];

export function AsciiCat({ placement }: { placement: "landing" | "sidebar" }) {
  return (
    <span className={`gickCatSlot is-${placement}`} aria-hidden="true">
      <span className="gickCat">
        {CAT_LINES.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </span>
    </span>
  );
}
