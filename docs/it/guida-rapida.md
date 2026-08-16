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
   Ordine, cadenza, il flussometro con la sua unità (rilevata
   automaticamente, sovrascrivibile) e gli altri dettagli della zona si
   trovano in **✎ Modifica zona → Avanzate**.
5. **Configura le notifiche** in **⚙️ Impostazioni → Notifiche**: la
   procedura guidata propone come destinatari i servizi `notify.*` che
   l'istanza ha già, con un invio di prova, e come eventi i cinque che un
   impianto di irrigazione non dovrebbe mai perdere — watchdog, anomalia,
   sentinella, ciclo interrotto, perdita d'acqua — già preselezionati:
   accettare il consiglio è un clic.

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

## L'acqua

- Il flusso viene integrato **in continuo**, non solo durante un ciclo: due
  sensori nuovi, **Acqua totale** per zona (con i litri di oggi e del mese
  come attributi) e **Acqua non attribuita** sull'hub, per l'acqua che
  nessuna zona ha reclamato. Entrambi entrano nelle statistiche di Home
  Assistant e nella **dashboard Acqua**.
- Una zona **senza flussometro** compare lì lo stesso: i suoi litri sono
  stimati come portata nominale × minuti e sono marcati come stimati.
- **Aggiorni dalla 3.2.x?** La catena di helper costruita a mano — l'helper
  `integration` che faceva i litri, l'`utility_meter` che li tagliava per
  giorno e per mese, i template sensor che li dividevano per zona — è ora
  ridondante e si può cancellare. Lo storico precedente non viene importato,
  per scelta: i nuovi sensori partono da zero e il vecchio contatore mensile
  vale una volta sola come saldo di apertura del periodo. Dettagli in
  [istruzioni.md](istruzioni.md) §7.
- **Storico dei consumi** e **storico delle esecuzioni** — due servizi di
  sola lettura (`get_water_history`, `get_run_history`), richiamabili da
  Strumenti per sviluppatori → Azioni, per i litri giornalieri per zona e
  ogni esito registrato coi suoi motivi. Dettagli in
  [istruzioni.md](istruzioni.md) §9.

## Perdite e mancanza d'acqua

- Ogni zona può avere un **sensore di perdita** e un **sensore di mancanza
  d'acqua**, proposti in automatico se il dispositivo della valvola ne
  espone (riconosciuti dalla device class, mai dal nome) e modificabili in
  **✎ Modifica zona → Avanzate**.
- Una **perdita** si conferma dal sensore della valvola mentre quella valvola
  è chiusa, oppure da acqua misurata con **tutte** le valvole chiuse: due
  prove, un solo allarme, dopo una finestra di conferma. Arrivano una
  notifica, una segnalazione in Riparazioni e una nuova entità di perdita
  (`binary_sensor`, `device_class: problem`) per zona più una per l'impianto.
  Di default il componente notifica e richiude le valvole; bloccare i nuovi
  cicli è possibile e opt-in.
- Su quelle entità **`unavailable` è uno stato normale**, e può durare
  indefinitamente: significa che non è stato stabilito nulla. Un'automazione
  scritta lì sopra in quel caso non scatta mai, senza dire niente. La
  sequenza dopo ogni riavvio è `unavailable` → (una finestra di conferma) →
  `off`, quindi l'automazione di rientro va scritta con `from: "on"` oltre a
  `to: "off"`, altrimenti scatta anche a ogni riavvio. L'esempio completo è
  in [istruzioni.md](istruzioni.md) §8: leggilo prima di automatizzare.
- La **mancanza d'acqua** è un'altra cosa: `on` sul suo sensore significa che
  l'acqua non c'è. Con quel sensore un ciclo viene rifiutato invece di
  partire a vuoto (dopo una finestra di conferma), e una valvola che si
  chiude da sola per mancanza di pressione non fa più abortire la sessione
  come intervento manuale.
- **Provala apposta una volta**, prima di averne bisogno: un impianto
  configurato bene che tace è identico a uno configurato male che tace, e un
  falso allarme a impianto fermo non costa nulla. La ricetta, con i tempi e
  come si rientra, è in [istruzioni.md](istruzioni.md) §8.

Istruzioni complete: [istruzioni.md](istruzioni.md).
