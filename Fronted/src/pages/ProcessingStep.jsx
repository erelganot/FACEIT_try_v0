import React, { useState, useEffect } from "react";
import { RefreshCcw, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UploadFile } from "@/api/integrations";

export default function ProcessingStep() {
  const navigate = useNavigate();
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [processingState, setProcessingState] = useState("loading"); // loading, success, error
  const [progress, setProgress] = useState(0);
  const [resultImage, setResultImage] = useState(null);
  
  // Load data from localStorage
  useEffect(() => {
    const image = localStorage.getItem('faceit_captured_image');
    const model = localStorage.getItem('faceit_selected_model');
    
    if (!image || !model) {
      // Redirect back if missing data
      navigate(createPageUrl("Welcome"));
      return;
    }
    
    setCapturedImage(image);
    setSelectedModel(model);
    
    // Simulate processing
    simulateProcessing();
  }, [navigate]);
  
  const simulateProcessing = async () => {
    setProcessingState("loading");
    
    // Simulate progress updates
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += 5;
      setProgress(Math.min(currentProgress, 95));
      
      if (currentProgress >= 95) {
        clearInterval(progressInterval);
      }
    }, 300);
    
    // Simulate processing completion after some time
    setTimeout(async () => {
      clearInterval(progressInterval);
      
      try {
        // Convert data URL to File object
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
        
        // Upload the file
        const { file_url } = await UploadFile({ file });
        
        // Set result and state
        setResultImage(file_url);
        setProgress(100);
        setProcessingState("success");
      } catch (error) {
        console.error("Error processing image:", error);
        setProcessingState("error");
      }
    }, 5000);
  };
  
  const handleTryAgain = () => {
    simulateProcessing();
  };
  
  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = 'faceit-result.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleStartOver = () => {
    localStorage.removeItem('faceit_captured_image');
    localStorage.removeItem('faceit_selected_model');
    navigate(createPageUrl("Welcome"));
  };

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-[800px] mx-auto slide-in">
        <div className="bg-[#1E2326] rounded-2xl p-8 space-y-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-white">
              {processingState === "loading" ? "Processing" : 
               processingState === "success" ? "Result Ready" : 
               "Processing Error"}
            </h1>
            <div className="flex items-center gap-1 text-sm text-white/60">
              <span className="text-[var(--brand-accent)]">Step 3</span>
              <span>/</span>
              <span>3</span>
            </div>
          </div>
          
          {/* Processing view */}
          {processingState === "loading" && (
            <div className="space-y-8">
              <p className="text-white/60">
                Please wait while we generate your face swap...
              </p>
              
              <div className="flex justify-center py-8">
                <div className="w-24 h-24 rounded-full border-4 border-t-[var(--brand-accent)] border-white/10 animate-spin"></div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Processing</span>
                  <span className="text-[var(--brand-accent)]">{progress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--brand-accent)] rounded-full transition-all duration-300" 
                    style={{width: `${progress}%`}}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Success view */}
          {processingState === "success" && resultImage && (
            <div className="space-y-8">
              <p className="text-white/60">
                Your face swap has been created successfully! You can download the result or start over.
              </p>
              
              <div className="rounded-xl overflow-hidden bg-black">
                <img 
                  src={resultImage} 
                  alt="Face swap result" 
                  className="w-full object-contain max-h-[400px]"
                />
              </div>
              
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 rounded-xl bg-[var(--brand-accent)] hover:brightness-110
                           text-black font-medium flex items-center gap-2 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Result
                </button>
                
                <button
                  onClick={handleStartOver}
                  className="px-6 py-3 rounded-xl bg-[#2C3136] hover:bg-[#353B41]
                           text-white font-medium flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Start Over
                </button>
              </div>
            </div>
          )}
          
          {/* Error view */}
          {processingState === "error" && (
            <div className="space-y-8">
              <p className="text-red-400">
                We encountered an error while processing your image. Please try again.
              </p>
              
              <div className="flex justify-center">
                <button
                  onClick={handleTryAgain}
                  className="px-6 py-3 rounded-xl bg-[#2C3136] hover:bg-[#353B41]
                           text-white font-medium flex items-center gap-2 transition-all"
                >
                  <RefreshCcw className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}