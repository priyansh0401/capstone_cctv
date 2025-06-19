import { NextRequest, NextResponse } from "next/server"
import VideoStream from "node-rtsp-stream"
import { exec } from "child_process"
import { promisify } from "util"
import { v4 as uuidv4 } from "uuid"

const execAsync = promisify(exec)

// Store test streams
const testStreams = new Map<string, VideoStream>()

// Keep track of active streams
const activeStreams = new Map<string, any>()

// Function to create RTSP URL based on camera type and IP
function createRtspUrl(camera: any): string {
  const { ip_address, camera_type, username, password } = camera
  
  // Add authentication if provided
  const auth = username && password ? `${username}:${password}@` : ''
  
  // Remove any existing rtsp:// prefix
  const cleanIp = ip_address.replace(/^rtsp:\/\//, '')
  
  switch (camera_type) {
    case "rtsp":
      // If it's already a full RTSP URL, return it
      if (ip_address.startsWith('rtsp://')) {
        return ip_address
      }
      // Otherwise, construct the RTSP URL
      return `rtsp://${auth}${cleanIp}`
      
    case "ip":
      // Common RTSP paths for IP cameras
      const paths = [
        '/stream1',
        '/live',
        '/cam/realmonitor?channel=1&subtype=0',
        '/h264/ch1/main/av_stream',
        '/Streaming/Channels/101',
        '/live/ch00_0'
      ]
      
      // Try the first path, you might need to adjust this based on your camera
      return `rtsp://${auth}${cleanIp}${paths[0]}`
      
    case "onvif":
      // ONVIF cameras typically use this path
      return `rtsp://${auth}${cleanIp}/onvif/stream1`
      
    default:
      throw new Error(`Unsupported camera type: ${camera_type}`)
  }
}

// Function to test camera connection
async function testCameraConnection(rtspUrl: string): Promise<boolean> {
  try {
    console.log("Testing connection to:", rtspUrl)
    
    // Create a temporary stream to test the connection
    const testStream = new VideoStream({
      name: 'test-connection',
      streamUrl: rtspUrl,
      wsPort: 9998, // Use a different port for testing
      ffmpegOptions: {
        "-t": "5", // Only try for 5 seconds
        "-stats": "",
      },
    })

    // Wait for 5 seconds to see if the stream starts
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Stop the test stream
    testStream.stop()

    return true
  } catch (error) {
    console.error("Error testing camera connection:", error)
    return false
  }
}

// Function to find an available port
async function findAvailablePort(startPort: number = 9999): Promise<number> {
  let port = startPort
  while (port < startPort + 100) { // Try up to 100 ports
    try {
      await execAsync(`lsof -i :${port}`)
      port++
    } catch {
      return port // Port is available
    }
  }
  throw new Error("No available ports found")
}

// Function to clean and validate RTSP URL
function cleanRtspUrl(url: string): string {
  // Remove any duplicate rtsp:// prefixes
  let cleanUrl = url.replace(/^(rtsp:\/\/)+/, 'rtsp://')
  
  // Ensure the URL starts with rtsp://
  if (!cleanUrl.startsWith('rtsp://')) {
    cleanUrl = `rtsp://${cleanUrl}`
  }
  
  return cleanUrl
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()
    console.log("Testing camera with URL:", url)

    // Clean and validate the RTSP URL
    const rtspUrl = cleanRtspUrl(url)
    console.log("Testing connection to:", rtspUrl)

    // Test the connection using ffmpeg
    try {
      await execAsync(`ffmpeg -i "${rtspUrl}" -t 1 -f null -`)
      console.log("FFmpeg test successful")
    } catch (error) {
      console.error("FFmpeg test failed:", error)
      return NextResponse.json(
        { error: "Failed to connect to camera stream" },
        { status: 400 }
      )
    }

    // Find an available port
    const port = await findAvailablePort()
    console.log("Using port:", port)

    // Create a unique stream ID
    const streamId = uuidv4()

    // Create the stream
    const stream = new VideoStream({
      name: `test-stream-${streamId}`,
      streamUrl: rtspUrl,
      wsPort: port,
      ffmpegOptions: {
        "-stats": "",
        "-r": 30,
        "-q:v": 3,
      },
    })

    // Store the stream
    activeStreams.set(streamId, stream)

    // Clean up the stream after 10 seconds
    setTimeout(() => {
      const stream = activeStreams.get(streamId)
      if (stream) {
        stream.stop()
        activeStreams.delete(streamId)
      }
    }, 10000)

    return NextResponse.json({
      success: true,
      message: "Camera connection successful",
      streamUrl: `ws://localhost:${port}`,
    })
  } catch (error) {
    console.error("Error testing camera:", error)
    return NextResponse.json(
      { error: "Failed to test camera connection" },
      { status: 500 }
    )
  }
}

// Cleanup function to stop test streams
export async function DELETE() {
  try {
    for (const stream of testStreams.values()) {
      stream.stop()
    }
    testStreams.clear()
    return new NextResponse("Test streams stopped", { status: 200 })
  } catch (error) {
    console.error("Error stopping test streams:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 