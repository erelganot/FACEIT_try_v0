
import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#080808] font-['SF_Pro_Display',-apple-system,BlinkMacSystemFont,sans-serif]">
      <style>{`
        :root {
          --brand-accent: #BBFF00;
          --brand-secondary: #D3FF00;
          --brand-black: #080808;
          --brand-white: #F6F4F9;
        }
        
        body {
          background: #080808;
          color: #F6F4F9;
        }
        
        .slide-in {
          animation: slideIn 0.5s ease forwards;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      {children}
    </div>
  );
}
