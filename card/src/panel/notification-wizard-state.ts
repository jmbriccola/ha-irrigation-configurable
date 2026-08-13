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
  priority: string;
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
}

/** The notify services this instance actually has, sorted by name. */
export function discoverRecipients(hass: HomeAssistant): Recipient[] {
  const notify = (hass.services as Record<string, Record<string, { name?: string }>>)?.notify;
  if (!notify) return [];
  return Object.keys(notify)
    .sort()
    .map((service) => ({ service, label: notify[service]?.name || service }));
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
  // Only a configured event has a stored priority worth preserving across a
  // re-save. An unconfigured event has none — seeding one for it here would
  // pin it explicitly, and buildSaveCalls would then send it, permanently
  // shadowing the backend's own default for that event (see there).
  for (const event of configured) {
    priorities[event.event] = event.priority === "high" ? "high" : "normal";
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
  for (const event of selection.events) {
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
