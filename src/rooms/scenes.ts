import { TOWN_SCENES } from './scenes-town';
import { WILD_SCENES } from './scenes-wild';

/** Scenery (backgrounds, animation, props and lights) for every room, keyed by room id. */
export const SCENES = { ...TOWN_SCENES, ...WILD_SCENES };
