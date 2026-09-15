"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./social-league-panels.module.css";
type EventItem = {
  id: string;
  type: string;
  occurredAt: string;
  actor: {
    name: string;
    publicManagerId: string | null;
    avatarUrl: string | null;
  } | null;
  payload: {
    affectedName?: string;
    affectedManagerName?: string;
    magnitude?: number;
    unit?: string;
  };
  reactions: Record<string, number>;
  myReactions: string[];
};
type Member = {
  membershipId: string;
  publicManagerId: string | null;
  name: string;
  avatarUrl: string | null;
  role: string;
  teamName: string;
  position: number | null;
  currentRosterValue: number | null;
  roundsWon: number;
  bestRound: number | null;
  trophies: unknown[];
};
const eventCopy: Record<string, string> = {
  PLAYER_BOUGHT: "fichó a",
  PLAYER_SOLD: "vendió a",
  CLAUSE_EXECUTED: "ejecutó el clausulazo de",
  PLAYER_PROTECTED: "protegió a",
  PRICE_CHANGED: "registró un cambio de valor en",
  MEMBER_JOINED: "se unió como",
  ROUND_PUBLISHED: "publicó",
  ROUND_WINNER: "ganó",
  RANK_CHANGED: "cambió de posición con",
  RECORD_SET: "batió el récord de",
  ACHIEVEMENT_EARNED: "desbloqueó",
};
const emojis = ["😂", "🔥", "👀", "💀", "🤡"];
const money = (value: number) =>
  `${new Intl.NumberFormat("es-ES").format(value)} cr`;
export function LeagueActivityPanel({ leagueId }: { leagueId: string }) {
  const [items, setItems] = useState<EventItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const hadData = useRef(false);
  const load = useCallback(async (next?: string | null) => {
    if (!next) setState("loading");
    try {
      const response = await fetch(
        `/api/leagues/${leagueId}/activity${
          next ? `?cursor=${encodeURIComponent(next)}` : ""
        }`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error();
      const body = await response.json() as {
        data: { items: EventItem[]; nextCursor: string | null };
      };
      setItems((old) => next ? [...old, ...body.data.items] : body.data.items);
      setCursor(body.data.nextCursor);
      setState("ready");
      hadData.current = true;
    } catch {
      setState("error");
    }
  }, [leagueId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function react(id: string, emoji: string) {
    const old = items;
    setItems((current) =>
      current.map((item) =>
        item.id !== id ? item : {
          ...item,
          myReactions: item.myReactions.includes(emoji)
            ? item.myReactions.filter((x) => x !== emoji)
            : [...item.myReactions, emoji],
          reactions: {
            ...item.reactions,
            [emoji]: Math.max(
              0,
              (item.reactions[emoji] ?? 0) +
                (item.myReactions.includes(emoji) ? -1 : 1),
            ),
          },
        }
      )
    );
    try {
      const response = await fetch(
        `/api/leagues/${leagueId}/events/${id}/reactions`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ emoji }),
        },
      );
      if (!response.ok) throw new Error();
    } catch {
      setItems(old);
    }
  }
  if (state === "loading" && !hadData.current) {
    return (
      <section
        className={styles.panel}
        aria-busy="true"
        aria-label="Cargando actividad"
      >
        {[1, 2, 3].map((i) => <div className={styles.skeleton} key={i} />)}
      </section>
    );
  }
  if (state === "error" && !items.length) {
    return (
      <Empty
        title="No se pudo actualizar"
        detail="Comprueba tu conexión. Los últimos datos se conservarán."
        retry={() => void load()}
      />
    );
  }
  if (!items.length) {
    return (
      <Empty
        title="La historia empieza con el primer movimiento"
        detail="Fichajes, clausulazos, jornadas y logros aparecerán aquí automáticamente."
      />
    );
  }
  return (
    <section className={styles.panel}>
      <header>
        <div>
          <p>Actividad</p>
          <h2>Lo último en la liga</h2>
        </div>
        {state === "error" && (
          <button onClick={() => void load()}>Reintentar</button>
        )}
      </header>
      <div className={styles.summary}>
        <i className={styles.summaryIcon} aria-hidden="true">↗</i>
        <div>
          <strong>Una liga en movimiento</strong>
          <small>Fichajes, jornadas y logros verificados</small>
        </div>
        <b>{items.length}</b>
      </div>
      <ol className={styles.timeline}>
        {items.map((item) => (
          <li
            key={item.id}
            className={item.type === "CLAUSE_EXECUTED"
              ? styles.clause
              : undefined}
          >
            <SocialAvatar
              className={styles.eventAvatar}
              name={item.actor?.name ?? "Canastio"}
              url={item.actor?.avatarUrl ?? null}
            />
            <div className={styles.eventBody}>
              <div className={styles.meta}>
                <span>
                  {item.type === "CLAUSE_EXECUTED"
                    ? "Clausulazo"
                    : item.type.replaceAll("_", " ")}
                </span>
                <time dateTime={item.occurredAt}>
                  {new Date(item.occurredAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p>
                <strong>{item.actor?.name ?? "Canastio"}</strong>{" "}
                {eventCopy[item.type] ?? "registró"}{" "}
                <b>{item.payload.affectedName ?? "un acontecimiento"}</b>
                {item.payload.affectedManagerName
                  ? (
                    <>
                      de <b>{item.payload.affectedManagerName}</b>
                    </>
                  )
                  : null}.
              </p>
            </div>
            {item.payload.magnitude !== undefined && (
              <em>
                {item.payload.unit === "credits"
                  ? money(item.payload.magnitude)
                  : `${item.payload.magnitude} ${item.payload.unit ?? ""}`}
              </em>
            )}
            <div className={styles.actions}>
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  aria-pressed={item.myReactions.includes(emoji)}
                  aria-label={`${emoji}: ${
                    item.reactions[emoji] ?? 0
                  } reacciones`}
                  onClick={() => void react(item.id, emoji)}
                >
                  {emoji} <span>{item.reactions[emoji] ?? 0}</span>
                </button>
              ))}
              <a
                href={`/api/leagues/${leagueId}/share/${item.id}`}
                download
                aria-label="Descargar tarjeta compartible"
                title="Descargar tarjeta"
              >
                Compartir
              </a>
            </div>
          </li>
        ))}
      </ol>
      {cursor && (
        <button
          className={styles.more}
          onClick={() => void load(cursor)}
        >
          Ver actividad anterior
        </button>
      )}
    </section>
  );
}
function SocialAvatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.replace("@", "").charAt(0).toUpperCase() || "C";
  if (!url || failed) return <i className={className} aria-hidden="true">{initial}</i>;
  return <img className={className} src={url} alt={`Avatar de ${name}`} width="44" height="44" onError={() => setFailed(true)} />;
}

function Empty(
  { title, detail, retry }: {
    title: string;
    detail: string;
    retry?: () => void;
  },
) {
  return (
    <section className={styles.empty}>
      <p>Actividad</p>
      <h2>{title}</h2>
      <span>{detail}</span>
      {retry && <button onClick={retry}>Reintentar</button>}
    </section>
  );
}
export function LeagueMembersPanel({ leagueId }: { leagueId: string }) {
  const [members, setMembers] = useState<Member[]>([]),
    [status, setStatus] = useState("loading"),
    [online, setOnline] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/leagues/${leagueId}/members`, {
      signal: controller.signal,
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error();
      setMembers(
        ((await response.json()) as { data: { items: Member[] } }).data.items,
      );
      setStatus("ready");
    }).catch(() => {
      if (!controller.signal.aborted) setStatus("error");
    });
    const session = crypto.randomUUID();
    const beat = () =>
      fetch(`/api/leagues/${leagueId}/presence`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session }),
      }).then((r) => r.json()).then((x: { data?: { activeCount: number } }) =>
        setOnline(x.data?.activeCount ?? null)
      ).catch(() => undefined);
    void beat();
    const timer = setInterval(() => void beat(), 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [leagueId]);
  if (status === "loading") {
    return (
      <section className={styles.panel} aria-busy="true">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </section>
    );
  }
  if (status === "error") {
    return (
      <Empty
        title="No se pudieron cargar los miembros"
        detail="Vuelve a intentarlo cuando recuperes la conexión."
      />
    );
  }
  return (
    <section className={styles.panel}>
      <header>
        <div>
          <p>Miembros</p>
          <h2>Managers de la liga</h2>
        </div>
        <span>
          {online === null
            ? "Presencia no disponible"
            : `${online} activos recientemente`}
        </span>
      </header>
      <p className={styles.privacy}>
        El recuento es anónimo, expira automáticamente y no crea historial.
      </p>
      <ul className={styles.members}>
        {members.map((member) => (
          <li key={member.membershipId}>
            <SocialAvatar name={member.name} url={member.avatarUrl} />
            <div>
              {member.publicManagerId
                ? (
                  <a
                    href={`/app/ligas/${leagueId}/managers/${
                      encodeURIComponent(member.publicManagerId)
                    }`}
                  >
                    <strong>{member.name}</strong>
                  </a>
                )
                : <strong>{member.name}</strong>}
              <span>
                {member.teamName} ·{" "}
                {member.role === "OWNER" ? "Administrador" : "Miembro"}
              </span>
            </div>
            <dl>
              <div>
                <dt>Posición</dt>
                <dd>{member.position ?? "—"}</dd>
              </div>
              <div>
                <dt>Valor actual</dt>
                <dd>
                  {member.currentRosterValue === null
                    ? "No disponible"
                    : money(member.currentRosterValue)}
                </dd>
              </div>
              <div>
                <dt>Jornadas ganadas</dt>
                <dd>{member.roundsWon}</dd>
              </div>
              <div>
                <dt>Mejor jornada publicada</dt>
                <dd>
                  {member.bestRound === null
                    ? "Sin datos"
                    : `${member.bestRound.toFixed(1)} pts`}
                </dd>
              </div>
              <div>
                <dt>Trofeos</dt>
                <dd>{member.trophies.length || "—"}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
