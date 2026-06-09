import { eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@workspace/db";
import { domainEventOutboxTable } from "@workspace/db";
import type { EventType } from "@workspace/domain-constants";

export interface OutboxEvent {
  eventType: EventType;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  partitionKey?: string;
}

export async function publishEvent(
  db: DbOrTx,
  event: OutboxEvent,
): Promise<void> {
  await db.insert(domainEventOutboxTable).values({
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    partitionKey: event.partitionKey ?? event.aggregateId,
    status: "pending",
    retryCount: 0,
  });
}

export async function publishEvents(
  db: DbOrTx,
  events: OutboxEvent[],
): Promise<void> {
  if (events.length === 0) return;

  await db.insert(domainEventOutboxTable).values(
    events.map((event) => ({
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      partitionKey: event.partitionKey ?? event.aggregateId,
      status: "pending",
      retryCount: 0,
    })),
  );
}
