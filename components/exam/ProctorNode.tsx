
import React, { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface ProctorNodeProps {
  onViolation: (type: any, msg: string, confidence: number, snapshotHash?: string) => void;
  faceSensitivity: number; // 1 (Low) to 10 (High)
}

const ProctorNode = React.memo(({ onViolation, faceSensitivity }: ProctorNodeProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<{ msg: string, color: string }>({ msg: 'Initializing AI...', color: 'text-slate-400' });

  // Keep latest callback without triggering re-effects
  const onViolationRef = useRef(onViolation);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);

  // AI References
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number>(0);

  // Logic References
  const violationCooldown = useRef<number>(0);
  const missingFaceTimer = useRef<number>(0);
  const lookingAwayTimer = useRef<number>(0);

  // Helper: Generate SHA-256 Hash of image data for privacy-compliant logging
  const generateSnapshotHash = async (video: HTMLVideoElement): Promise<string> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return "hash-gen-failed";
      ctx.drawImage(video, 0, 0, 160, 120);

      const base64 = canvas.toDataURL('image/jpeg', 0.1);
      const msgBuffer = new TextEncoder().encode(base64);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      return "privacy-protected-content";
    }
  };

  useEffect(() => {
    let active = true;

    const predictWebcam = async () => {
      if (!active || !faceLandmarkerRef.current || !videoRef.current) return;

      const video = videoRef.current;
      // Only process if video has advanced and has enough data
      if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2 && !video.paused && !video.ended) {
        lastVideoTimeRef.current = video.currentTime;

        try {
          const startTimeMs = performance.now();
          const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

          // --- LOGIC TUNING ---

          // 1. Missing Face
          if (results.faceLandmarks.length === 0) {
            missingFaceTimer.current += 100; // increment approx based on frame rate

            // Tolerance: 3.5s (Hardened from 10s)
            if (missingFaceTimer.current > 3500) {
              if (Date.now() > violationCooldown.current) {
                onViolationRef.current('face-missing', 'Face not detected. Stay in camera view.', 1.0);
                violationCooldown.current = Date.now() + 4000;
              }
            }
          } else if (results.faceLandmarks.length > 1) {
            // Multiple Faces
            if (Date.now() > violationCooldown.current) {
              const hash = await generateSnapshotHash(video);
              onViolationRef.current('multiple-faces', 'Multiple people detected.', 1.0, hash);
              violationCooldown.current = Date.now() + 5000;
            }
          } else {
            // Reset Missing Face Timer if face found
            if (missingFaceTimer.current > 0) missingFaceTimer.current = Math.max(0, missingFaceTimer.current - 200);

            // 2. Looking Away Logic
            const landmarks = results.faceLandmarks[0];
            const nose = landmarks[1];
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];

            const leftDist = Math.abs(nose.x - leftEar.x);
            const rightDist = Math.abs(nose.x - rightEar.x);
            const ratio = leftDist / (rightDist + 0.001);

            const strictness = Math.min(Math.max(faceSensitivity, 1), 10) / 10;
            // Ultra-safe boundaries
            const lowerLimit = 0.10 + (0.2 * strictness);
            const upperLimit = 7.0 - (3.0 * strictness);

            if (ratio < lowerLimit || ratio > upperLimit) {
              lookingAwayTimer.current += 100;
              // Tolerance: 3s (Hardened from 8s)
              if (lookingAwayTimer.current > 3000) {
                if (Date.now() > violationCooldown.current) {
                  const hash = await generateSnapshotHash(video);
                  onViolationRef.current('looking-away', 'Security Alert: Focused eye contact required.', 0.9, hash);
                  violationCooldown.current = Date.now() + 4000;
                }
              }
            } else {
              if (lookingAwayTimer.current > 0) lookingAwayTimer.current = Math.max(0, lookingAwayTimer.current - 200);
            }
          }
        } catch (e) {
          // console.warn("AI Frame Skip:", e);
        }
      }

      if (active) requestRef.current = requestAnimationFrame(predictWebcam);
    };

    const setupAI = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        if (!active) return;

        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 2
        });

        if (active) startCamera();
      } catch (err) {
        console.error("AI Load Failed:", err);
        if (active) setStatus({ msg: 'AI Core Failed - Manual Mode', color: 'text-amber-500' });
      }
    };

    const startCamera = async () => {
      try {
        // Use 'ideal' constraints for broader device support
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
          },
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            // Ensure video plays once metadata is loaded
            videoRef.current?.play().catch(e => console.error("Auto-play failed:", e));
          };
          videoRef.current.addEventListener('loadeddata', predictWebcam);
        }
        setStatus({ msg: 'Secure Environment', color: 'text-emerald-500' });
      } catch (err) {
        console.error("Camera Error:", err);
        if (active) {
          setStatus({ msg: 'Camera Blocked', color: 'text-red-500' });
          onViolationRef.current('sensor', 'Camera access required for exam validation.', 1, undefined);
        }
      }
    };

    setupAI();

    return () => {
      active = false;
      cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(t => t.stop());
      }
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch (e) { /* ignore cleanup errors */ }
        faceLandmarkerRef.current = null;
      }
    };
  }, [faceSensitivity]);

  return (
    <div className={`fixed top-4 right-4 z-[1000] w-32 h-24 sm:w-48 sm:h-36 md:w-56 md:h-42 lg:w-64 lg:h-48 rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-3 md:border-4 shadow-2xl transition-all ${status.color === 'text-red-500' ? 'border-red-500 animate-pulse' : status.color === 'text-emerald-500' ? 'border-emerald-500' : 'border-amber-500'} bg-black`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover -scale-x-100"
        playsInline
        muted
        autoPlay
      ></video>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-between p-2 sm:p-3 md:p-4 pointer-events-none">
        {/* Top indicator */}
        <div className="flex items-center justify-between">
          <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full ${status.color === 'text-emerald-500' ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : status.color === 'text-red-500' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`}></div>
          <i className="fa-solid fa-shield-halved text-white/50 text-xs sm:text-sm"></i>
        </div>
        {/* Bottom status */}
        <div className="flex flex-col gap-1">
          <span className={`text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider ${status.color} drop-shadow-lg`}>{status.msg}</span>
          <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-white/60">AI Proctoring</span>
        </div>
      </div>
    </div>
  );
});

export default ProctorNode;
