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

Le zone — e i programmi di irrigazione al loro interno — si creano e si
modificano dal pannello laterale **Irrigazione**, non dalla pagina
dell'integrazione: la procedura completa è al §6 più sotto (il modulo
della zona, la procedura guidata per i programmi, la griglia dei giorni e
l'editor della curva). In breve: apri il pannello, premi **＋ Aggiungi
zona**, dai un nome e un'entità `valve` o `switch` alla zona, e questa nasce
già con un programma predefinito sensato (tutti i giorni, all'alba, con una
curva di risposta al caldo di default) pronto da rifinire. I campi
aggiuntivi della zona — flussometro, portata nominale/tolleranza, fattore di
aggiustamento (default 100% — es. 70% per un'aiuola in ombra), ordine,
cadenza in giorni, mesi di stagione, gruppo di compatibilità — si trovano
dietro **✎ Modifica zona → Avanzate**. Gli ID dei programmi (cicli) sono
stabili: storico e interruttori per ciclo sopravvivono alle modifiche.

La curva di un programma — la relazione temperatura→durata, con i limiti
min/max espliciti e le opzioni volume o cycle-and-soak — si rimodella dal
vivo con l'editor a due slider (§6, e §5 per lo stesso editor sulla card).
Una curva che richiede più di tre punti di controllo, o punti impostati per
coordinate esatte, si imposta invece con il servizio `set_curve` (Strumenti
per sviluppatori → Azioni; vedi l'elenco dei servizi nel README).

**L'ordine delle zone** è l'entità number di ogni zona (o il servizio
`set_zone_order`) — volutamente non c'è drag-and-drop nel pannello.

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
di* e ti fa trascinare i tre punti. Le curve con più di tre punti, o
impostate per coordinate esatte, si modificano con il servizio `set_curve`
(Strumenti per sviluppatori → Azioni).

## 6. Il pannello "Irrigazione"

Apri la voce **Irrigazione** nella barra laterale di Home Assistant (icona a
irrigatore) — è l'**hub di configurazione** quotidiano: un'alternativa a
schermo intero alla card per gestire i programmi, più la gestione delle zone
e le impostazioni quotidiane dell'hub, tutto in un unico posto.

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
4. Le impostazioni **avanzate** di un programma — la curva di risposta al
   caldo (lo stesso editor a due slider della card, "quanta acqua" / "quanto
   di più quando fa caldo") per i programmi che scalano la durata con la
   temperatura invece di un valore fisso — sono dietro un cassetto (drawer),
   chiuso per default.
5. **＋ Aggiungi zona** (accanto alle schede zona) apre un modulo breve —
   nome, entità valvola (o switch), area — e crea la zona con un programma
   predefinito sensato, pronto da rifinire. **✎ Modifica zona** (sopra
   l'elenco programmi, per la zona selezionata) apre lo stesso modulo
   precompilato, più un cassetto **Avanzate** per sensore di portata,
   portata nominale/tolleranza, correzione %, ordine, intervallo di
   irrigazione, deroga ai mesi di stagione e gruppo di compatibilità — si
   aggiornano solo i campi che modifichi. Il pulsante **🗑 Elimina zona**
   (con richiesta di conferma) rimuove la zona.
6. **⚙️ Impostazioni**, nell'intestazione, apre tre sezioni salvate
   indipendentemente: **Meteo e sensori** (entità meteo, sensori
   pioggia/temperatura esterna/portata di linea, valvola principale),
   **Budget di consumo** (litri al mese e azione al superamento — notifica,
   riduci, sospendi) e **Restrizioni calendario** (giorni consentiti,
   parità pari/dispari, finestre orarie vietate) — ognuna con il proprio
   pulsante Salva.

I parametri avanzati (pesi/soglie del motore, tempistiche di sicurezza,
instradamento delle notifiche — §3 sopra) non sono nel pannello: restano nel
menu **Configura** dell'hub (il config flow), che resta anche il modo per
fare la **configurazione iniziale** dell'hub. Le zone e i programmi, invece,
si creano e si modificano solo dal pannello — il config flow non ha più un
passo per le zone, quindi non c'è nulla da tenere sincronizzato.

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
