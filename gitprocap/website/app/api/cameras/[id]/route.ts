import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Deleting camera:", id);

    // Connect to database
    await connectToDatabase();

    // Delete camera
    const camera = await Camera.findByIdAndDelete(id);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Camera deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete camera" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Getting camera:", id);

    // Connect to database
    await connectToDatabase();

    // Get camera
    const camera = await Camera.findById(id);
    console.log("Found camera:", camera);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error("Error getting camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get camera" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await req.json();
    console.log("Updating camera:", id, "with data:", data);

    // Validate required fields
    if (!data.name || !data.ip_address || !data.location) {
      return NextResponse.json(
        { error: "Name, IP address, and location are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Generate stream_url if not provided or if IP/type changed
    if (!data.stream_url || data.ip_address || data.camera_type) {
      data.stream_url = generateStreamUrl(data);
    }

    // Update camera
    const camera = await Camera.findByIdAndUpdate(id, data, { new: true });
    console.log("Updated camera:", camera);

    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    return NextResponse.json(camera);
  } catch (error: any) {
    console.error("Error updating camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update camera" },
      { status: 500 }
    );
  }
}

// Helper function to generate stream URL (same as in main cameras route)
function generateStreamUrl(cameraData: any): string {
  const { ip_address, camera_type, username, password, rtsp_port } = cameraData;

  // If ip_address is already a complete URL, use it
  if (
    ip_address.startsWith("rtsp://") ||
    ip_address.startsWith("http://") ||
    ip_address.startsWith("https://")
  ) {
    return ip_address;
  }

  // Build RTSP URL
  const auth = username && password ? `${username}:${password}@` : "";
  const port = rtsp_port || 554;

  // Get default path based on camera type
  let path = "/stream";
  switch (camera_type) {
    case "hikvision":
      path = "/Streaming/Channels/101";
      break;
    case "dahua":
      path = "/cam/realmonitor?channel=1&subtype=0";
      break;
    case "onvif":
      path = "/onvif/stream1";
      break;
    case "ip":
      path = "/stream1";
      break;
    case "rtsp":
    default:
      path = "/stream";
      break;
  }

  return `rtsp://${auth}${ip_address}:${port}${path}`;
}
