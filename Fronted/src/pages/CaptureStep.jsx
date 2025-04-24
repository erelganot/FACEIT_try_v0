import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Loader2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CaptureStep() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Start camera on component mount
  useEffect(() => {
    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access not supported in this browser");
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        
        streamRef.current = mediaStream;

        if (videoRef.current && mediaStream) {
          videoRef.current.srcObject = mediaStream;
          
          videoRef.current.addEventListener('loadedmetadata', () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => setIsReady(true))
                .catch(err => setCameraError("Could not play video stream"));
            }
          });
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError(err.message || "Could not access camera");
      }
    };
    
    // Add a small delay before initializing camera
    const timeoutId = setTimeout(() => {
      startCamera();
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Create a simulated image if camera fails
  const createSimulatedImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2 - 30, 100, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillRect(canvas.width/2 - 75, canvas.height/2 + 80, 150, 200);
    
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const capturePhoto = useCallback(() => {
    if (cameraError) {
      setCapturedImage(createSimulatedImage());
      return;
    }
    
    let count = 3;
    setCountdown(count);
    
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(countdownInterval);
        setTimeout(() => {
          const video = videoRef.current;
          try {
            const canvas = document.createElement('canvas');
            
            if (!video || !video.videoWidth || !isReady) {
              setCapturedImage(createSimulatedImage());
              setCountdown(null);
              return;
            }
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            
            const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageUrl);
            
            // Store in localStorage to pass to next step
            localStorage.setItem('faceit_captured_image', imageUrl);
            
            setCountdown(null);
          } catch (err) {
            console.error("Error capturing photo:", err);
            setCapturedImage(createSimulatedImage());
            setCountdown(null);
          }
        }, 100);
      }
    }, 1000);
  }, [cameraError, isReady]);

  const handleContinue = () => {
    // Clean up camera before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate(createPageUrl("ReviewStep"));
  };

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-[800px] mx-auto slide-in">
        <div className="bg-[#1E2326] rounded-2xl p-8 space-y-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-white">Capture Your Image</h1>
            <div className="flex items-center gap-1 text-sm text-white/60">
              <span className="text-[var(--brand-accent)]">Step 1</span>
              <span>/</span>
              <span>3</span>
            </div>
          </div>
          
          <p className="text-white/60">
            Position yourself in front of the camera and press the capture button when ready.
          </p>

          {/* Webcam stream */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            {!isReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A1E21]/80">
                <div className="flex items-center gap-2 text-white/80">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Initializing camera...</span>
                </div>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1E21]/90">
                <div className="text-center p-6">
                  <p className="text-red-400 mb-2">Camera access error</p>
                  <p className="text-white/70 text-sm mb-4">{cameraError}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-[#2C3136] hover:bg-[#353B41] rounded-lg text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isReady ? 'invisible' : ''}`}
            />
            
            {/* Countdown overlay */}
            {countdown && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A1E21]/80 backdrop-blur-sm">
                <span className="text-[var(--brand-accent)] text-7xl font-bold animate-pulse">
                  {countdown}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center">
            {!capturedImage ? (
              <button
                onClick={capturePhoto}
                disabled={!isReady && !cameraError}
                className="px-6 py-3 rounded-xl bg-[var(--brand-accent)] hover:brightness-110
                         text-black font-medium flex items-center gap-2 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-5 h-5" />
                Capture Photo
              </button>
            ) : (
              <button
                onClick={handleContinue}
                className="px-6 py-3 rounded-xl bg-[var(--brand-accent)] hover:brightness-110
                         text-black font-medium flex items-center gap-2 transition-all"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}