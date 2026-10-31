export default function Loading() {
  return (
    <div className="appLoading" role="status">
      <span className="appLogo appLoadingMark" aria-hidden="true">
        <span className="appLogoWordmark">gickshop</span>
        <span className="appLogoCursor" />
      </span>
      <span className="srOnly">Загрузка…</span>
    </div>
  );
}
