# Guida rapida (Italiano)

Irrigation Maestro orchestra l'irrigazione di un numero illimitato di zone
con un motore decisionale meteo collaudato sul campo e garanzie di sicurezza
rigorose sulle valvole. Tutto si configura dall'interfaccia, senza YAML.

## Installazione

1. In HACS: menu (⋮) → **Repository personalizzati** → aggiungi
   `https://github.com/jmbriccola/ha-irrigation-configurable` come
   **Integrazione**.
2. Installa **Irrigation Maestro** e riavvia Home Assistant.
3. *Impostazioni → Dispositivi e servizi → Aggiungi integrazione →
   Irrigation Maestro*: scegli l'entità `weather` (Met.no va benissimo) e,
   se li hai, sensore pioggia, sensore temperatura esterna, flussometro di
   linea e valvola master/pompa.
4. Apri il pannello **Irrigazione** nella barra laterale e premi **＋
   Aggiungi zona** per ogni circuito: nome e valvola (`valve` o `switch`)
   bastano per crearla, con un programma predefinito già pronto (tutti i
   giorni, all'alba) che poi rifinisci — orario o evento solare, giorni e
   durata sulla griglia settimanale, e la curva temperatura→durata con
   l'editor a punti di controllo (aggiungi, rimuovi, trascina o digita).
   Ordine, cadenza e gli altri dettagli della zona si trovano in
   **✎ Modifica zona → Avanzate**.

Richiede Home Assistant **2025.7.0 o successivo**.

## La card

Con le dashboard in modalità storage (default) la risorsa si registra da
sola: aggiungi la **Irrigation Maestro Card** dal selettore delle card. In
modalità YAML aggiungi manualmente la risorsa
`/irrigation_maestro/frontend/irrigation-maestro-card.js?v=…` (tipo
`module`).

## Come decide quando irrigare

- **Temperatura pesata** sulle massime di 5 giorni (3 gg fa ×0.05, 2 gg fa
  ×0.15, ieri ×0.30, oggi ×0.35, domani ×0.15).
- **Budget idrico** dalla pioggia passata pesata più un credito previsioni
  scontato (tetto 5 mm, dimezzato sopra i 30 °C: i temporali estivi previsti
  spesso non arrivano).
- **Soglia di salto dinamica**: 3 mm + 0.5 mm/°C sopra i 28 °C (max 6 mm).
  Budget ≥ soglia → si salta con motivo "budget sufficiente".
- **Salti immediati**: fuori stagione, precipitazioni in corso, gelo,
  giornata fredda, vento (opzionale).
- Le durate escono dalle **curve** per ciclo e si **congelano** all'inizio
  della sessione; le previsioni si scaricano **una sola volta** per sessione.

## Sicurezza (in breve)

Coda centrale con al massimo una zona attiva (default), verifica valvole
libere, pausa di assestamento, sorveglianza durante il ciclo (un intervento
manuale chiude tutto e blocca la coda per un'ora), verifica di apertura e
chiusura, watchdog indipendente che chiude tutto oltre i 70 minuti e a ogni
riavvio, sentinella giornaliera che avvisa se un ciclo previsto non ha
lasciato esito.

## Uso quotidiano

- Interruttori per abilitare zone e singoli cicli (es. spegnere solo il
  ciclo serale nelle mezze stagioni).
- **Pausa** a ore o **sospensione fino a data** (ferie/invernaggio), con
  riattivazione automatica; **Salta oggi**; **Avvia ora**; **Stop tutto**.
- Pulsante **Valuta ora** per vedere il piano calcolato senza aprire nulla.
- Notifiche per evento verso i tuoi servizi `notify.*`, aggregate (una sola
  per motivo condiviso).

Istruzioni complete: [istruzioni.md](istruzioni.md).
