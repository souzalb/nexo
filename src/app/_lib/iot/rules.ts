import { z } from 'zod';

export const VALIDATION_WINDOW_MINUTES = 30;

export const telemetrySchema = z
  .object({
    version: z.literal(1),
    deviceId: z.string().min(1).max(80),
    bootId: z.string().min(1).max(80),
    sequence: z.number().int().min(0).max(2147483647),
    motion: z.boolean(),
    ready: z.boolean(),
    uptimeMs: z.number().int().min(0).max(4294967295),
    motionAgeMs: z.number().int().min(0).max(4294967295).nullable(),
  })
  .refine(
    (sample) =>
      sample.motionAgeMs === null || sample.motionAgeMs <= sample.uptimeMs,
  );

export type Decision =
  'NONE' | 'VERIFY' | 'WARN' | 'SUSPECT' | 'RELEASE' | 'INCONCLUSIVE';

export function decideAttendance(input: {
  now: Date;
  start: Date;
  end: Date;
  status: string;
  attendance: string;
  mode: string;
  warningMinutes: number;
  releaseMinutes: number;
  warnedAt: Date | null;
  deadline: Date | null;
  lastSeen: Date | null;
  healthySince: Date | null;
  lastMotion: Date | null;
  heartbeatSeconds: number;
  ready: boolean;
  connected: boolean;
  trusted: boolean;
}): Decision {
  const { now, start, end } = input;
  if (
    input.status !== 'CONFIRMED' ||
    input.mode === 'OFF' ||
    now < start ||
    now >= end ||
    input.attendance === 'VERIFIED'
  )
    return 'NONE';
  const validationEnd = start.getTime() + VALIDATION_WINDOW_MINUTES * 60000;
  // Never use later motion or release a booking after its initial window.
  if (now.getTime() > validationEnd)
    return input.attendance === 'SUSPECTED_NO_SHOW' ||
      input.attendance === 'INCONCLUSIVE'
      ? 'NONE'
      : 'INCONCLUSIVE';
  const fresh =
    input.connected &&
    input.ready &&
    input.lastSeen !== null &&
    now.getTime() - input.lastSeen.getTime() <= input.heartbeatSeconds * 1000;
  // Recent activity can prevent cancellation even if full coverage is unavailable.
  if (
    fresh &&
    input.lastMotion &&
    input.lastMotion.getTime() >= start.getTime() &&
    input.lastMotion <= now
  )
    return 'VERIFY';
  if (now.getTime() < start.getTime() + input.warningMinutes * 60000)
    return 'NONE';
  const covered =
    fresh && input.healthySince !== null && input.healthySince <= start;
  if (!covered) return 'INCONCLUSIVE';
  if (!input.warnedAt) return 'WARN';
  if (!input.deadline || now < input.deadline) return 'NONE';
  return input.mode === 'AUTOMATIC' && input.trusted ? 'RELEASE' : 'SUSPECT';
}

export function automaticReleaseAllowed() {
  try {
    const url = new URL(
      process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
    );
    return (
      process.env.IOT_ALLOW_AUTOMATIC_RELEASE === 'true' &&
      ['mqtts:', 'wss:'].includes(url.protocol) &&
      !!process.env.MQTT_USERNAME &&
      !!process.env.MQTT_PASSWORD &&
      url.hostname !== 'broker.hivemq.com'
    );
  } catch {
    return false;
  }
}
