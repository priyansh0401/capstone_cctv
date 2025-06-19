"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Video, Settings } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-contrib-hls";

interface Camera {
  _id: string;
  name: string;
  ip_address: string;
  location: string;
  status: string;
  stream_url: string;
}

export default function CameraViewPage() {
  const params = useParams();
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      console.log("Fetching camera with ID:", params.id);
      fetchCamera();
    }
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [params.id]);

  const fetchCamera = async () => {
    try {
      setIsLoading(true);
      console.log("Making request to /api/cameras/" + params.id);
      const response = await fetch(`/api/cameras/${params.id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch camera");
      }

      const data = await response.json();
      console.log("Fetched camera data:", data);
      setCamera(data);

      // Get stream URL
      console.log("Getting stream URL for camera:", params.id);
      const streamResponse = await fetch(`/api/stream/${params.id}`);
      if (streamResponse.ok) {
        const streamData = await streamResponse.json();
        console.log("Got stream data:", streamData);
        setStreamUrl(streamData.url || streamData.streamUrl); // Handle both new and old response formats
      } else {
        const errorData = await streamResponse.json();
        throw new Error(errorData.error || "Failed to get stream URL");
      }
    } catch (error: any) {
      console.error("Error in fetchCamera:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch camera",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      console.log("Setting up video player with URL:", streamUrl);
      if (playerRef.current) {
        playerRef.current.dispose();
      }

      const player = videojs(videoRef.current, {
        sources: [
          {
            src: streamUrl,
            type: "application/x-mpegURL",
          },
        ],
        fluid: false,
        responsive: true,
        liveui: true,
        controls: true,
        autoplay: "muted",
        muted: true,
        preload: "auto",
        html5: {
          hls: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            handleManifestRedirects: true,
            withCredentials: false,
            allowSeeksWithinUnsafeLiveWindow: true,
            handlePartialData: true,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            lowLatencyMode: true,
            backBufferLength: 90,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        techOrder: ["html5"],
        liveTracker: {
          trackingThreshold: 20,
          liveTolerance: 15,
        },
        inactivityTimeout: 0,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
      });

      player.on("error", (error: any) => {
        console.error("Video.js error:", error);
        toast({
          title: "Stream Error",
          description: "Failed to load video stream. Please try again.",
          variant: "destructive",
        });
      });

      player.on("waiting", () => {
        console.log("Video is waiting for data");
      });

      player.on("playing", () => {
        console.log("Video is playing");
      });

      playerRef.current = player;

      return () => {
        if (playerRef.current) {
          playerRef.current.dispose();
        }
      };
    }
  }, [streamUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Camera not found</h1>
          <p className="text-gray-500 mb-4">Camera ID: {params.id}</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{camera.name}</h1>
          <p className="text-gray-500">{camera.location}</p>
        </div>
        <div className="flex gap-4">
          <Link href={`/dashboard/cameras/${params.id}/settings`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Camera Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {streamUrl ? (
                <div
                  className="relative w-full bg-black rounded-lg overflow-hidden"
                  style={{ aspectRatio: "16/9" }}
                >
                  <video
                    ref={videoRef}
                    className="video-js vjs-default-skin vjs-big-play-centered w-full h-full"
                    controls
                    muted
                    autoPlay
                    playsInline
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div
                  className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
                  style={{ aspectRatio: "16/9" }}
                >
                  <p className="text-gray-500">No stream available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Camera Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p
                    className={`mt-1 text-sm ${
                      camera.status === "online"
                        ? "text-green-600"
                        : camera.status === "offline"
                        ? "text-gray-600"
                        : "text-red-600"
                    }`}
                  >
                    {camera.status}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    IP Address
                  </h3>
                  <p className="mt-1 text-sm">{camera.ip_address}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Location
                  </h3>
                  <p className="mt-1 text-sm">{camera.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
