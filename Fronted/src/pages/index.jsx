import Layout from "./Layout.jsx";

import FaceCapture from "./FaceCapture";

import Welcome from "./Welcome";

import CaptureStep from "./CaptureStep";

import ReviewStep from "./ReviewStep";

import ProcessingStep from "./ProcessingStep";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    FaceCapture: FaceCapture,
    
    Welcome: Welcome,
    
    CaptureStep: CaptureStep,
    
    ReviewStep: ReviewStep,
    
    ProcessingStep: ProcessingStep,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<FaceCapture />} />
                
                
                <Route path="/FaceCapture" element={<FaceCapture />} />
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/CaptureStep" element={<CaptureStep />} />
                
                <Route path="/ReviewStep" element={<ReviewStep />} />
                
                <Route path="/ProcessingStep" element={<ProcessingStep />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}