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
   - **Flussometro di linea** (opzionale) — un flussometro condiviso sul
     collettore, usato da ogni zona senza flussometro proprio. L'unità che
     dichiara (m³/h, L/h, gal/min, …) viene rilevata e convertita
     automaticamente in L/min; a un flussometro che non dichiara nulla di
     utilizzabile si può assegnare un'unità esplicita nelle impostazioni
     **Meteo e sensori** del pannello (§6) — svuotarla riprende il
     rilevamento. Finché l'unità non è nota, il flussometro conta come
     assente (vedi la matrice di degradazione nel README).
   - **Valvola master / pompa** (opzionale) — `valve` o `switch` aperta prima
     della prima zona di ogni sessione e chiusa dopo l'ultima.

L'hub nasce con default sensati; tutto il resto è nelle impostazioni del
pannello **Irrigazione** (§6) e nelle zone che aggiungerai — il menu
**Configura** dell'hub contiene solo i parametri avanzati del motore meteo
(§3).

## 2. Aggiungere le zone

Le zone — e i programmi di irrigazione al loro interno — si creano e si
modificano dal pannello laterale **Irrigazione**, non dalla pagina
dell'integrazione: la procedura completa è al §6 più sotto (il modulo
della zona, la procedura guidata per i programmi, la griglia dei giorni e
l'editor della curva). In breve: apri il pannello, premi **＋ Aggiungi
zona**, dai un nome e un'entità `valve` o `switch` alla zona, e questa nasce
già con un programma predefinito sensato (tutti i giorni, all'alba, con una
curva di risposta al caldo di default) pronto da rifinire. I campi
aggiuntivi della zona — flussometro con la sua unità sovrascrivibile, portata
nominale/tolleranza, fattore di aggiustamento (default 100% — es. 70% per
un'aiuola in ombra), ordine, cadenza in giorni, mesi di stagione, gruppo di
compatibilità — si trovano dietro **✎ Modifica zona → Avanzate**. Gli ID dei
programmi (cicli) sono stabili: storico e interruttori per ciclo
sopravvivono alle modifiche.

La curva di un programma — la relazione temperatura→durata, con i limiti
min/max espliciti ("Mai meno di" / "Mai più di") e un tipo esplicito, durata
o volume — si modifica dal vivo con l'editor a punti di controllo (§6, e §5
per lo stesso editor sulla card): aggiungi, rimuovi, trascina o digita ogni
punto, con un'anteprima del risultato a sette temperature di riferimento.
Salvare una curva riporta l'intensità di irrigazione del programma —
uniforme o per singolo giorno — ai valori della curva stessa; l'editor
avvisa prima, se c'è qualcosa da perdere. Il servizio `set_curve` (Strumenti
per sviluppatori → Azioni; vedi l'elenco dei servizi nel README) imposta una
curva allo stesso modo da un'automazione o da un'importazione via script.

**L'ordine delle zone** è l'entità number di ogni zona (o il servizio
`set_zone_order`) — volutamente non c'è drag-and-drop nel pannello.

## 3. Opzioni dell'hub (Configura)

*Impostazioni → Dispositivi e servizi → Irrigation Maestro → Configura* ora
apre direttamente su un'unica sezione:

- **Motore (avanzate)**: ogni peso e soglia del motore decisionale meteo,
  con interruttore di **reset ai default**. Qui vivono anche i mesi di
  stagione, la soglia di meteo scaduto e la relativa policy fail-open/
  fail-closed — resta un passo del config flow perché è validato sui campi
  e volutamente fuori dalla portata del pannello.

Le impostazioni generali (ritardi pre/post della master, zone simultanee
massime, gruppi di compatibilità), sicurezza e tempi, restrizioni, notifiche
e budget di consumo sono passate tutte al pannello, in
**⚙️ Impostazioni** (§6) — questa pagina non le offre più. Anche l'entità
meteo e i suoi sensori, impostati una volta nella configurazione iniziale
qui sopra, da quel momento in poi si modificano da lì.

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
**Modifica curva**. L'editor mostra la curva come grafico dal vivo e come
elenco di punti di controllo: aggiungi un punto, rimuovine uno, oppure
trascina o digita temperatura e valore di ciascuno. Il grafico, l'anteprima
alle sette temperature di riferimento e la riga 'con il meteo di oggi' si
aggiornano mentre modifichi. *Mai meno di / Mai più di* impostano i limiti
assoluti applicati dopo la curva ed eventuali variazioni d'intensità, e per
le zone con un flussometro compare anche il selettore durata/volume.
Salvare riporta l'intensità di irrigazione del programma — uniforme o per
singolo giorno — ai valori della curva stessa; l'editor avvisa prima, se
c'è qualcosa da perdere. Il servizio `set_curve` (Strumenti per sviluppatori
→ Azioni) imposta una curva allo stesso modo da un'automazione.

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
4. Le impostazioni **avanzate** di un programma — lo stesso editor a punti
   di controllo della card (§5): aggiungi, rimuovi, trascina o digita ogni
   punto, imposta i limiti *Mai meno di / Mai più di* e il tipo durata/
   volume, e vedi l'anteprima del risultato a sette temperature di
   riferimento — per i programmi che scalano la durata con la temperatura
   invece di un valore fisso. Salvare una curva riporta l'intensità di
   irrigazione del programma ai valori della curva stessa; l'editor avvisa
   prima. Dietro un cassetto (drawer), chiuso per default.
5. **＋ Aggiungi zona** (accanto alle schede zona) apre un modulo breve —
   nome, entità valvola (o switch), area — e crea la zona con un programma
   predefinito sensato, pronto da rifinire. **✎ Modifica zona** (sopra
   l'elenco programmi, per la zona selezionata) apre lo stesso modulo
   precompilato, più un cassetto **Avanzate** per il flussometro (con la
   sua unità — rilevata automaticamente, o sovrascritta quando non
   dichiara nulla di utilizzabile; svuotare la sovrascrittura riprende il
   rilevamento), portata nominale/tolleranza, correzione %, ordine,
   intervallo di irrigazione, deroga ai mesi di stagione e gruppo di
   compatibilità — si aggiornano solo i campi che modifichi. Il pulsante
   **🗑 Elimina zona** (con richiesta di conferma) rimuove la zona.
6. **⚙️ Impostazioni**, nell'intestazione, contiene le impostazioni
   quotidiane dell'hub, ciascuna salvata per conto proprio: **Meteo e
   sensori** (entità meteo, sensori pioggia/temperatura esterna/
   flussometro di linea e la sovrascrittura della sua unità, valvola
   principale), **Budget di consumo** (litri al mese e
   azione al superamento — notifica, riduci, sospendi), **Restrizioni
   calendario** (giorni consentiti, parità pari/dispari, finestre orarie
   vietate) e **Notifiche** (una procedura guidata in tre passi: i
   destinatari si scelgono tra i servizi `notify.*` che l'istanza ha
   davvero — mai digitati, ciascuno con un pulsante di invio di prova — gli
   eventi si scelgono per preset (*Consigliato*, *Solo critici*, *Tutto*) su
   tre gruppi di gravità apribili, con un chip di priorità per evento, poi
   un riepilogo da salvare; i cinque eventi che un impianto di irrigazione
   non dovrebbe mai perdere — watchdog, anomalia, sentinella, ciclo
   interrotto, perdita d'acqua — arrivano già preselezionati; i salti con
   lo stesso motivo producono comunque una sola notifica aggregata). Due
   cassetti **Avanzate**, chiusi per default, contengono il resto: **sessione e
   sicurezza** (durata massima di sessione, orario must-finish-by, attesa
   valvole libere, finestra di blocco dopo uno stop manuale, pausa di
   assestamento tra zone, orario della sentinella) e **valvole e
   concorrenza** (finestre di conferma apertura/chiusura/switch, timeout di
   chiusura all'avvio, massimo del watchdog, zone simultanee massime e
   gruppi di compatibilità, ritardi pre-apertura/post-chiusura della
   valvola master).

I parametri esperti — pesi e soglie del motore meteo (§3 sopra) — non sono
nel pannello: restano nel menu **Configura** dell'hub (il config flow), che
resta anche il modo per fare la **configurazione iniziale** dell'hub. Tutto
il resto che "Configura" offriva un tempo, tempistiche di sicurezza e
instradamento delle notifiche compresi, è ormai un'impostazione del
pannello come le altre (punto 6 sopra), non più un passo del config flow.
Le zone e i programmi, invece, si creano e si modificano solo dal pannello
— il config flow non ha più un passo per le zone, quindi non c'è nulla da
tenere sincronizzato.

Il pannello e la card della dashboard leggono e scrivono gli stessi
programmi: usa l'uno, l'altra, o entrambi — non serve migrare nulla. La card
(§5 sopra) continua a funzionare esattamente come oggi.

## 7. L'acqua: sensori, dashboard e aggiornamento dalla 3.2.x

Dalla 3.3.0 il flusso letto da un flussometro viene integrato **in continuo**,
non più soltanto mentre un ciclo è in corso: una valvola che gocciola, un
rubinetto aperto a mano o un ciclo finito male ora si vedono. I litri vanno
alla zona la cui **valvola risulta aperta** — non alla zona che il ciclo dice
di stare irrigando: durante la conferma di apertura, durante la pre-apertura
della master e soprattutto quando una chiusura fallisce le due cose non
coincidono, e la valvola aperta è il fatto fisico.

Ne nascono due sensori:

- **Acqua totale** (`zone_water_total`, uno per zona) — i litri complessivi
  della zona, da sempre. Come attributi porta `today_l` e `month_l` (oggi e
  mese in corso, ricavati dallo stesso storico giornaliero che alimenta il
  totale, quindi non possono discordare da esso), `estimated` e `source`
  (`measured`, `nominal`, `mixed`, `none`: come sono stati ottenuti quei
  litri), `meter_entity` (il flussometro che effettivamente alimenta la zona:
  il suo, altrimenti quello di linea, altrimenti nessuno) e `last_gap_at`.
- **Acqua non attribuita** (`hub_unattributed_water`, sull'hub) — i litri che
  un flussometro ha misurato senza che nessuna zona li reclamasse. Il totale
  comprende il riempimento della linea durante la pre-apertura della master,
  che è acqua reale di nessuna zona e non è una perdita; l'attributo
  `closed_l` è il solo sottoinsieme misurato mentre **ogni** valvola gestita
  risultava chiusa, ed è quello che conta come indizio di perdita.

Entrambi dichiarano `device_class: water` e `state_class: total_increasing`:
è ciò che li fa registrare nelle statistiche a lungo termine di Home
Assistant e li rende utilizzabili nella **dashboard Acqua**. Per questo
nessuno dei due ha un'entità gemella "oggi" o "questo mese" — quelle cifre le
produce già il motore delle statistiche, e una seconda entità con lo stesso
dato sarebbe una seconda cosa che può sbagliare.

Un flussometro che non si può leggere — non disponibile, o con l'unità di
misura non più riconoscibile — non produce litri: interpolare inventerebbe
acqua, e contare zero affermerebbe che non ne è passata, cosa che di un
intervallo non osservato nessuno può affermare. Al suo posto viene registrato
quanto è durato il buco, attribuito come lo sarebbero stati i litri: alle
zone che stavano irrigando, o all'acqua non attribuita se non ne stava
irrigando nessuna. `last_gap_at` sul sensore della zona dice quando è finito
l'ultimo buco capitato **mentre quella zona irrigava** (vuoto finché non
capita). Senza quel dato un'interruzione di sei ore sarebbe indistinguibile
da un pomeriggio tranquillo.

Un dettaglio onesto su quell'attributo: un flussometro illeggibile non fa
scrivere niente su disco per conto proprio. Sarebbe una riscrittura al minuto,
per sempre, per un'entità sbagliata o cancellata — e su una scheda SD non è un
dettaglio. I secondi non osservati viaggiano quindi insieme al primo
aggiornamento che serve ad altro (litri che arrivano, la fine di un ciclo, la
manutenzione di mezzanotte). Durante un guasto in cui non scorre acqua da
nessuna parte l'attributo può restare indietro anche di ore rispetto a quanto
è già stato registrato: il dato non è perso, semplicemente non è ancora
pubblicato.

### Aggiornare dalla 3.2.x: la catena costruita a mano si può cancellare

Se accanto all'integrazione tenevi la solita catena di helper per contare
l'acqua, ora è ridondante:

- l'helper **`integration`** (somma di Riemann) che trasformava i L/min del
  flussometro in litri;
- l'**`utility_meter`** che tagliava quel totale in cicli giornalieri e
  mensili;
- i **template sensor** che lo suddividevano per zona.

Li sostituiscono i due sensori qui sopra più le statistiche di Home
Assistant. Cancellali quando ti sei convinto che i nuovi sensori leggono
quello che ti aspetti: cancellarli è il senso di questa release.

Lo storico **non** viene importato. I nuovi sensori partono da zero al
momento dell'aggiornamento, e il vecchio contatore mensile dei consumi viene
riportato una sola volta come saldo di apertura del periodo in corso, così il
budget continua a valere fino a fine mese (se un saldo da riportare c'era,
una segnalazione in Riparazioni te lo dice, una volta sola). È una scelta
deliberata, non un limite da aggirare: i dati precedenti non contano
abbastanza da giustificare un travaso che mescolerebbe litri misurati e litri
stimati sotto un'indicazione di provenienza di cui non ci si potrebbe più
fidare.

### Zone senza flussometro

Una zona che non ha un flussometro — né il suo né quello di linea — pubblica
comunque il suo sensore dell'acqua e compare comunque nella dashboard Acqua,
accanto alle zone misurate. I suoi litri sono **stimati** a fine ciclo come
**portata nominale (L/min) × minuti** e sono marcati come tali: attributo
`estimated: true`, `source` `nominal` (o `mixed`, se in passato la zona ha
avuto anche letture vere), badge *stimato* nella riga della card e
contrassegno giorno per giorno nello storico. Escluderla è stato valutato e
scartato: la tendenza di lungo periodo di una zona è più utile con un
contributo stimato che con un buco silenzioso, purché sia dichiarato — e qui
è dichiarato in più modi, non in uno solo.

Serve però la **portata nominale** della zona (**✎ Modifica zona →
Avanzate**, §6). Senza flussometro e senza portata nominale non si registra
nulla, e il sensore lo dice con `source: "none"` invece di spacciare per
misura uno zero. Da ricordare inoltre che su una zona stimata l'acqua che
scorre **fuori** dai cicli è invisibile per costruzione: per quella zona la
rilevazione dell'acqua non attribuita — e quindi delle perdite — non è
disponibile.

## 8. Risoluzione dei problemi

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
