import Link from "next/link";

export default function OfflinePage() { return <main className="auth-page"><section className="auth-panel" role="status" aria-labelledby="offline-title"><p className="eyebrow">Sin conexión</p><h1 id="offline-title">La cancha sigue aquí</h1><p>Conéctate para consultar datos o realizar cambios en tu equipo.</p><Link className="primary-action" href="/app">Volver a intentar</Link></section></main>; }
