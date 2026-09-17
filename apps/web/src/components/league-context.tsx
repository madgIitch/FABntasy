import { LeagueSwitcher } from "./league-switcher";
import styles from "./home-dashboard.module.css";

export type LeagueContextData = {
  competition: string;
  activeLeague: { id: string; name: string };
  leagues: { id: string; name: string }[];
};

export function LeagueContext({ competition, activeLeague, leagues }: LeagueContextData) {
  return <header className={styles.context}><div><span>{competition}</span><LeagueSwitcher activeLeague={activeLeague} leagues={leagues}/></div></header>;
}
