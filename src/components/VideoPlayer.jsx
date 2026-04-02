import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Loader2, Play, AlertCircle } from "lucide-react";

const FILE_SERVER_URL =
  import.meta.env.VITE_FILE_SERVER_URL || "http://localhost:4000";

export function VideoPlayer({ moduleId, videoLocalPath }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const loadVideo = async () => {
      if (!moduleId || !videoLocalPath) {
        setError("Missing video information");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get current session token
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Authentication required");
        }

        // Call Edge Function to get signed video token
        const { data: signedData, error: signError } =
          await supabase.functions.invoke("sign-video-url", {
            body: { module_id: moduleId },
          });

        if (signError) throw signError;

        if (!signedData?.token || !signedData?.filePath) {
          throw new Error("Invalid response from video signing service");
        }

        // Fetch the video stream with authentication
        const streamUrl = `${FILE_SERVER_URL}/stream/${signedData.filePath}`;
        const response = await fetch(streamUrl, {
          headers: {
            Authorization: `Bearer ${signedData.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load video: ${response.statusText}`);
        }

        // Create blob URL from stream
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // Store for cleanup
        blobUrlRef.current = blobUrl;

        if (mounted) {
          setVideoUrl(blobUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error("Video loading error:", err);
        if (mounted) {
          setError(err.message || "Failed to load video");
          setLoading(false);
        }
      }
    };

    loadVideo();

    // Cleanup blob URL on unmount
    return () => {
      mounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, [moduleId, videoLocalPath]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="aspect-video w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex flex-col items-center justify-center gap-4"
      >
        <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
        <p className="text-slate-300 text-sm">Loading video...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="aspect-video w-full bg-gradient-to-br from-red-950/30 to-slate-900 border border-red-800/50 rounded-lg flex flex-col items-center justify-center gap-3 p-8"
      >
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-200 font-medium">Unable to load video</p>
        <p className="text-red-300/70 text-sm text-center max-w-md">{error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative w-full rounded-lg overflow-hidden shadow-2xl"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        className="w-full aspect-video bg-black"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>

      {/* Play icon overlay (shows before first play) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
        <div className="w-20 h-20 bg-indigo-600/80 rounded-full flex items-center justify-center backdrop-blur-sm">
          <Play className="w-10 h-10 text-white ml-1" />
        </div>
      </div>
    </motion.div>
  );
}
