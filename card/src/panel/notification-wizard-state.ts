import type { HomeAssistant } from "../types";

/**
 * The wizard's pure logic: which events a preset selects, and which
 * `set_notifications` calls a selection turns into.
 *
 * The verdict itself is NOT computed here — it comes from the backend's
 * `notification_status`, so "mute" has one implementation rather than one in
 * Python for Repairs and a second one here for the banner.
 */

export const NOTIFY_GROUP_ORDER = ["critical", "operational", "informational"] as const;

/** Mirrors ALL_EVENTS in notify.py, in the same order. */
export const ALL_EVENT_ORDER: readonly string[] = [
  "watchdog",
  "anomaly",
  "leak",
  "skipped",
  "interrupted",
  "cancelled",
  "completed",
  "sentinel",
  "session_overrun",
  "consumption_budget",
];

export type NotifyGroup = (typeof NOTIFY_GROUP_ORDER)[number];
export type NotifyPriority = "high" | "normal";
export type WizardPreset = "recommended" | "critical" | "all";

export interface EventStatusResponse {
  event: string;
  group: string;
  enabled: boolean;
  services: string[];
  missing: string[];
  /** The resolved priority, for display: what is stored, or the default. */
  priority: string;
  /** Exactly what is stored, with no default applied — null when nothing is. */
  stored_priority: string | null;
  essential: boolean;
  reachable: boolean;
}

export interface NotificationStatusResponse {
  verdict: "ok" | "partial" | "silent";
  groups: Record<string, string[]>;
  recommended: string[];
  enabled_without_target: string[];
  unreachable: Record<string, string[]>;
  available_services: string[];
  events: EventStatusResponse[];
}

export interface WizardSelection {
  recipients: string[];
  events: string[];
  priorities: Record<string, NotifyPriority>;
}

export interface SetNotificationsCall {
  events: string[];
  enabled: boolean;
  services?: string[];
  priority?: NotifyPriority;
}

export interface Recipient {
  service: string;
  label: string;
  /** Stored as a recipient but no longer registered on this instance. */
  missing?: boolean;
}

/**
 * Never offered as a recipient. The notify integration registers
 * `send_message` as an ENTITY service, so `hass.services.notify` always
 * carries it, but it needs an `entity_id`: called with only a title and a
 * message it resolves to zero entities and reports success while delivering
 * nothing — the configured-looking-but-mute state this wizard exists to
 * prevent. `persistent_notification` is a plain service and a real target,
 * so it is deliberately not in here.
 */
const NEVER_A_RECIPIENT: ReadonlySet<string> = new Set(["send_message"]);

/** The notify services this instance actually has, sorted by name. */
export function discoverRecipients(hass: HomeAssistant): Recipient[] {
  const notify = (hass.services as Record<string, Record<string, { name?: string }>>)?.notify;
  if (!notify) return [];
  return Object.keys(notify)
    .filter((service) => !NEVER_A_RECIPIENT.has(service))
    .sort()
    .map((service) => ({ service, label: notify[service]?.name || service }));
}

/**
 * The rows step 1 has to draw: every discovered recipient, then every
 * recipient still selected that this instance no longer has.
 *
 * The second half is what makes a vanished recipient removable. Its
 * `notify_target_missing` repair is an ERROR telling the user to open the
 * wizard and pick a recipient that exists; without a row of its own the dead
 * one has no checkbox to clear, so `buildSaveCalls` writes it straight back
 * on every Save and the issue re-raises forever.
 */
export function recipientRows(hass: HomeAssistant, selected: readonly string[]): Recipient[] {
  const discovered = discoverRecipients(hass);
  const known = new Set(discovered.map((recipient) => recipient.service));
  const gone = [...new Set(selected)]
    .filter((service) => !known.has(service))
    .sort()
    .map((service) => ({ service, label: service, missing: true }));
  return [...discovered, ...gone];
}

export function presetSelection(preset: WizardPreset, status: NotificationStatusResponse): string[] {
  if (preset === "recommended") return [...status.recommended];
  if (preset === "critical") return [...(status.groups.critical ?? [])];
  return status.events.map((event) => event.event);
}

/**
 * What the wizard opens on: what is already configured, or — when nothing is —
 * the recommendation, so accepting the proposal is one click.
 */
export function selectionFromStatus(status: NotificationStatusResponse): WizardSelection {
  const configured = status.events.filter((event) => event.enabled);
  const recipients = [...new Set(configured.flatMap((event) => event.services))];
  const priorities: Record<string, NotifyPriority> = {};
  // Seeded from `stored_priority`, never from `priority`. `priority` is the
  // RESOLVED value, so an enabled event that has never had a priority stored
  // still reports the backend's default there — seeding from it would pin
  // that default explicitly on the very first Save, and notify.py treats a
  // stored priority as taking precedence over its own default from then on.
  // `stored_priority` is null exactly when nothing is stored.
  for (const event of configured) {
    if (!event.stored_priority) continue;
    priorities[event.event] = event.stored_priority === "high" ? "high" : "normal";
  }
  return {
    recipients,
    events: configured.length ? configured.map((event) => event.event) : [...status.recommended],
    priorities,
  };
}

/**
 * A selection as `set_notifications` calls: one per distinct (priority) group
 * of enabled events, plus one that switches every other event off.
 *
 * Grouped rather than one call per event because each call rewrites the hub
 * options and wakes the update listener; nine of them for one Save is nine
 * config reloads.
 */
export function buildSaveCalls(selection: WizardSelection): SetNotificationsCall[] {
  const chosen = new Set(selection.events);
  if (chosen.size > 0 && selection.recipients.length === 0) {
    // The backend refuses this too. Failing here keeps the user in the wizard
    // with an explanation instead of a service error toast.
    throw new Error("Choose at least one recipient before enabling an event.");
  }
  const calls: SetNotificationsCall[] = [];
  // Bucket by the RAW per-event value, including "not present" as its own
  // bucket — not by a "?? normal"-resolved value. An event with no explicit
  // priority must never share a bucket with one that has an explicit
  // "normal", or it would inherit that explicit value and gain a priority it
  // never asked for.
  const byPriority = new Map<NotifyPriority | undefined, string[]>();
  // Bucketed from `chosen`, not from `selection.events`: a duplicated entry
  // would otherwise be repeated inside the call's `events` list. The wizard's
  // `_toggleEvent` cannot produce one, but this function is pure and takes
  // whatever selection it is handed.
  for (const event of chosen) {
    const priority = selection.priorities[event];
    byPriority.set(priority, [...(byPriority.get(priority) ?? []), event]);
  }
  for (const [priority, events] of byPriority) {
    const call: SetNotificationsCall = {
      events,
      enabled: true,
      services: [...selection.recipients],
    };
    // Only send a priority the user actually chose for these events.
    // Omitting it lets the backend apply its own default, which is high for
    // the essential events — sending "normal" here would quietly and
    // permanently override that default (notify.py's write path treats a
    // stored priority as taking precedence over default_priority).
    if (priority !== undefined) {
      call.priority = priority;
    }
    calls.push(call);
  }
  const rest = ALL_EVENT_ORDER.filter((event) => !chosen.has(event));
  if (rest.length) calls.push({ events: rest, enabled: false });
  return calls;
}
