// No screen in this app takes a minute to open, so a trace that long is a broken clock, not
// a slow screen: every screen's "initial display" read 1.29 min in one session and 5.18 hours
// in another (traces, 2026-11-10 and 2026-11-12), likely the phone asleep or the app in the
// background mid-trace. Dropped before it's sent, so it doesn't spoil the p95 under Traces.
// ponytail: a flat 60 s cut. If a real minute-long transaction is ever wanted, filter by op.
export const MAX_TRACE_SECONDS = 60;

export function dropImpossibleTraces<T extends { timestamp?: number; start_timestamp?: number }>(event: T): T | null {
  const { timestamp, start_timestamp } = event;
  return timestamp != null && start_timestamp != null && timestamp - start_timestamp > MAX_TRACE_SECONDS ? null : event;
}
