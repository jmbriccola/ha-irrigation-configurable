/**
 * Entry point: loads the card + editor custom elements and registers
 * the card in the Lovelace card picker.
 */
import "./card";
import "./editor";
import { en } from "./localize/en";

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === "irrigation-maestro-card")) {
  window.customCards.push({
    type: "irrigation-maestro-card",
    name: en["card.name"],
    description: en["card.description"],
    preview: true,
    documentationURL:
      "https://github.com/jmbriccola/ha-irrigation-configurable",
  });
}
