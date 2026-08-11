# Irrigation Maestro — Istruzioni di configurazione e uso

English: [INSTRUCTIONS.md](../../INSTRUCTIONS.md)

Questa guida spiega come configurare l'integrazione e usarla (con la card)
giorno per giorno. Per concetti e formule vedi il [README](../../README.md)
e la [guida rapida](guida-rapida.md).

## 1. Installazione e creazione dell'hub

1. Aggiungi il repository a HACS come repository personalizzato (tipo
   *Integrazione*), installa **Irrigation Maestro**, riavvia Home Assistant.
2. *Impostazioni → Dispositivi e servizi → Aggiungi integrazione →
   Irrigation Maestro.*
3. Compila il primo modulo:
   - **Entità meteo** (obbligatoria) — un'entità `weather.*` con previsioni
     (Met.no funziona subito).
   - **Sensore pioggia** (opzionale) — un sensore con la **pioggia cumulata
     di oggi in mm**. Senza, la pioggia viene stimata dal forecast orario.
   - **Sensore temperatura esterna** (opzionale) — sostituisce la temperatura
     dell'entità meteo per il tracciamento delle massime giornaliere.
   - **Flussometro di linea** (opzionale) — un contatore condiviso (L/min)
     sul collettore, usato da ogni zona senza contatore proprio.
   - **Valvola master / pompa** (opzionale) — `valve` o `switch` aperta prima
     della prima zona di ogni sessione e chiusa dopo l'ultima.

L'hub nasce con default sensati; tutto il resto è nel menu **Configura**
dell'hub (opzioni) e nelle zone che aggiungerai.

## 2. Aggiungere le zone

Dalla pagina dell'integrazione premi **Aggiungi zona** e ripeti per ogni
circuito:

1. **Dati base**: nome, icona, entità `valve` o `switch` della zona,
   flussometro opzionale con portata nominale (L/min) e tolleranza %,
   superficie opzionale (m²), fattore di aggiustamento (default 100% — es.
   70% per un'aiuola in ombra), **ordine** nella sequenza, **cadenza** in
   giorni (default 3 — 1 = tutti i giorni), mesi di stagione e gruppo di
   compatibilità opzionali.
2. **Cicli** — aggiungi uno o più cicli giornalieri. Ognuno ha:
   - un **trigger**: evento solare (alba/tramonto con offset ± in minuti) o
     orario fisso;
   - mesi specifici opzionali (es. ciclo serale solo giugno–agosto);
   - una **curva** (passo successivo).
3. **Curva** — scegli la sorgente:
   - **Preset "vasi"**: 1 min/°C, +1 min/°C extra sopra i 30 °C, limiti
     10–55 min.
   - **Preset "prato"**: obiettivo mm = 4 + 0.3·(t−25) (min 3, max 8 mm) a
     0.375 mm/min, limiti 8–25 min.
   - **Un template salvato** (gestiti nelle opzioni dell'hub) o **copia da
     una zona/ciclo esistente**.
   - **Personalizzata**: punti di controllo come testo — `10:5, 25:15,
     35:30` significa 5 min a 10 °C, 15 min a 25 °C, 30 min a 35 °C,
     interpolazione lineare in mezzo, piatta fuori — più i limiti min/max.
   - Tipo **durata** (minuti) o **volume** (litri — proposto solo se la zona
     ha un flussometro utilizzabile; imposta anche il timeout di sicurezza).
   - **Cycle-and-soak** opzionale: minuti massimi per run e pausa di
     assorbimento (es. 10 min run / 15 min soak). Durante la pausa irrigano
     le altre zone in coda.

Tutto è modificabile in seguito: apri la zona dalla pagina dell'integrazione
e usa **Riconfigura** (menu a tre puntini). Gli ID dei cicli sono stabili:
storico e interruttori per ciclo sopravvivono alle modifiche.

**L'ordine delle zone** è l'entità number di ogni zona (o il servizio
`set_zone_order`) — volutamente non c'è drag-and-drop nel flow.

## 3. Opzioni dell'hub (Configura)

- **Generale**: le entità del passo 1, ritardi pre/post della master,
  **zone simultanee massime** (lascia 1 se la pressione non consente di
  più — altrimenti assegna le zone a un *gruppo di compatibilità* comune).
- **Sicurezza e tempi**: pausa di assestamento tra zone, finestra di blocco
  post-stop manuale, massimo del watchdog, finestre di conferma
  apertura/chiusura/switch, timeout attesa-valvole-libere, timeout valvole
  all'avvio, orario della sentinella, limiti di sessione opzionali (durata
  massima e/o orario must-finish-by).
- **Motore (avanzate)**: ogni peso e soglia del motore decisionale, con
  interruttore di **reset ai default**. Qui vivono anche i mesi di stagione.
- **Restrizioni** (ordinanze idriche): giorni della settimana consentiti,
  schema giorni pari/dispari, finestre orarie vietate (`08:00-10:30,
  22:00-06:00`). Le zone possono avere override individuali. La coda slitta
  al primo slot consentito; un ciclo in corso viene troncato invece di
  sconfinare nella finestra vietata.
- **Notifiche**: per ogni tipo di evento (completato, saltato, interrotto,
  annullato, anomalia, watchdog, sentinella, sforamento sessione, budget
  consumo) scegli abilitazione, servizi `notify.*` di destinazione e
  priorità. I salti con lo stesso motivo producono **una sola** notifica
  aggregata.
- **Budget di consumo**: litri al mese e azione al superamento — solo
  notifica, riduzione percentuale delle durate, o sospensione fino al mese
  successivo.

## 4. Uso quotidiano

- **Abilita/disabilita** una zona o un singolo ciclo con i rispettivi
  interruttori (es. spegnere il ciclo serale in primavera).
- **Pausa** (a ore) o **sospensione fino a data** (ferie, invernaggio) per
  zona o globale — la sospensione termina da sola. `resume` cancella
  entrambe.
- **Salta oggi** per una zona o per tutte.
- **Avvia ora**: `run_zone` (con durata opzionale) o il tasto play della
  card. Le esecuzioni manuali scavalcano cadenza e budget ma mantengono ogni
  controllo di sicurezza; non azzerano il contatore di cadenza.
- **Stop tutto**: chiude tutto e blocca i cicli in coda per la finestra di
  blocco (default 60 min).
- **Valuta ora** (pulsante o servizio `evaluate`): calcola e restituisce il
  piano completo — budget, soglia, durate per zona, motivi di salto — senza
  aprire nulla.
- Tieni d'occhio i **sensori dell'hub** (budget vs soglia, temperatura
  pesata, sessione + coda) e per ogni zona **stato / prossimo ciclo /
  ultimo esito**. I motivi sono tradotti nell'interfaccia e nella card.
- **Export/import**: il servizio `export_config` restituisce l'intera
  configurazione in JSON; `import_config` la ripristina.

## 5. La card

Aggiungi la *Irrigation Maestro Card* dal selettore delle card (in modalità
storage la risorsa si registra da sola; in modalità YAML vedi il README).
La card mostra l'indicatore budget/soglia, la temperatura pesata, stato
sessione e coda, e una riga per zona con progresso in tempo reale, prossimo
ciclo, ultimo esito, badge delle funzioni degradate e controlli (avvia,
salta, pausa, sospendi, abilita). L'editor visuale offre: titolo,
attivazione di header/coda/controlli, modalità compatta, filtro zone. Le
curve sono visualizzate (sparkline per ciclo) e possono essere modificate
dal vivo direttamente dalla card.

Modificare le curve dalla card — espandi una zona, apri un ciclo e premi
**Modifica curva**. Due slider (*Quanta acqua* e *Quanto di più quando fa
caldo*) rimodellano l'irrigazione dal vivo: il grafico, gli esempi
fresco/mite/caldo e la riga 'con il meteo di oggi' si aggiornano mentre
trascini. **Avanzate** aggiunge i limiti di sicurezza *Mai meno di / Mai più
di* e ti fa trascinare i tre punti. Le curve con più di tre punti si
modificano nelle impostazioni della zona.

## 6. Il pannello "Irrigazione"

Apri la voce **Irrigazione** nella barra laterale di Home Assistant (icona a
irrigatore) per un'alternativa a schermo intero alla card, dedicata alla
gestione dei programmi:

1. Scegli la scheda della **zona**.
2. L'elenco mostra tutti i programmi di quella zona; aggiungine uno nuovo
   con la procedura guidata (nome, trigger, giorni, durata — con la
   possibilità di copiare un programma esistente come punto di partenza),
   oppure modifica/rinomina/elimina un programma esistente.
3. Ogni programma si apre su una **griglia settimanale**: tocca i giorni in
   cui deve irrigare (vuoto = tutti i giorni), imposta l'orario o il trigger
   solare, e la durata: un unico valore per tutti i giorni programmati,
   oppure un valore diverso per ciascun giorno (es. più breve dopo un
   giorno di pioggia).
4. Le impostazioni **avanzate** — la curva di risposta al caldo (lo stesso
   editor a due slider della card, "quanta acqua" / "quanto di più quando
   fa caldo") per i programmi che scalano la durata con la temperatura
   invece di un valore fisso — sono dietro un cassetto (drawer), chiuso per
   default.

Il pannello e la card della dashboard leggono e scrivono gli stessi
programmi: usa l'uno, l'altra, o entrambi — non serve migrare nulla. La card
(§5 sopra) continua a funzionare esattamente come oggi.

## 7. Risoluzione dei problemi

- **Un ciclo non è partito e nessuno ti ha avvisato** → la sentinella
  giornaliera (default 12:00) notifica e apre una segnalazione in
  Riparazioni quando un ciclo previsto non ha lasciato esito — tipicamente
  Home Assistant era spento all'orario del trigger.
- **Valvola trovata aperta all'avvio** → l'ha chiusa il watchdog: per
  progetto un riavvio non riprende mai un ciclo. La sentinella segnalerà il
  ciclo perso.
- **"Chiusura valvola FALLITA" (urgente)** → la valvola non ha confermato la
  chiusura dopo un tentativo ripetuto. Il watchdog continua a riprovare ogni
  minuto; se l'acqua scorre ancora, chiudi il rubinetto. Controlla la rete
  Zigbee e la segnalazione in Riparazioni.
- **Tutto saltato come `manual_stop_block`** → qualcuno ha fermato un ciclo
  a mano nella finestra di blocco. Aspetta che scada o usa `run_zone`.
- **`weather_unavailable`** → l'entità meteo non aveva dati oltre la
  finestra configurata; controlla il provider. Il fail-open (default) irriga
  comunque con l'ultima temperatura nota e budget 0.
- **La zona mostra il badge `switch_valve`** → la zona usa uno `switch`:
  nessun feedback di posizione, quindi le conferme sono ottimistiche e le
  garanzie ridotte (vedi la matrice di degradazione nel README).
- Diagnostica: pagina dell'integrazione → menu a tre puntini → **Scarica
  diagnostica** (configurazione + stato, con dati sensibili oscurati).
