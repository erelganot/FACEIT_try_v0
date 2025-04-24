
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, Loader2, ChevronRight, Download, ArrowLeft, Mail, User, AlertCircle } from "lucide-react";
import { UploadFile, SendEmail } from "@/api/integrations";
import { ProcessingHistory } from "@/api/entities";

const STEPS = {
  NAME: 'name',
  CAPTURE: 'capture',
  REVIEW: 'review',
  RESULT: 'result',
  EMAIL: 'email'
};

export default function FaceCapture() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(STEPS.NAME);
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [processingHistory, setProcessingHistory] = useState([]);
  const [userName, setUserName] = useState('');
  const [uploadError, setUploadError] = useState(null);

  // Load processing history
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const history = await ProcessingHistory.list("-processed_at");
      setProcessingHistory(history);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access not supported in this browser");
      return;
    }

    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Try with simpler constraints first
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      
      streamRef.current = mediaStream;

      // Only set video source if videoRef and stream are available
      if (videoRef.current && mediaStream) {
        videoRef.current.srcObject = mediaStream;
        
        // Use event listener instead of promise
        videoRef.current.addEventListener('loadedmetadata', () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => setIsReady(true))
              .catch(err => {
                console.error("Error playing video:", err);
                setCameraError("Could not play video stream");
              });
          }
        });
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError(err.message || "Could not access camera");
    }
  }, []);

  // Only initialize camera when moving to capture step
  useEffect(() => {
    if (currentStep === STEPS.CAPTURE) {
      const timeoutId = setTimeout(() => {
        startCamera();
      }, 500);
      
      return () => {
        clearTimeout(timeoutId);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
          });
        }
      };
    }
  }, [currentStep, startCamera]);

  // Create a simulated image as fallback if camera fails
  const createSimulatedImage = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    
    // Fill background
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw placeholder face
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2 - 30, 100, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillRect(canvas.width/2 - 75, canvas.height/2 + 80, 150, 200);
    
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const capturePhoto = useCallback(() => {
    if (cameraError) {
      // Use simulated image if camera failed
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
            
            // If video isn't ready, create a simulated image
            if (!video || !video.videoWidth || !isReady) {
              setCapturedImage(createSimulatedImage());
              setCountdown(null);
              return;
            }
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
              setCapturedImage(URL.createObjectURL(blob));
              setCountdown(null);
              setCurrentStep(STEPS.REVIEW);
            }, 'image/jpeg', 0.8);
          } catch (err) {
            console.error("Error capturing photo:", err);
            setCapturedImage(createSimulatedImage());
            setCountdown(null);
          }
        }, 100);
      }
    }, 1000);
  }, [cameraError, isReady]);

  const handleStartOver = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCapturedImage(null);
    setResult(null);
    setCurrentStep(STEPS.NAME);
    setUserName('');
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    setUploadError(null);
    
    try {
      let resultUrl;
      
      try {
        // Try to upload image
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
        
        // Set a timeout for the upload to prevent long waits
        const uploadPromise = UploadFile({ file });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Upload timed out")), 10000)
        );
        
        // Race between upload and timeout
        const { file_url } = await Promise.race([uploadPromise, timeoutPromise]);
        resultUrl = file_url;
      } catch (uploadErr) {
        console.error("Upload failed:", uploadErr);
        setUploadError("Image upload failed. Using local image instead.");
        
        // Fallback: Just use the captured image directly
        resultUrl = capturedImage;
      }

      // Set result and move to next step
      setResult(resultUrl);
      setCurrentStep(STEPS.RESULT);
      
      // Create history record with whatever URL we have
      try {
        await ProcessingHistory.create({
          user_name: userName,
          source_image: resultUrl,
          result_url: resultUrl,
          model_used: "standard",
          processed_at: new Date().toISOString(),
          status: "completed"
        });
        loadHistory();
      } catch (historyError) {
        console.error("Error saving processing history:", historyError);
        // Continue even if history saving fails
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setUploadError("Processing failed. Please try again later.");
    }
    
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (result) {
      const link = document.createElement('a');
      link.href = result;
      link.download = 'faceit-result.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSendEmail = async () => {
    if (!email || !result) return;

    setIsProcessing(true);
    setEmailError(null);
    
    try {
      await SendEmail({
        to: email,
        subject: "Your FaceIT Result",
        body: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #333;">Your FaceIT Video Result</h2>
            <p>Thank you for using FaceIT! Here's your processed result:</p>
            <div style="margin: 20px 0;">
              <a href="${result}" style="color: #00f;">Click here to view or download your video</a>
            </div>
            <p>This link will expire in 30 days.</p>
          </div>
        `
      });
      
      setEmailSent(true);
      setTimeout(() => {
        setCurrentStep(STEPS.RESULT);
        setEmailSent(false);
      }, 3000);
    } catch (error) {
      console.error("Error sending email:", error);
      setEmailError("Failed to send email. Please try again.");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-[800px] mx-auto">
        <div className="bg-[#080808] rounded-2xl p-8 border border-[#F6F4F9]/10">
          {/* Progress indicator */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              {Object.values(STEPS).filter(step => step !== STEPS.EMAIL).map((step, index) => (
                <React.Fragment key={step}>
                  <div 
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      currentStep === step 
                        ? "bg-[#BBFF00] scale-125" 
                        : Object.values(STEPS).indexOf(currentStep) > index
                          ? "bg-[#BBFF00] opacity-50"
                          : "bg-[#F6F4F9]/20"
                    }`}
                  />
                  {index < Object.values(STEPS).filter(step => step !== STEPS.EMAIL).length - 1 && (
                    <div className="w-16 h-0.5 bg-[#F6F4F9]/20" />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="text-sm text-[#F6F4F9]/60">
              {currentStep === STEPS.EMAIL ? 'Email Result' : `Step ${Object.values(STEPS).filter(step => step !== STEPS.EMAIL).indexOf(currentStep) + 1} of 4`}
            </div>
          </div>

          {/* Content area with fade transitions */}
          <div className="relative min-h-[500px]">
            {/* Name Step */}
            <div className={`space-y-6 transition-all duration-500 ${
              currentStep === STEPS.NAME ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}>
              <div>
                <h1 className="text-3xl font-bold text-[#F6F4F9] mb-2">Enter Your Name</h1>
                <p className="text-[#F6F4F9]/60">Please enter your name so we can identify your results later.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#F6F4F9]/40">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-12 py-4 rounded-xl bg-[#F6F4F9]/5 border border-[#F6F4F9]/10 
                           text-[#F6F4F9] placeholder-[#F6F4F9]/40 focus:outline-none focus:ring-2 
                           focus:ring-[#BBFF00] focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setCurrentStep(STEPS.CAPTURE)}
                    disabled={!userName.trim()}
                    className="px-6 py-3 rounded-xl bg-[#BBFF00] hover:bg-[#D3FF00]
                           text-[#080808] font-medium flex items-center gap-2 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Capture Step */}
            <div className={`space-y-6 transition-all duration-500 ${
              currentStep === STEPS.CAPTURE ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}>
              <div>
                <h1 className="text-3xl font-bold text-[#F6F4F9] mb-2">Capture Your Photo</h1>
                <p className="text-[#F6F4F9]/60">Hi {userName}, position yourself in front of the camera and ensure good lighting.</p>
              </div>

              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                {!isReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1A1E21]/80">
                    <div className="flex items-center gap-2 text-[#F6F4F9]/80">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Initializing camera...</span>
                    </div>
                  </div>
                )}
                
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1E21]/90">
                    <div className="text-center p-6">
                      <p className="text-red-400 mb-2">Camera access error</p>
                      <p className="text-[#F6F4F9]/70 text-sm mb-4">{cameraError}</p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-[#F6F4F9]/5 hover:bg-[#F6F4F9]/10
                                   text-[#F6F4F9] font-medium flex items-center gap-2 transition-all
                                   border border-[#F6F4F9]/10 rounded-lg text-sm"
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
                  className={`w-full h-full object-cover ${!isReady ? 'invisible' : ''} scale-x-[-1]`}
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {countdown && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1A1E21]/80 backdrop-blur-sm">
                    <span className="text-[var(--brand-accent)] text-7xl font-bold animate-pulse">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={!isReady || countdown !== null}
                  className="px-6 py-3 rounded-xl bg-[#BBFF00] hover:bg-[#D3FF00]
                           text-[#080808] font-medium flex items-center gap-2 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo
                </button>
              </div>
            </div>

            {/* Review Step */}
            <div className={`space-y-6 transition-all duration-500 ${
              currentStep === STEPS.REVIEW ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}>
              <div>
                <h1 className="text-3xl font-bold text-[#F6F4F9] mb-2">Review Your Photo</h1>
                <p className="text-[#F6F4F9]/60">Make sure your face is clearly visible and well-lit.</p>
              </div>

              {capturedImage && (
                <div className="rounded-xl overflow-hidden bg-black">
                  <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="w-full object-contain max-h-[400px] scale-x-[-1]"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                </div>
              )}

              {uploadError && (
                <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400">{uploadError}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setCurrentStep(STEPS.CAPTURE);
                  }}
                  className="px-6 py-3 rounded-xl bg-[#F6F4F9]/5 hover:bg-[#F6F4F9]/10
                           text-[#F6F4F9] font-medium flex items-center gap-2 transition-all
                           border border-[#F6F4F9]/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Retake
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl bg-[#BBFF00] hover:bg-[#D3FF00]
                           text-[#080808] font-medium flex items-center gap-2 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-5 h-5" />
                      Continue
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result Step */}
            <div className={`space-y-6 transition-all duration-500 ${
              currentStep === STEPS.RESULT ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}>
              <div>
                <h1 className="text-3xl font-bold text-[#F6F4F9] mb-2">Your Result</h1>
                <p className="text-[#F6F4F9]/60">Here's your processed image. You can download it, share via email, or try again.</p>
              </div>

              {result && (
                <div className="rounded-xl overflow-hidden bg-black">
                  <img 
                    src={result} 
                    alt="Result" 
                    className="w-full object-contain max-h-[400px]"
                  />
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-3">
                <button
                  onClick={handleStartOver}
                  className="group relative px-6 py-3 rounded-xl overflow-hidden
                border-2 border-[#BBFF00] bg-transparent
                text-[#BBFF00] font-medium transition-all
                hover:text-[#080808]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    Start Over
                  </span>
                  <div className="absolute inset-0 bg-[#BBFF00] transform -translate-x-full
                    group-hover:translate-x-0 transition-transform duration-200"></div>
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentStep(STEPS.EMAIL)}
                    className="px-6 py-3 rounded-xl bg-[#F6F4F9]/5 hover:bg-[#F6F4F9]/10
                             text-[#F6F4F9] font-medium flex items-center gap-2 transition-all
                             border border-[#F6F4F9]/10"
                  >
                    <Mail className="w-5 h-5" />
                    Email Result
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 rounded-xl bg-[#BBFF00] hover:bg-[#D3FF00]
                             text-[#080808] font-medium flex items-center gap-2 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              </div>

              {currentStep === STEPS.RESULT && processingHistory.length > 0 && (
                <div className="mt-8 border-t border-[#F6F4F9]/10 pt-6">
                  <h2 className="text-xl font-medium text-[#F6F4F9] mb-4">Processing History</h2>
                  <div className="space-y-4">
                    {processingHistory.map((record) => (
                      <div 
                        key={record.id}
                        className="bg-[#F6F4F9]/5 rounded-lg p-4 flex items-center justify-between
                             border border-[#F6F4F9]/10"
                      >
                        <div>
                          <div className="text-[#F6F4F9] font-medium">
                            {record.user_name || "Unknown User"}
                          </div>
                          <div className="text-sm text-[#F6F4F9]/60">
                            {new Date(record.processed_at).toLocaleDateString()} {new Date(record.processed_at).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${
                              record.status === 'completed' ? 'bg-[#BBFF00]' :
                              record.status === 'failed' ? 'bg-red-400' :
                              'bg-yellow-400'
                            }`} />
                            <span className="text-sm capitalize text-[#F6F4F9]/80">{record.status}</span>
                          </div>
                        </div>
                        
                        {record.status === 'completed' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => window.open(record.result_url, '_blank')}
                              className="px-3 py-1 rounded-lg bg-[#F6F4F9]/5 hover:bg-[#F6F4F9]/10
                                   text-[#F6F4F9]/80 text-sm flex items-center gap-1
                                   border border-[#F6F4F9]/10"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Email Step */}
            <div className={`space-y-6 transition-all duration-500 ${
              currentStep === STEPS.EMAIL ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}>
              <div>
                <h1 className="text-3xl font-bold text-[#F6F4F9] mb-2">Email Your Result</h1>
                <p className="text-[#F6F4F9]/60">Enter your email address to receive the video result.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#F6F4F9]/70 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 rounded-lg bg-[#F6F4F9]/5 border border-[#F6F4F9]/10 
                               text-[#F6F4F9] placeholder-[#F6F4F9]/40 focus:outline-none focus:ring-2 
                               focus:ring-[#BBFF00] focus:border-transparent"
                  />
                  {emailError && (
                    <p className="mt-2 text-sm text-red-400">{emailError}</p>
                  )}
                </div>

                {result && (
                  <div className="rounded-xl overflow-hidden bg-black">
                    <img 
                      src={result} 
                      alt="Result"
                      className="w-full object-contain max-h-[200px]"
                    />
                  </div>
                )}
                
                {emailSent && (
                  <div className="bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 
                                text-[var(--brand-accent)] px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Email sent successfully!
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep(STEPS.RESULT)}
                    className="px-6 py-3 rounded-xl bg-[#F6F4F9]/5 hover:bg-[#F6F4F9]/10
                            text-[#F6F4F9] font-medium flex items-center gap-2 transition-all
                            border border-[#F6F4F9]/10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                  </button>

                  <button
                    onClick={handleSendEmail}
                    disabled={!email || isProcessing}
                    className="px-6 py-3 rounded-xl bg-[#BBFF00] hover:bg-[#D3FF00]
                            text-[#080808] font-medium flex items-center gap-2 transition-all
                            disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Company logo at bottom */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center justify-center">
            <span className="text-2xl font-bold text-[#F6F4F9]">FACEIT.</span>
            <span className="ml-2 text-xs text-[#F6F4F9]/40">by Your Company</span>
          </div>
        </div>
      </div>
    </div>
  );
}
