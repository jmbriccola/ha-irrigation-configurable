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
nominale/tolleranza, **sensore di perdita**, **sensore di mancanza d'acqua**,
fattore di aggiustamento (default 100% — es. 70% per un'aiuola in ombra),
ordine, cadenza in giorni, mesi di stagione, gruppo di compatibilità — si
trovano dietro **✎ Modifica zona → Avanzate**. Gli ID dei programmi (cicli)
sono stabili: storico e interruttori per ciclo sopravvivono alle modifiche.

I due campi dei sensori arrivano **precompilati dal dispositivo della
valvola** quando lì ce n'è uno: creando una zona si risale dall'entità
valvola al suo dispositivo e si prende come sensore di perdita un
`binary_sensor` con `device_class: moisture` e come sensore di mancanza
d'acqua uno con `device_class: problem`. Il riconoscimento guarda solo la
device class — mai il nome dell'entità — quindi una valvola che non espone
nulla non ottiene nessuno dei due, e una zona che esiste già non viene
collegata a tua insaputa: il pannello propone il candidato, che ha effetto
solo quando salvi. Puoi comunque puntare i due campi dove vuoi: una sonda
nell'aiuola è una scelta legittima, e lo è anche un contatto di rete
condiviso da tutto il giardino. Vedi §8.

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
   rilevamento), portata nominale/tolleranza, il **sensore di perdita** e
   il **sensore di mancanza d'acqua** (§2 e §8), correzione %, ordine,
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
   valvola master e — in fondo allo stesso cassetto, salvate con lo stesso
   pulsante — le **impostazioni di perdita e mancanza d'acqua**: cosa fare
   con una perdita confermata, la soglia di perdita in L/min, la finestra di
   conferma, l'intervallo dei promemoria, **Non partire senza acqua** e quanto
   a lungo debba durare la mancanza prima del rifiuto; vedi §8).

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

## 8. Perdite e mancanza d'acqua

Sono due problemi diversi, con due sensori diversi, e vale la pena tenerli
distinti: una **perdita** è acqua che va dove non dovrebbe, una **mancanza
d'acqua** è acqua che non arriva affatto.

**Una perdita si conferma da due tipi di prova**, e insieme fanno scattare un
solo allarme, non due:

1. il **sensore di perdita** della zona che segnala mentre la valvola *di
   quella zona* è chiusa — su alcune valvole (la SONOFF SWV, per esempio)
   quell'allarme deriva dal flussometro interno della valvola e significa
   «sta passando acqua mentre io sono chiusa»; su altre è una sonda a terra.
   In entrambi i casi ciò che si sa è che la valvola segnala acqua che non
   dovrebbe vedere;
2. **acqua misurata mentre ogni valvola gestita, master compresa, risulta
   chiusa** — sopra la soglia di perdita (default 0,5 L/min; sotto è
   gocciolamento e drenaggio). Questa non richiede nessun sensore, solo un
   flussometro: un impianto di tre zone con il proprio flussometro ciascuna e
   nessun sensore di perdita è sorvegliato su ogni zona.

Entrambe devono durare la finestra di conferma (default 300 s) prima che
venga detto qualcosa. Un flussometro che serve più di una zona non può dire
*quale* zona perde, quindi il suo allarme viene sollevato per l'**impianto**;
le zone dietro a quel flussometro mostrano «perdite sorvegliate
sull'impianto, non su questa zona», che dice dove sono sorvegliate, non se lo
sono.

**Cosa succede alla conferma**: una notifica ad alta priorità (l'evento
`leak` è già preselezionato nella procedura guidata, §6), una segnalazione in
Riparazioni, un promemoria ogni 6 ore per default, e una delle nuove **entità
di perdita** che passa a `on`.

La segnalazione in Riparazioni resta finché resta la condizione, con
un'eccezione che vale la pena conoscere perché sullo schermo non la dice
nessuno: **un riavvio di Home Assistant la fa sparire.** L'allarme vive in
memoria e deliberatamente non viene salvato (vedi i punti sull'entità qui
sotto), quindi la segnalazione se ne va con lui e torna solo quando la prova
è stata raccolta di nuovo, per un'intera finestra di conferma. Lo stesso vale
per la segnalazione di mancanza d'acqua. Quindi una segnalazione sparita la
mattina dopo un riavvio da sola non dimostra niente: è stata dimenticata, non
risolta, e se torni a vederla dipende dalle prove, non dalla segnalazione.

**Le entità di perdita** sono `binary_sensor` con `device_class: problem` —
una per zona più una per l'impianto — ed è su queste che va scritta
un'automazione. Da leggere prima di scriverne una:

- **`unavailable` è normale, e può durare per sempre.** Significa *qui non è
  stato stabilito nulla*: o non c'è niente che possa far scattare l'allarme
  per questa zona, o la zona non è ancora stata osservata abbastanza a lungo.
  Un'automazione scritta su un'entità che non esce mai da `unavailable`
  **non scatta mai, in silenzio**, e il silenzio è identico al buon
  funzionamento. Verifica che l'entità sia passata a `off` prima di fidartene.
- **La sequenza dopo ogni riavvio è: `unavailable`, per una finestra di
  conferma di osservazione, poi `off`** — oppure `on`, se nel frattempo una
  perdita viene confermata. `off` su un sensore `problem` afferma *non c'è
  nessun problema*, e pochi istanti dopo l'avvio non è stato stabilito niente
  del genere, quindi l'entità preferisce tacere. Ne segue che ogni impianto
  sano compie un passaggio `unavailable → off` a ogni riavvio: è il motivo
  per cui l'automazione di rientro qui sotto è scritta così.
- Se l'entità di una zona resta bloccata su `unavailable`, dopo un'ora sono i
  **badge di degrado** della zona a dire perché: *non ha potuto controllare
  le perdite* (niente è stato in condizione di concludere alcunché) oppure
  *non riesce a concludere su una possibile perdita* (qualcosa segnala e
  niente riesce a risolverlo). Nessuno dei due significa che la zona è
  guasta: un'ora di irrigazione a mano da una linea dell'impianto tiene una
  valvola aperta e si legge esattamente allo stesso modo, del tutto
  legittimamente. L'entità dell'**impianto** non ha nessun badge del genere:
  se tace e nessuna zona spiega perché, il flussometro di linea va guardato
  di persona.
- Se hai un flussometro di linea **e** flussometri per zona, una sola perdita
  fa scattare sia l'entità della zona sia quella dell'impianto: misurano la
  stessa acqua e nessuna delle due può sapere che l'ha vista anche l'altra.
  Rendi l'automazione idempotente, oppure scatta su un solo ambito.
- `since` è quando l'allarme è stato **confermato**, non quando l'acqua ha
  iniziato a uscire.

La coppia di automazioni che vogliono quasi tutti è «perdita → chiudi
l'acqua» e «perdita rientrata → riaprila». Si scrive così:

```yaml
automation:
  - alias: Perdita - chiudi l'acqua
    triggers:
      - trigger: state
        entity_id: binary_sensor.alpha_leak
        to: "on"
    actions:
      - action: valve.close_valve
        target:
          entity_id: valve.rubinetto_generale

  - alias: Perdita rientrata - riapri l'acqua
    triggers:
      - trigger: state
        entity_id: binary_sensor.alpha_leak
        # `from: "on"` è portante: limita il trigger a un vero rientro.
        # Senza, scatterebbe anche sul passaggio `unavailable -> off` che
        # ogni riavvio produce, riaprendo l'acqua dopo un riavvio fatto
        # apposta avendola chiusa a mano.
        from: "on"
        to: "off"
    actions:
      - action: valve.open_valve
        target:
          entity_id: valve.rubinetto_generale
```

**Cosa fa il componente** lo scegli tu, in ⚙️ Impostazioni → *Avanzate:
valvole e concorrenza*: solo notifica, notifica e richiude le valvole (il
default), oppure notifica, richiude e blocca i nuovi cicli. Il default non è
quello che blocca, deliberatamente: richiudere una valvola già chiusa non fa
nulla, ed è la posizione onesta — una perdita trovata mentre non si sta
irrigando questa integrazione non può fermarla, può solo segnalarla e
riaffermare la chiusura nel caso un comando sia andato perso. Il blocco c'è
per il caso del tubo scoppiato, ed è opt-in perché un falso allarme che
blocca lascia il giardino a secco.

**Il sensore di mancanza d'acqua** risponde all'altra domanda. È un sensore
di tipo `problem` la cui polarità si legge al contrario del nome: **`on`
significa che l'acqua NON c'è**. Con uno configurato, un ciclo viene
rifiutato invece di partire su una linea vuota — ma solo dopo che la mancanza
è durata la finestra di conferma (default 180 s), così una singola lettura
ballerina non nega l'acqua al giardino; e dopo un riavvio quel conteggio
riparte da zero, perché da quanto tempo manchi l'acqua non è conoscibile.
L'esito si legge `no_water_supply` invece di un generico `no_flow`, e lo
stesso vale per un ciclo già partito che non trova flusso.

Disattivare **«Non partire senza acqua»** toglie il rifiuto e nient'altro: la
notifica e la segnalazione in Riparazioni arrivano lo stesso. Scegliere di
irrigare comunque non è scegliere di non esserne informati. (Quella è la
casella nel pannello; il servizio `set_valve_safety` chiama la stessa
impostazione **Richiedi la presenza d'acqua**, e la chiave salvata è
`require_water_supply`. Tutt'e tre sono attive quando il rifiuto è attivo.)

Due limiti onesti, da conoscere prima di contarci:

- **Una zona senza flussometro non ha nessun controllo di flusso nullo.** Il
  controllo viene costruito solo dove un flussometro si risolve, quindi su
  una zona stimata un ciclo che parte con il rubinetto chiuso va avanti a
  secco per tutta la sua durata e registra la sua stima nominale come se
  avesse irrigato. Nessuno se ne accorge. È esattamente l'impianto su cui un
  sensore di mancanza d'acqua vale di più: un contatto di rete costa poco, i
  flussometri per zona no.
- **Una valvola che si chiude da sola** perché il suo firmware non vede
  flusso, prima faceva abortire l'intera sessione come intervento manuale.
  Ora viene letta per quello che è — ma solo per la valvola della zona che
  sta irrigando, e solo quando il sensore di mancanza d'acqua *di quella
  zona* dice che l'acqua non c'è, in quell'istante o entro cinque secondi.
  Senza quel sensore non c'è modo di distinguere il firmware da una mano
  sull'interruttore, quindi resta il comportamento di prima.

### Provocala apposta, prima di averne bisogno

Niente di tutto questo si dimostra da solo. L'allarme vive in memoria,
l'entità non dice nulla finché non ha osservato abbastanza a lungo, e un
impianto configurato bene che tace è identico a uno configurato male che
tace. Provalo apposta, una volta, in un giorno in cui non c'è niente che non
va.

**Un falso allarme non costa nulla.** L'azione predefinita richiude la master
e la valvola implicata *solo se una delle due risulta ancora aperta*, e a
impianto fermo sono già chiuse entrambe: quindi non parte nessun comando, né
verso le valvole né nel registro dei comandi. Non si irriga nulla, non si
ferma nulla, nessuna valvola si muove. (Mentre un ciclo è in corso la
richiusura viene saltata del tutto, perché una perdita su una zona non deve
far abortire l'irrigazione di un'altra.) L'unica azione con un costo da
valutare è *blocca i nuovi cicli*, e solo perché rifiuta le partenze finché
non togli l'allarme.

**Prima accorcia l'attesa.** ⚙️ Impostazioni → *Avanzate: valvole e
concorrenza* → **conferma della perdita**, mettila a 60 secondi e salva. La
finestra della mancanza d'acqua qui accanto può andare a 30. **Rimettile
com'erano dopo**: 300 s e 180 s sono i valori di default ed è ciò che impedisce
a un sensore ballerino di gridare alla perdita. Abbassarle durante una prova
non toglie nulla di acquisito: un ambito che si è già assestato resta
assestato.

Due delle tre origini hanno una condizione fisica che non puoi creare in
sicurezza, quindi la via onesta è **Strumenti per sviluppatori → Stati →
scegli l'entità → Imposta stato**. Un avvertimento che conta: *il dispositivo
vero sovrascrive il tuo valore alla sua prossima segnalazione.* Un sensore a
batteria che parla solo quando cambia qualcosa può restare zitto per ore e
lasciar correre la prova; un flussometro che segnala ogni pochi secondi ti
sovrascrive quasi subito, ed è il motivo per cui l'origine da flusso conviene
provarla con acqua vera. **Lascia gli attributi esattamente come li trovi**:
un flussometro senza `unit_of_measurement` non registra niente, e la prova
fallirebbe per il motivo sbagliato.

**Origine 1 — il sensore di perdita della valvola.** Metti a `on` il sensore
di perdita della zona mentre la sua valvola è chiusa (lo è, se non si sta
irrigando). Il conteggio parte dal più tardo fra la tua modifica e l'ultima
volta che quella valvola ha segnalato di essere chiusa: in pratica, da adesso.

**Origine 2 — acqua misurata con tutto chiuso.** La prova onesta è con acqua
vera: apri un rubinetto a mano alimentato dalla linea con il flussometro
mentre non si sta irrigando. Per il componente quella *è* una perdita, ed è
esattamente il punto. In alternativa porta il flussometro a un valore sopra
la soglia di perdita (default 0,5 L/min) e lascialo lì. Il flussometro viene
campionato ogni 30 secondi e la finestra conta i secondi **misurati**, quindi
al default servono una decina di campioni — e un flussometro che smette di
segnalare mette in pausa quel conteggio invece di azzerarlo. Una zona senza
flussometro non può provare questa origine: non c'è niente con cui osservare.

Già che sei lì a guardare il flussometro, **annota quanto segna con tutte le
valvole chiuse e nessuna perdita in corso.** È il numero che la soglia di
perdita da 0,5 L/min sta tirando a indovinare, e questo è l'unico momento in
cui misurarlo costa poco: una linea che sta a uno zero vero permette di
abbassare la soglia, una che gocciola mentre si svuota chiede il default o
qualcosa di più. Per l'hardware vero questo dato non ce l'ha ancora nessuno.

**Origine 3 — la mancanza d'acqua.** Metti a `on` il sensore di mancanza
d'acqua della zona, ricordando che `on` significa che l'acqua **non c'è**.
Questa non è una perdita, e le entità di perdita giustamente non si muovono.

**Cosa deve succedere, nell'ordine:**

1. **Niente, per tutta la finestra.** È il motivo numero uno per concludere
   che la funzione è rotta. Ai valori di default sono cinque minuti di
   silenzio per una perdita e tre per la mancanza d'acqua.
2. Poi, per una perdita: una **notifica** ad alta priorità ai destinatari che
   hai configurato; una **segnalazione in Riparazioni** (Impostazioni →
   Dispositivi e servizi → Riparazioni) che nomina la zona e la prova che sta
   citando; l'**entità di perdita** della zona che passa a `on`; il badge
   nella **riga della card**. Un promemoria si ripete ogni 6 ore (default)
   finché non rientra.
3. Per la mancanza d'acqua: notifica e segnalazione in Riparazioni, e nessuna
   perdita da nessuna parte. L'esito interessante è l'**avvio rifiutato**:
   chiama `run_zone` su quella zona, o premi play sulla sua riga nella card, e
   il ciclo viene saltato con esito `no_water_supply`. Gli avvii manuali non
   sono esentati, deliberatamente: chiedere a mano non fa comparire l'acqua
   nel tubo. (Con *Non partire senza acqua* **disattivato**, la segnalazione
   arriva comunque e sparisce solo il rifiuto: per questa prova lascialo
   attivo.)

**Come si rientra, e cosa si vede.** Rimetti a `off` il sensore di perdita e
l'origine si ritira subito; riporta il flusso a zero, o chiudi il rubinetto, e
si ritira al campione successivo del flussometro — è uno zero *misurato* a
ritirarla, ed è anche il motivo per cui il drenaggio dopo un ciclo non lascia
mai un allarme in piedi. Quando si ritira l'ultima origine arrivano una
notifica di rientro, la sparizione della segnalazione in Riparazioni,
l'entità che torna a `off` e il badge che si spegne. Con *blocca i nuovi
cicli* il messaggio dice anche se i cicli sono davvero di nuovo permessi: non
lo sono, se un altro ambito ha ancora un allarme suo. Anche cancellare la
zona mentre il suo allarme è in piedi lo fa rientrare, con la stessa notifica
di rientro, che nomina la zona come era configurata l'ultima volta: un
allarme il cui soggetto non esiste più non verrebbe altrimenti mai ritirato, e
qualsiasi automazione in attesa del cessato allarme aspetterebbe per sempre.

**E per vedere cosa pensa davvero il componente**, scarica la diagnostica
(pagina dell'integrazione → menu a tre puntini → **Scarica diagnostica**) e
leggi la sezione `leaks`. È l'unica finestra su tutto questo, perché niente
di ciò viene scritto su disco: per ogni ambito dice se un'origine è
configurata, se uno stato è stato stabilito, quanti secondi osservabili sono
stati accumulati (`observation.observed_s`) rispetto alla soglia che devono
raggiungere (`observation.window_s` — la finestra di conferma, ma mai meno di
30 s: per questo compare accanto a `confirm_s` e non al suo posto), se
l'ambito può osservare adesso, se sta trattenendo una prova che non riesce a
risolvere, se si è assestato e — in `observation.blocking_valves` — quali
valvole esattamente lo stanno bloccando, elencando solo quelle che non
risultano *né* aperte *né* chiuse, perché una valvola aperta sta irrigando e
non è un guasto. E infine quali flussometri riportano per lui, che è l'unico
modo di confermare dall'esterno che un flussometro di linea condiviso finisce
davvero sull'ambito dell'impianto.

**I valori grezzi che ci troverai.** La card li traduce tutti nella tua
lingua; gli Strumenti per sviluppatori e la diagnostica no, deliberatamente:
quelle parole appartengono alla card, e tenerle in due posti vorrebbe dire
due proprietari per la stessa frase. Cosa dice ciascuno:

- **`valve_sensor`** (in `sources`, `describing_source`, `first_source`) — il
  sensore della valvola stessa segnala una perdita. Sull'hardware di
  riferimento è un allarme derivato dal *flussometro interno* della valvola,
  cioè «sta passando acqua mentre io sono chiusa»; su una vera sonda a terra
  significa che la sonda è bagnata. Non significa che si è vista acqua per
  terra.
- **`no_flow_closed`** (stessi posti) — è stata misurata acqua mentre ogni
  valvola gestita, master compresa, risultava chiusa.
- **`zone` / `system` / `none`** (in `capabilities.leak_watch`) — *dove*
  l'acqua di questa zona è sorvegliata per le perdite: sul suo ambito, su
  quello dell'impianto (un flussometro condiviso con altre zone, quindi
  nessuna zona è nominabile), o da nessuna parte. Indica un luogo, mai un
  verdetto: `system` non vuol dire «non sorvegliata», e una perdita lì fa
  scattare `hub_leak`.
- **`leak_never_observable`** (in `degraded`) — per un'ora di tempo a riposo
  niente qui è stato in condizione di concludere alcunché: un sensore che non
  ha mai parlato, un flussometro che non misura, o una valvola che non
  risulta mai chiusa. **Di per sé non è un guasto**: un'ora di irrigazione a
  mano da una linea dell'impianto si legge esattamente allo stesso modo.
- **`leak_evidence_unresolved`** (in `degraded`) — stessa ora, ma qualcosa
  *sta* segnalando una perdita e niente riesce a finire di giudicarla.
- **`leak_sensor_missing` / `water_supply_sensor_missing`** (in `degraded`) —
  il sensore che avevi scelto non esiste più. La zona continua a dirsi
  configurata, perché quella era una tua scelta e nulla la sovrascrive in
  silenzio.
- **`flow_unit_unknown`** (in `degraded`) — il flussometro c'è ma la sua
  unità di misura non si risolve, quindi i litri, la modalità a volume e le
  anomalie di flusso lo trattano come assente invece di dare per scontati i
  L/min. **La rilevazione delle perdite fa eccezione, ed è quella che conta in
  questo capitolo:** `capabilities.leak_watch` risponde da ciò che è
  *configurato*, senza nessuna prova di usabilità, quindi una zona così legge
  ancora `zone` — mentre l'origine 2 da un flussometro illeggibile non può
  concludere niente. La sua entità di perdita resta perciò `unavailable` per
  sempre; nel frattempo la card dice *Controllo perdite non ancora concluso*,
  e dopo un'ora di tempo a riposo `leak_never_observable` si affianca a
  questa chiave in `degraded` e la card mostra quelle. Sistema l'unità (§1, o
  **Meteo e sensori** nel pannello) oppure togli il flussometro: aspettare non
  produce nessuna risposta.

I motivi di esito che puoi vedere su una zona — `no_water_supply`, `leak`,
`no_flow` — sono spiegati al §10 qui sotto.

## 9. Storico: consumi ed esecuzioni

Due servizi, richiamabili da **Strumenti per sviluppatori → Azioni**,
restituiscono quanto il componente conserva senza aprire `.storage`. Nessuno
dei due scrive nulla.

**Storico dei consumi** (`get_water_history`) restituisce i litri giornalieri
di ogni zona in un intervallo — un punto per giorno, compresi quelli senza
consumo. La densità serve a tenere distinti tre fatti che un'assenza
confonderebbe: un giorno pienamente osservato senza acqua, un giorno in cui il
**flussometro** non era leggibile — che porta i **secondi non osservati**
invece di un litro inventato, così un buco di misura non somiglia a un giorno
tranquillo — e una data fuori dall'intervallo conservato, che resta
sconosciuta. Anche una zona configurata senza consumi nel periodo compare
comunque, con una serie tutta a zero, anziché essere omessa. Le zone senza
flussometro compaiono comunque, con i loro **litri stimati** marcati come
tali. L'**acqua non attribuita** — misurata ma reclamata da nessuna zona — è
restituita accanto alle zone, mai al loro interno: sommare le zone resta
l'operazione giusta. Campi: **Dal** e **Al** delimitano l'intervallo (default:
gli ultimi 30 giorni fino a oggi); **Zone** filtra una o più zone, comprese
quelle rimosse che conservano ancora acqua nello storico; **Includi l'acqua
non attribuita** decide se quel blocco compare nella risposta.

**Storico delle esecuzioni** (`get_run_history`) restituisce ogni esito
registrato — le irrigazioni completate e, non meno importante, quelle
saltate, interrotte o annullate, ciascuna con il suo motivo: un ciclo che non
parte non lascia traccia da nessun'altra parte. Oltre a **Dal**, **Al** e
**Zone**, **Esiti** tiene solo i risultati scelti (vuoto = tutti), e
**Numero massimo di voci** limita la risposta alle più recenti — la risposta
stessa dichiara se ha dovuto tagliare.

Entrambi rifiutano un intervallo con **Dal** successivo ad **Al** anziché
scambiarli in silenzio, e riportano a oggi una data futura in **Al**. Lo
storico delle esecuzioni riparte da zero con questa versione: il registro
precedente teneva solo tre giorni di esiti come stringhe nude e senza motivo,
non abbastanza per ricostruire nulla di onesto.

## 10. Risoluzione dei problemi

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
- **Un'entità di perdita non esce mai da `unavailable`** → per quell'ambito
  non è stato stabilito nulla. Guarda i badge della zona: *perdite non
  sorvegliate qui* significa che non è configurata nessuna origine; *non ha
  potuto controllare le perdite* o *non riesce a concludere su una possibile
  perdita* (dopo un'ora) significano che un'origine c'è ma niente è stato in
  condizione di concludere — un sensore che non ha mai parlato, un
  flussometro la cui unità non si risolve, o una valvola che non risulta mai
  chiusa, che blocca ogni ambito con flussometro. Di per sé non è un guasto:
  un'ora di irrigazione a mano si legge allo stesso modo. Finché dura,
  qualsiasi automazione su quell'entità non sta scattando (§8).
- **«Una valvola non segnala la sua posizione»** → quella valvola non risulta
  né aperta né chiusa: batteria scarica, radio che ha perso il collegamento,
  integrazione cloud in attesa, oppure un'entità cancellata da Home Assistant
  ma rimasta in configurazione. Vale la pena intervenire anche se in
  apparenza non c'è nulla che non va: finché dura, **la rilevazione delle
  perdite tramite flusso è ferma per tutte le zone**, non solo per quella
  valvola, perché quell'origine misura l'acqua mentre *ogni* valvola gestita
  risulta chiusa. Una zona il cui ambito si era già assestato continua a
  pubblicare il suo ultimo `off`, che è una risposta acquisita e non una
  verifica in tempo reale. Ripristina la valvola o toglila dalla
  configurazione: la segnalazione sparisce appena torna a segnalare la sua
  posizione, e da lì ogni zona osserva una nuova finestra di conferma. Una
  segnalazione per ogni valvola in quello stato, dopo un'ora.
- **Tutto saltato come `leak`** → l'azione in caso di perdita è impostata su
  *blocca i nuovi cicli* e c'è un allarme in piedi. Rimuovi la causa: il
  blocco cade con l'allarme. La segnalazione in Riparazioni nomina la zona e
  la prova su cui si basa.
- **Una perdita, due allarmi** → hai un flussometro di linea *e* flussometri
  per zona, quindi la stessa acqua è misurata due volte ed entrambi gli
  ambiti la segnalano. È previsto: vedi la matrice di degradazione nel README.
- **`no_flow`** → il ciclo è partito ma il flussometro non ha misurato
  praticamente nulla per tutta la finestra di tolleranza, quindi è stato
  interrotto. Controlla il rubinetto, il filtro e la linea. Se quella zona ha
  un sensore di mancanza d'acqua e l'acqua manca davvero, l'esito indica
  invece `no_water_supply`: vince la diagnosi più precisa. Una zona **senza**
  flussometro non ha nessun controllo del genere e va avanti a secco per
  tutta la sua durata (§8).
- **`no_water_supply`** → il sensore di mancanza d'acqua della zona segnala
  che l'acqua non c'è e la mancanza è durata la finestra di conferma.
  Controlla il rubinetto, la pressione di rete e ogni intercettazione a
  monte. Ricorda la polarità: `on` su quel sensore significa acqua
  **assente**.
- **«Azione in caso di perdita non riconosciuta»** → il valore salvato non è
  nessuno fra `notify`, `close` e `close_and_block`; il componente è tornato
  a `close` e te l'ha detto invece di bloccare in silenzio. Reimpostalo dal
  pannello.
- Diagnostica: pagina dell'integrazione → menu a tre puntini → **Scarica
  diagnostica** (configurazione + stato, con dati sensibili oscurati).
