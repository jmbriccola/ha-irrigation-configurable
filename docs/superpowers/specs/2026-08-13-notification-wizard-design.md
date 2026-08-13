# Guided notification setup — design

**Date**: 2026-08-13
**Scope**: feature A of two. Ships on `feat/notification-wizard`, merged before
feature B (flow sensor units) starts.

## The defect

Notifications are inert by default and easy to half-configure, and nothing
says so.

`Notifier.async_notify` has two silent exits:

```python
config = self._config_getter().get(event_key, {})
if not config.get(CONF_NOTIFY_ENABLED, False):
    return                      # exit 1: absent means False
...
for service in config.get(CONF_NOTIFY_SERVICES, []):
    ...                         # exit 2: an empty list loops over nothing
```

A field install had exactly this in its options after a configuration attempt:

```json
"notifications": {"interrupted": {"enabled": true, "services": []}}
```

One event out of nine, enabled, with no recipients: completely mute, with the
appearance of being configured. Before that the key was absent entirely, so the
watchdog and the sentinel — the events that exist to report that something went
wrong — were mute too.

### A third silent exit, found while reading the code

The panel's notification field (`card/src/panel/settings-view.ts:784`) shows the
placeholder `notify.mobile_app_phone`, but `Notifier` calls
`hass.services.async_call("notify", service)`. Following the placeholder
literally stores `notify.mobile_app_phone`, and the integration then invokes
`notify.notify.mobile_app_phone`, which does not exist. `has_service` returns
False, the send is skipped, and a warning goes to the log. The current
interface actively guides the user into a broken configuration.

The wizard closes this by construction — recipients are picked, never typed —
and `set_notifications` normalises a `notify.` prefix so a hand-written call or
an imported config is repaired rather than silently dropped.

## Where the guided path lives

**In the panel**, replacing the flat nine-row notifications section.

The project rule from 2.1.0 (`MEMORY.md`) is *one editor per setting*: every
setting except the weather engine is edited in the panel, and a config-flow
step must not be re-added for something the panel already edits. Notifications
are already edited in the panel. Moving them to the options flow would reverse
a deliberate decision; adding a second editor there would be the duplicated
surface the rule exists to prevent.

Findability — the brief's real requirement — is solved without a second
editor:

- a Repairs issue fires exactly when the user has the problem ("you will not be
  notified"), which is where someone who does not know the feature exists will
  actually meet it;
- the `notification_status` service reports the same verdict from Developer
  Tools → Actions, and `diagnostics.py` carries it in the downloadable
  diagnostics, so the mute state is inspectable without opening `.storage`;
- the panel is a permanent sidebar entry, not a page you have to know about.

## Two sets of events, not one

The brief asks for grouping by severity *and* for a recommended default set.
These are different partitions and must not be conflated: the recommended
events span all three groups.

```python
# notify.py — presentation only, drives the wizard's three collapsible groups
GROUP_CRITICAL       = (EVENT_WATCHDOG, EVENT_ANOMALY)
GROUP_OPERATIONAL    = (EVENT_SKIPPED, EVENT_INTERRUPTED, EVENT_CANCELLED)
GROUP_INFORMATIONAL  = (EVENT_COMPLETED, EVENT_SENTINEL,
                        EVENT_SESSION_OVERRUN, EVENT_CONSUMPTION_BUDGET)

# The events that must reach the user. One set, four consumers.
ESSENTIAL_EVENTS = frozenset({
    EVENT_WATCHDOG, EVENT_ANOMALY, EVENT_SENTINEL, EVENT_INTERRUPTED,
})
```

`ESSENTIAL_EVENTS` governs four behaviours at once, which is why it is one
constant and not four lists:

1. the events the wizard proposes pre-selected;
2. the events whose default priority is `high`;
3. the events whose vanished recipient raises a Repairs issue rather than a log
   warning;
4. the definition of "mute" used by the Repairs check and the diagnostics.

`GROUP_*` is presentation only. The union of the three groups must equal the
nine event keys; a test asserts it, so a new event cannot be added to
`notify.py` without being classified.

## Backend

### `notify.py`

- `async_notify` default priority becomes `high` for `ESSENTIAL_EVENTS` and
  `normal` otherwise, instead of `normal` for everything. Existing call sites
  that pass `force_priority="high"` keep winning.
- When `has_service("notify", service)` is False:
  - event in `ESSENTIAL_EVENTS` → `ir.async_create_issue` with id
    `notify_target_missing_<service>`, severity ERROR, listing the service and
    the events that route to it;
  - otherwise → the current log warning, unchanged.
  - The issue is deleted on the first successful send to that service, so a
    target that comes back does not leave a stale issue.
- A pure helper `evaluate_notifications(config, known_services)` returns the
  verdict used by Repairs, diagnostics and the panel. It is pure so it can be
  unit-tested without a hass instance:

  ```python
  @dataclass(frozen=True)
  class NotificationStatus:
      verdict: Literal["ok", "partial", "silent"]
      enabled_without_target: tuple[str, ...]   # enabled, zero recipients
      unreachable: dict[str, tuple[str, ...]]   # service -> events routed to it
      per_event: dict[str, EventStatus]
  ```

  `silent` means no event in `ESSENTIAL_EVENTS` has a reachable recipient —
  the safety net is off. `partial` means some essential events are covered and
  some are not. `ok` means all four are covered.

### `services.py`

`set_notifications` changes:

- **Validation after the merge, not before.** The service is a partial update,
  so enabling an event that already has an empty stored list must fail the same
  way as sending both at once. Validate the resulting event config: `enabled`
  true with zero services → `ServiceValidationError`, translation key
  `notify_enabled_without_target`.
- **Normalisation.** Each entry is stripped of a leading `notify.`, trimmed,
  and validated as a service-name slug. An entry that is not a slug is
  refused (`invalid_notify_service`). Unknown-but-well-formed names are
  accepted: a `notify` service can register after us, and refusing here would
  block a legitimate configuration.
- **New `priority` field**, `high` | `normal`.
- **New `events` field**, a list, mutually exclusive with `event` (exactly one
  required). This is what lets the wizard save nine events in two calls instead
  of nine, without weakening the property the existing docstring protects: a
  call still only touches the events it names.

Two new services, both declared in `services.yaml` **and** registered in
`async_setup_services` (two distinct places in the file):

- `test_notification` — `SupportsResponse.ONLY`. Takes `services` (list) and an
  optional `event` for priority shaping; sends the test message and returns
  per-recipient `{"sent": bool, "error": str | None}`. This is the only way the
  user learns they picked the right target before it matters.
- `notification_status` — `SupportsResponse.ONLY`. Returns the groups, the
  recommended set, the per-event state, the discovered `notify.*` services and
  the verdict. It is the wizard's data source **and** the readable diagnostic
  the brief asks for. It is deliberately not folded into `export_config`:
  that payload is also `import_config`'s input, and derived data has no place
  in it.

### Repairs

Raised at setup and re-evaluated on every options update:

| id | severity | when |
|---|---|---|
| `notifications_enabled_without_target` | ERROR | any event enabled with zero recipients — the field install's exact state |
| `notifications_silent` | WARNING | no essential event reaches anyone |
| `notify_target_missing_<service>` | ERROR | a configured recipient of an essential event no longer exists |

All `is_fixable=False`; the translated text names the events or services and
points at Irrigazione → Impostazioni → Notifiche. All are deleted as soon as
the condition clears, so a fixed configuration does not leave residue.

`notifications_enabled_without_target` is kept even though `set_notifications`
now rejects that shape: validation prevents new ones, the issue surfaces the
ones already stored in existing installs.

### `diagnostics.py`

A `notifications` key carrying the `NotificationStatus` payload, next to the
raw `options`. Nothing here is location-sensitive, so the existing redaction
set is unchanged.

No new sensor. The state is already reachable from Developer Tools and from
the diagnostics download; a new entity would extend the card contract
(`maestro_role`) for a value nothing renders.

## Panel

`_renderNotificationsSection` is replaced. State comes from
`notification_status`, so the "mute" verdict has exactly one implementation and
the card mirrors labels and ordering only.

- **Banner** when the verdict is `silent` or `partial`: what will not reach the
  user, and a button that opens the wizard.
- **Step 1 — Recipients.** A multi-select of the `notify.*` services actually
  present, read from `hass.services.notify` (no backend round-trip needed for
  discovery), showing each service's friendly name. Per recipient, an *Invia
  prova* button calling `test_notification`, with ✓ / ✗ and the error text.
- **Step 2 — Events.** A preset row — *Consigliato* (the four essential
  events, pre-selected on first entry), *Solo critici*, *Tutto*,
  *Personalizza* — over three collapsible groups with a per-event checkbox and
  a priority chip. Accepting the proposal is one click; nobody has to read nine
  descriptions to get the minimum.
- **Step 3 — Summary and save.** What goes where. Save is blocked client-side
  when the selection has zero recipients, and refused server-side anyway.

Italian and English in `card/src/localize/{it,en}.ts`; integration strings in
`translations/{en,it}.json`.

## Testing

Backend:

- `enabled: true` with `services: []` → refused, both when sent together and
  when `enabled` alone is flipped on an event whose stored list is empty.
- `notify.mobile_app_x` is stored as `mobile_app_x`; a non-slug entry is
  refused.
- Absent notification config → no exception anywhere, and the status reports
  `silent`.
- A recipient that no longer exists → Repairs issue for an essential event, log
  warning only for a non-essential one; the issue is deleted after the service
  returns and a send succeeds.
- Default priority is `high` for the four essential events and `normal`
  otherwise.
- The recommended set contains `watchdog`, `anomaly`, `sentinel`,
  `interrupted`.
- The three groups partition the nine event keys exactly.
- `notifications_enabled_without_target` is raised for the field install's
  stored shape and cleared once fixed.
- `test_notification` reports per-recipient success and failure.
- `set_notifications` with `events` writes every named event and leaves the
  others untouched; `event` and `events` together are refused.

Card:

- the *Consigliato* preset selects exactly the four essential events;
- save groups the nine events into calls by identical payload;
- save is blocked with zero recipients;
- the banner appears for `silent` and `partial` and not for `ok`.

## Out of scope

The decision engine is untouched: `engine/weather.py`, `engine/curves.py`,
`engine/evaluate.py`, `engine/history.py`, the preset control points, and every
weight, threshold and budget. No YAML configuration, no blocking I/O.

## Delivery

`manifest.json` bumped to 3.1.0, `CHANGELOG.md` entry, both translation files
complete, PR against `main` stating where the guided path lives and why.
