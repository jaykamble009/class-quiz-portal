
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;
    let active = true;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.debug("QRScanner: Play request interrupted:", error);
            });
          }
          
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        if (active) {
          setError("Camera access denied. Please enable camera permissions in your browser.");
        }
      }
    };

    const tick = () => {
      if (!active) return;
      
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code) {
              onScan(code.data);
              active = false; // Stop further scans
            }
          }
        }
      }
      if (active) animationId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
      <div className="w-full max-w-lg space-y-8 text-center animate-in zoom-in duration-300">
        <div className="relative aspect-square w-full border-4 border-indigo-500/30 rounded-[4rem] flex items-center justify-center overflow-hidden bg-black shadow-[0_0_50px_rgba(79,70,229,0.3)]">
          {error ? (
            <div className="p-10 text-red-400 font-bold uppercase tracking-widest text-xs">
              <i className="fa-solid fa-triangle-exclamation text-4xl mb-4 block"></i>
              {error}
            </div>
          ) : (
            <>
              {/* Force color and high quality */}
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover grayscale-0 contrast-125 saturate-150"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* HUD Decoration */}
              <div className="absolute inset-12 border-2 border-indigo-500/40 rounded-[2.5rem] pointer-events-none">
                 <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-400 -translate-x-1 -translate-y-1 rounded-tl-xl"></div>
                 <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-400 translate-x-1 -translate-y-1 rounded-tr-xl"></div>
                 <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-400 -translate-x-1 translate-y-1 rounded-bl-xl"></div>
                 <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-400 translate-x-1 translate-y-1 rounded-br-xl"></div>
              </div>
              
              {/* Laser Scan Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500 shadow-[0_0_25px_rgba(79,70,229,1)] animate-[vibrant-scan_2.5s_infinite]"></div>
              
              <div className="absolute bottom-10 left-0 right-0 text-center px-8">
                <p className="bg-indigo-600/90 backdrop-blur-xl inline-block px-8 py-3 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.3em] border border-white/20 shadow-2xl">
                   <i className="fa-solid fa-expand mr-3"></i> Identify Hub Node
                </p>
              </div>
            </>
          )}
        </div>
        
        <div className="flex flex-col gap-4 items-center">
          <button 
            onClick={onClose} 
            className="px-16 py-6 bg-white text-slate-950 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95"
          >
            Abort Link
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes vibrant-scan {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
