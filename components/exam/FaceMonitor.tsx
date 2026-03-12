
import React, { useEffect, useRef, useState } from 'react';

interface FaceMonitorProps {
  onViolation: (msg: string) => void;
  sensitivity: number; // 1-10
}

const FaceMonitor: React.FC<FaceMonitorProps> = ({ onViolation, sensitivity }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'detected' | 'violation' | 'inactive'>('inactive');
  
  const lastFrameData = useRef<ImageData | null>(null);
  const violationCooldown = useRef<number>(0);
  const consecutiveViolations = useRef<number>(0);

  useEffect(() => {
    let active = true;
    let checkInterval: any;

    const startMonitoring = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, frameRate: 15 } 
        });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
        setStatus('detected');

        // Core Motion Detection Algorithm (Multi-device compatible)
        checkInterval = setInterval(() => {
          if (!videoRef.current || !canvasRef.current) return;
          
          const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(videoRef.current, 0, 0, 160, 120);
          const currentFrame = ctx.getImageData(0, 0, 160, 120);
          
          if (lastFrameData.current) {
            let diff = 0;
            const data1 = lastFrameData.current.data;
            const data2 = currentFrame.data;
            
            // Compare luminance of pixels to detect movement
            for (let i = 0; i < data1.length; i += 32) { // Sample every 8th pixel (4 channels)
              const brightness1 = (data1[i] + data1[i+1] + data1[i+2]) / 3;
              const brightness2 = (data2[i] + data2[i+1] + data2[i+2]) / 3;
              if (Math.abs(brightness1 - brightness2) > 40) diff++;
            }

            // Adaptive threshold based on sensitivity
            // More sensitive (10) means lower threshold for "movement"
            const threshold = (11 - sensitivity) * 12; 
            
            if (diff > threshold) {
              consecutiveViolations.current++;
              if (consecutiveViolations.current > 3) { // Require a few frames of movement to avoid noise
                setStatus('violation');
                const now = Date.now();
                if (now > violationCooldown.current) {
                  onViolation("Head movement detected. Please remain steady.");
                  violationCooldown.current = now + 4000; // 4s cooldown for reporting
                }
              }
            } else {
              consecutiveViolations.current = 0;
              setStatus('detected');
            }
          }
          lastFrameData.current = currentFrame;
        }, 200);

      } catch (err) {
        onViolation("Security Alert: Camera access is mandatory for this session.");
      }
    };

    startMonitoring();

    return () => {
      active = false;
      if (checkInterval) clearInterval(checkInterval);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [sensitivity, onViolation]);

  return (
    <div className={`fixed top-4 right-4 md:top-10 md:right-10 z-[1000] w-32 h-24 md:w-56 md:h-40 rounded-[2rem] border-4 overflow-hidden shadow-2xl transition-all duration-300 pointer-events-none ${status === 'violation' ? 'border-red-600 alert-violation scale-110' : 'border-indigo-600'}`}>
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-75" />
      <canvas ref={canvasRef} className="hidden" width="160" height="120" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      <div className="absolute bottom-3 left-4 flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${status === 'detected' ? 'bg-emerald-500' : status === 'violation' ? 'bg-red-600 animate-pulse' : 'bg-slate-400'}`}></div>
         <span className="text-[9px] font-black text-white uppercase tracking-widest">{status === 'detected' ? 'Secured' : status === 'violation' ? 'Warning' : 'Offline'}</span>
      </div>
    </div>
  );
};

export default FaceMonitor;
