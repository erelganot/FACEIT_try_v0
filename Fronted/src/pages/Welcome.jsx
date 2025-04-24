import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, ChevronRight } from "lucide-react";

export default function Welcome() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen pt-24 px-6 flex flex-col items-center justify-center">
      <div className="max-w-[700px] mx-auto text-center slide-in">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[var(--brand-accent)]/10 flex items-center justify-center">
            <Camera className="w-10 h-10 text-[var(--brand-accent)]" />
          </div>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Face Swap Technology
        </h1>
        
        <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
          Transform your looks in seconds with our cutting-edge face swap technology. 
          Capture your photo and see the magic happen.
        </p>
        
        <button 
          onClick={() => navigate(createPageUrl("FaceCapture"))}
          className="px-8 py-4 rounded-xl bg-[var(--brand-accent)] hover:brightness-110
                    text-black font-bold text-lg flex items-center gap-2 mx-auto transition-all"
        >
          Start Experience
          <ChevronRight className="w-5 h-5" />
        </button>
        
        {/* Company logo at bottom */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center">
            <span className="text-2xl font-bold text-white">FACEIT.</span>
            <span className="ml-2 text-xs text-white/40">by Your Company</span>
          </div>
        </div>
      </div>
    </div>
  );
}