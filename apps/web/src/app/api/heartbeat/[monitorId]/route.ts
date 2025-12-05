import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { and, db, eq } from "@openstatus/db";
import { heartbeatData, monitor } from "@openstatus/db/src/schema/monitors/monitor";

const heartbeatSchema = z.object({
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

async function handleHeartbeat(
  request: NextRequest,
  { params }: { params: { monitorId: string } }
) {
  try {
    const monitorId = params.monitorId;

    // Validate monitor exists and is a heartbeat monitor
    const monitorData = await db
      .select()
      .from(monitor)
      .where(
        and(
          eq(monitor.id, Number(monitorId)),
          eq(monitor.jobType, "heartbeat"),
          eq(monitor.active, true)
        )
      )
      .get();

    if (!monitorData) {
      return NextResponse.json(
        { error: "Monitor not found or not a heartbeat monitor" },
        { status: 404 }
      );
    }

    // Parse body if present (optional for both GET and POST)
    let message: string | undefined;
    let metadata: Record<string, any> | undefined;

    if (request.method === "POST") {
      try {
        const body = await request.json();
        const validatedData = heartbeatSchema.safeParse(body);

        if (validatedData.success) {
          message = validatedData.data.message;
          metadata = validatedData.data.metadata;
        }
        // If validation fails, we still accept the heartbeat but ignore the body
      } catch (error) {
        // If JSON parsing fails, we still accept the heartbeat
      }
    }

    // Update last heartbeat timestamp
    await db
      .update(monitor)
      .set({
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(monitor.id, Number(monitorId)));

    // Insert heartbeat data record
    await db.insert(heartbeatData).values({
      monitorId: Number(monitorId),
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: "received",
    });

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Heartbeat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export both GET and POST handlers
export async function GET(
  request: NextRequest,
  { params }: { params: { monitorId: string } }
) {
  return handleHeartbeat(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { monitorId: string } }
) {
  return handleHeartbeat(request, { params });
}
