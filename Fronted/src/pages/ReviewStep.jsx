import React, { useState, useEffect } from "react";
import { ChevronRight, CheckCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ReviewStep() {
  const navigate = useNavigate();
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState("model1");
  
  // Load captured image from localStorage
  useEffect(() => {
    const image = localStorage.getItem('faceit_captured_image');
    if (!image) {
      // Redirect back to capture step if no image
      navigate(createPageUrl("CaptureStep"));
    } else {
      setCapturedImage(image);
    }
  }, [navigate]);
  
  const handleBack = () => {
    navigate(createPageUrl("CaptureStep"));
  };
  
  const handleContinue = () => {
    // Save selected model
    localStorage.setItem('faceit_selected_model', selectedModel);
    navigate(createPageUrl("ProcessingStep"));
  };
  
  const models = [
    {
      id: "model1",
      name: "Standard",
      description: "Balanced swapping with natural blending",
      image: "https://images.unsplash.com/photo-1535551951406-a19828b0a76b?q=80&w=200&auto=format"
    },
    {
      id: "model2",
      name: "Premium",
      description: "Enhanced details with perfect matching",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format"
    }
  ];

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-[800px] mx-auto slide-in">
        <div className="bg-[#1E2326] rounded-2xl p-8 space-y-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-white">Review & Select Model</h1>
            <div className="flex items-center gap-1 text-sm text-white/60">
              <span className="text-[var(--brand-accent)]">Step 2</span>
              <span>/</span>
              <span>3</span>
            </div>
          </div>
          
          <p className="text-white/60">
            Review your captured photo and select a face model for the swap.
          </p>

          {/* Image preview */}
          {capturedImage && (
            <div className="rounded-xl overflow-hidden bg-black">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full object-contain max-h-[300px] mx-auto"
              />
            </div>
          )}

          {/* Model selection */}
          <div className="space-y-3">
            <h2 className="text-xl font-medium text-white">Select Face Model</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {models.map(model => (
                <div 
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${selectedModel === model.id 
                              ? "border-[var(--brand-accent)] bg-[var(--brand-accent)]/5" 
                              : "border-white/10 hover:border-white/20"}`}
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img 
                        src={model.image} 
                        alt={model.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{model.name}</h3>
                      <p className="text-sm text-white/60">{model.description}</p>
                    </div>
                    {selectedModel === model.id && (
                      <CheckCircle className="absolute top-4 right-4 text-[var(--brand-accent)] w-5 h-5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-xl bg-[#2C3136] hover:bg-[#353B41]
                      text-white font-medium flex items-center gap-2 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            
            <button
              onClick={handleContinue}
              className="px-6 py-3 rounded-xl bg-[var(--brand-accent)] hover:brightness-110
                      text-black font-medium flex items-center gap-2 transition-all"
            >
              Continue
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}