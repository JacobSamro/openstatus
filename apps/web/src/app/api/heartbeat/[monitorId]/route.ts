import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { and, db, eq } from "@openstatus/db";
import { heartbeatData, monitor } from "@openstatus/db/src/schema/monitors/monitor";

const heartbeatSchema = z.object({
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(
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

    const body = await request.json();
    const validatedData = heartbeatSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validatedData.error },
        { status: 400 }
      );
    }

    const { message, metadata } = validatedData.data;

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
