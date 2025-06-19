import mongoose from "mongoose";

const cameraSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    ip_address: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    camera_type: {
      type: String,
      enum: ["rtsp", "onvif", "hikvision", "dahua", "ip"],
      default: "rtsp",
    },
    description: String,
    username: String,
    password: String,
    enable_motion_detection: {
      type: Boolean,
      default: false,
    },
    enable_sound_detection: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["online", "offline", "error"],
      default: "offline",
    },
    last_seen: {
      type: Date,
      default: Date.now,
    },
    stream_url: {
      type: String,
      required: false,
    },
    rtsp_port: {
      type: Number,
      default: 554,
    },
    rtsp_path: {
      type: String,
      default: "/stream",
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
cameraSchema.index({ ip_address: 1 });
cameraSchema.index({ status: 1 });
cameraSchema.index({ camera_type: 1 });

// Add a method to get the full RTSP URL
cameraSchema.methods.getFullRtspUrl = function () {
  // If stream_url is already a complete RTSP URL, use it
  if (this.stream_url && this.stream_url.startsWith("rtsp://")) {
    return this.stream_url;
  }

  // If ip_address already contains rtsp://, use it directly
  if (this.ip_address && this.ip_address.startsWith("rtsp://")) {
    return this.ip_address;
  }

  // Build RTSP URL based on camera type
  const auth =
    this.username && this.password ? `${this.username}:${this.password}@` : "";
  const port = this.rtsp_port || 554;
  const path = this.rtsp_path || this.getDefaultRtspPath();

  return `rtsp://${auth}${this.ip_address}:${port}${path}`;
};

// Add a method to get default RTSP path based on camera type
cameraSchema.methods.getDefaultRtspPath = function () {
  switch (this.camera_type) {
    case "hikvision":
      return "/Streaming/Channels/101";
    case "dahua":
      return "/cam/realmonitor?channel=1&subtype=0";
    case "onvif":
      return "/onvif/stream1";
    case "ip":
      return "/stream1";
    case "rtsp":
    default:
      return this.rtsp_path || "/stream";
  }
};

export const Camera =
  mongoose.models.Camera || mongoose.model("Camera", cameraSchema);
