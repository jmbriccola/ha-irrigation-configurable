/**
 * Entry point: loads the card + editor custom elements and registers
 * the cards in the Lovelace card picker.
 *
 * Both card types ship in ONE bundle and therefore one Lovelace resource:
 * `resources.py` registers a single file, and adding a second would mean a
 * second static path, a second registration and a second thing to keep
 * cache-busted for no gain.
 */
import "./card";
import "./editor";
import "./zone-card";
import "./zone-card-editor";
import "./hub-card";
import "./hub-card-editor";
import { en } from "./localize/en";

const DOCS = "https://github.com/jmbriccola/ha-irrigation-configurable";

window.customCards = window.customCards ?? [];

for (const entry of [
  {
    type: "irrigation-maestro-card",
    name: en["card.name"],
    description: en["card.description"],
  },
  {
    type: "irrigation-maestro-zone-card",
    name: en["zone_card.name"],
    description: en["zone_card.description"],
  },
  {
    type: "irrigation-maestro-hub-card",
    name: en["hub_card.name"],
    description: en["hub_card.description"],
  },
]) {
  if (!window.customCards.some((card) => card.type === entry.type)) {
    window.customCards.push({ ...entry, preview: true, documentationURL: DOCS });
  }
}
