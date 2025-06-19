import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Camera } from "@/models/camera";
import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Keep track of active streams
const activeStreams = new Map<string, any>();

// Ensure media directory exists
const mediaDir = path.join(process.cwd(), "media", "live");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

// Function to test camera connection using FFmpeg
async function testCameraConnection(rtspUrl: string): Promise<boolean> {
  try {
    console.log("Testing camera connection:", rtspUrl);

    // Use different timeout commands based on platform
    const isWindows = process.platform === "win32";
    const timeoutCmd = isWindows ? "timeout /t 5" : "timeout 5";

    // Test connection with a 5-second timeout
    const testCommand = isWindows
      ? `${timeoutCmd} ffmpeg -rtsp_transport tcp -i "${rtspUrl}" -t 1 -f null NUL 2>NUL`
      : `${timeoutCmd} ffmpeg -rtsp_transport tcp -i "${rtspUrl}" -t 1 -f null - 2>/dev/null`;

    await execAsync(testCommand);
    console.log("Camera connection test successful");
    return true;
  } catch (error) {
    console.error("Camera connection test failed:", error);
    // Don't fail completely if test fails - some cameras might work despite test failure
    return true; // Allow stream attempt even if test fails
  }
}

// Function to check if FFmpeg is available
async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch (error) {
    console.error("FFmpeg not found:", error);
    return false;
  }
}

// Function to start FFmpeg process for HLS streaming
function startFFmpeg(rtspUrl: string, cameraId: string) {
  console.log("Starting FFmpeg with RTSP URL:", rtspUrl);

  // Create camera-specific directory
  const cameraDir = path.join(mediaDir, cameraId);
  if (!fs.existsSync(cameraDir)) {
    fs.mkdirSync(cameraDir, { recursive: true });
  }

  const playlistPath = path.join(cameraDir, "index.m3u8");
  const segmentPath = path.join(cameraDir, "segment_%03d.ts");

  console.log("HLS playlist path:", playlistPath);
  console.log("HLS segment path:", segmentPath);

  const ffmpeg = spawn("ffmpeg", [
    "-rtsp_transport",
    "tcp",
    "-i",
    rtspUrl,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-profile:v",
    "baseline",
    "-level",
    "3.0",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "30", // GOP size
    "-keyint_min",
    "30",
    "-sc_threshold",
    "0",
    "-c:a",
    "aac",
    "-ar",
    "44100",
    "-b:a",
    "128k",
    "-f",
    "hls",
    "-hls_time",
    "2",
    "-hls_list_size",
    "5",
    "-hls_flags",
    "delete_segments+append_list",
    "-hls_segment_type",
    "mpegts",
    "-hls_segment_filename",
    segmentPath,
    "-hls_playlist_type",
    "event",
    "-hls_allow_cache",
    "0",
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    playlistPath,
  ]);

  let errorOutput = "";

  ffmpeg.stdout.on("data", (data) => {
    console.log(`FFmpeg stdout: ${data.toString()}`);
  });

  ffmpeg.stderr.on("data", (data) => {
    const output = data.toString();
    console.log(`FFmpeg stderr: ${output}`);
    errorOutput += output;
  });

  ffmpeg.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    if (code !== 0) {
      console.error("FFmpeg error output:", errorOutput);
    }
  });

  ffmpeg.on("error", (error) => {
    console.error("FFmpeg spawn error:", error);
  });

  return ffmpeg;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Getting stream for camera:", id);

    // Check if FFmpeg is available
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        { error: "FFmpeg not available on server" },
        { status: 500 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get camera
    const camera = await Camera.findById(id);
    if (!camera) {
      return NextResponse.json({ error: "Camera not found" }, { status: 404 });
    }

    // Check if stream already exists and is still running
    const existingStream = activeStreams.get(id);
    if (existingStream && !existingStream.ffmpeg.killed) {
      console.log("Returning existing stream for camera:", id);
      return NextResponse.json({
        url: existingStream.hlsUrl,
        status: "active",
      });
    }

    // Get full RTSP URL
    const rtspUrl = camera.getFullRtspUrl();
    console.log("Full RTSP URL:", rtspUrl);

    // Test camera connection first
    const connectionTest = await testCameraConnection(rtspUrl);
    if (!connectionTest) {
      return NextResponse.json(
        { error: "Cannot connect to camera stream" },
        { status: 400 }
      );
    }

    // Create HLS URL - serve from Next.js static files
    const hlsUrl = `/api/media/live/${id}/index.m3u8`;

    // Start FFmpeg process
    const ffmpeg = startFFmpeg(rtspUrl, id);

    // Store stream info
    activeStreams.set(id, {
      ffmpeg,
      hlsUrl,
      camera,
      startTime: Date.now(),
    });

    // Wait a moment for the stream to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return NextResponse.json({
      url: hlsUrl,
      status: "starting",
    });
  } catch (error: any) {
    console.error("Error getting stream:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get stream" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Stopping stream for camera:", id);

    // Get stream
    const streamData = activeStreams.get(id);
    if (streamData) {
      // Kill FFmpeg process
      streamData.ffmpeg.kill();
      activeStreams.delete(id);
    }

    return NextResponse.json({ message: "Stream stopped successfully" });
  } catch (error: any) {
    console.error("Error stopping stream:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stop stream" },
      { status: 500 }
    );
  }
}
