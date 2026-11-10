// What the layers panel lists, with no DOM: a view's own layers, and the data sources the data door tells of.
import { type DoorCredit, type DoorSourceInfo, licenceText } from "../shared/door.ts";
import type { Bilingual } from "../shared/door.ts";

export { type DoorCredit, type DoorSourceInfo, licenceText };

/** One layer a view offers: Orbits, Names, Moons, Spacecraft, Constellations, Black holes, and whatever else the view has. */
export interface LayerItem {
  id: string;
  label: Bilingual;
  checked: boolean;
}

/** One outside data source in the panel, with whether it is switched on. */
export interface LayerSource {
  info: DoorSourceInfo;
  enabled: boolean;
}

/**
 * The outside sources among a view's credits, ready for the panel; the package's own data is left out, since it is not for switching off. `enabled` says which are on (all, by default).
 * Keep the list in the page: a source that is switched off draws nothing and leaves `credits()`, but it must stay here to be switched back on.
 * @example
 * sourcesFromCredits(view.credits(), (id) => !off.has(id));
 */
export function sourcesFromCredits(credits: readonly DoorCredit[], enabled: (id: string) => boolean = () => true): LayerSource[] {
  return credits.filter((credit) => !credit.own).map((credit) => ({ info: credit.source, enabled: enabled(credit.source.id) }));
}
