import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log("Creating camera with data:", data);

    // Validate required fields
    if (!data.name || !data.ip_address || !data.location) {
      return NextResponse.json(
        { error: "Name, IP address, and location are required" },
        { status: 400 }
      );
    }

    // Generate stream_url if not provided
    if (!data.stream_url) {
      data.stream_url = generateStreamUrl(data);
    }

    // Set default status
    if (!data.status) {
      data.status = "offline";
    }

    // Connect to database
    await connectToDatabase();

    // Create camera
    const camera = new Camera(data);
    console.log("Created camera object:", camera);

    // Save camera
    const savedCamera = await camera.save();
    console.log("Saved camera:", savedCamera);

    return NextResponse.json(savedCamera);
  } catch (error: any) {
    console.error("Error creating camera:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create camera" },
      { status: 500 }
    );
  }
}

// Helper function to generate stream URL
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

export async function GET(req: Request) {
  try {
    console.log("Getting all cameras");

    // Connect to database
    await connectToDatabase();

    // Get all cameras
    const cameras = await Camera.find();
    console.log("Found cameras:", cameras);

    return NextResponse.json(cameras);
  } catch (error: any) {
    console.error("Error getting cameras:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get cameras" },
      { status: 500 }
    );
  }
}
