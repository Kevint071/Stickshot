/** Esqueleto mientras carga cualquier pantalla de la app. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando"
      className="space-y-8"
    >
      <div className="space-y-3">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-10 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-[20px]" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-[20px]" />
    </div>
  );
}
