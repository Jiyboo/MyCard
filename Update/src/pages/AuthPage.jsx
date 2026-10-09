import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const API_URL = import.meta.env.VITE_API_BASE_URL;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || 'SITE_KEY_DUMMY';

const AuthPage = ({ onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginStep, setLoginStep] = useState(1);
  const [showMethodSelection, setShowMethodSelection] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    username: '',
    email: '',
    password: '',
    pin: '',
    nfc_card_id: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  const [hasFaceId, setHasFaceId] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [hasNFC, setHasNFC] = useState(false);

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showNfcModal, setShowNfcModal] = useState(false);
  const [nfcStatusText, setNfcStatusText] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showNfcId, setShowNfcId] = useState(false);

  const [scanPhase, setScanPhase] = useState('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [isBlinked, setIsBlinked] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionInterval = useRef(null);
  const nfcInputRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);

    const fetchCsrf = async () => {
      try {
        const res = await fetch(`${API_URL}/api/csrf-token`, { credentials: 'include' });
        const data = await res.json();
        if (data && data.csrf_token) {
          setCsrfToken(data.csrf_token);
        }
        const token = res.headers.get('X-CSRF-Token');
        if (token) {
          setCsrfToken(token);
        }
      } catch (err) {}
    };
    fetchCsrf();

    if (RECAPTCHA_SITE_KEY !== 'SITE_KEY_DUMMY') {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.id = 'recaptcha-script';
      document.body.appendChild(script);
    }

    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 200;
        dummyCanvas.height = 200;
        try {
          await faceapi.detectSingleFace(dummyCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 })).withFaceLandmarks().withFaceDescriptor();
        } catch (e) {}
        setModelsLoaded(true);
      } catch (err) {
        setMessage({ type: 'error', text: 'Gagal memuat model Face API' });
      }
    };
    loadModels();
    
    return () => {
      stopCamera();
      const scriptNode = document.getElementById('recaptcha-script');
      if (scriptNode) {
        document.body.removeChild(scriptNode);
      }
    };
  }, []);

  useEffect(() => {
    if (showNfcModal && nfcInputRef.current) {
      nfcInputRef.current.focus();
    }
  }, [showNfcModal]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const executeRecaptcha = async () => {
    return new Promise((resolve) => {
      if (RECAPTCHA_SITE_KEY === 'SITE_KEY_DUMMY' || !window.grecaptcha) {
        resolve('dummy_token');
        return;
      }
      
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' })
          .then((token) => resolve(token))
          .catch(() => resolve('dummy_token'));
      });
    });
  };

  const handleNextStep = async () => {
    if (!formData.username.trim()) return;
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_URL}/api/check-user?username=${encodeURIComponent(formData.username)}`, {
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        setHasFaceId(data.biometric_enabled);
        setHas2FA(data.two_factor_enabled);
        setHasNFC(data.nfc_enabled);

        if (data.biometric_enabled || data.nfc_enabled) {
          setShowMethodSelection(true);
          setLoginStep(2);
        } else {
          setShowPasswordField(true);
          setLoginStep(2);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Username tidak ditemukan' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Gagal mengecek username ke server' });
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
  };

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoInputs);
      if (videoInputs.length > 0 && !selectedCamera) {
        setSelectedCamera(videoInputs[0].deviceId);
      }
    } catch (e) {}
  };

  const startFaceLogin = async (deviceId = null) => {
    if (!modelsLoaded) return;
    stopCamera();
    setShowFaceModal(true);
    setScanPhase('requesting');
    setScanProgress(0);
    setIsBlinked(false);

    try {
      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 640 } } 
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setScanPhase('detecting');
          startFaceDetection();
        };
      }
      await loadCameras();
    } catch (error) {
      setScanPhase('idle');
      setMessage({ type: 'error', text: 'Tidak dapat mengakses kamera untuk Face ID.' });
      setShowFaceModal(false);
    }
  };

  const getEyeAspectRatio = (eye) => {
    const d1 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const d2 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    const d3 = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    return (d1 + d2) / (2.0 * d3);
  };

  const startFaceDetection = () => {
    let progress = 0;
    let localBlinked = false;
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 });

    detectionInterval.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && scanPhase !== 'processing') {
        const detection = await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
          if (!localBlinked) {
            const leftEye = detection.landmarks.getLeftEye();
            const rightEye = detection.landmarks.getRightEye();
            const ear = (getEyeAspectRatio(leftEye) + getEyeAspectRatio(rightEye)) / 2.0;

            if (ear < 0.22) {
              localBlinked = true;
              setIsBlinked(true);
            }
          }

          if (localBlinked) {
            progress += 20;
            setScanProgress(progress);
            if (progress >= 100) {
              clearInterval(detectionInterval.current);
              setScanPhase('processing');
              const descriptorArray = Array.from(detection.descriptor);
              executeSubmit('face_id', JSON.stringify(descriptorArray));
            }
          }
        }
      }
    }, 150);
  };

  const handleCameraChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedCamera(newDeviceId);
    startFaceLogin(newDeviceId);
  };

  const cancelFaceLogin = () => {
    stopCamera();
    setShowFaceModal(false);
    setScanPhase('idle');
  };

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      if (loginStep === 1) {
        handleNextStep();
      } else if (loginStep === 2 && showPasswordField) {
        if (has2FA) {
          setShowPinModal(true);
        } else {
          executeSubmit('password');
        }
      }
    } else {
      executeSubmit('password');
    }
  };

  const submitPin = () => {
    if (formData.pin.length < 4) {
      setMessage({ type: 'error', text: 'PIN tidak valid.' });
      return;
    }
    setShowPinModal(false);
    executeSubmit('password');
  };

  const submitNfc = () => {
    if (!formData.nfc_card_id.trim()) {
      setMessage({ type: 'error', text: 'ID Kartu tidak valid.' });
      return;
    }
    setShowNfcModal(false);
    executeSubmit('nfc');
  };

  const handleNfcKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitNfc();
    }
  };

  const executeSubmit = async (method, faceDataStr = '', overrideNfcId = null) => {
    if (method !== 'face_id') setIsLoading(true);
    setMessage({ type: '', text: '' });

    const tokenCaptcha = await executeRecaptcha();

    const endpoint = isLogin ? `${API_URL}/api/login` : `${API_URL}/api/register`;
    const payload = isLogin
      ? { username: formData.username, password: formData.password, login_method: method, login_face_data: faceDataStr, pin: formData.pin, nfc_card_id: overrideNfcId || formData.nfc_card_id, captcha_token: tokenCaptcha }
      : { ...formData, captcha_token: tokenCaptcha };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include', 
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Terjadi kesalahan pada server');

      if (isLogin) {
        const loggedInUser = data.user;
        localStorage.setItem('user', JSON.stringify(loggedInUser));

        if (method === 'face_id') {
          setScanPhase('success');
          setTimeout(() => {
            stopCamera();
            setShowFaceModal(false);
            setMessage({ type: 'success', text: 'Face ID cocok! Mengalihkan...' });
            setTimeout(() => onNavigate('dashboard'), 1000);
          }, 1500);
        } else {
          setMessage({ type: 'success', text: 'Login berhasil! Mengalihkan...' });
          setTimeout(() => onNavigate('dashboard'), 1500);
        }
      } else {
        setMessage({ type: 'success', text: data.message || 'Registrasi berhasil! Menunggu aktivasi.' });
        setTimeout(() => {
          setIsLogin(true);
          setLoginStep(1);
          setShowMethodSelection(false);
          setShowPasswordField(false);
          setMessage({ type: '', text: '' });
          setFormData({ ...formData, password: '', pin: '', nfc_card_id: '' });
        }, 2000);
      }
    } catch (error) {
      if (method === 'face_id') {
        stopCamera();
        setShowFaceModal(false);
        setScanPhase('idle');
      }
      setMessage({ type: 'error', text: error.message });
      setFormData({ ...formData, pin: '', nfc_card_id: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setLoginStep(1);
    setShowMethodSelection(false);
    setShowPasswordField(false);
    setMessage({ type: '', text: '' });
    setHasFaceId(false);
    setHas2FA(false);
    setHasNFC(false);
    setFormData({ ...formData, pin: '', nfc_card_id: '' });
  };

  const selectPasswordMethod = () => {
    setShowMethodSelection(false);
    setShowPasswordField(true);
  };

  const selectNfcMethod = async () => {
    setShowNfcModal(true);
    setNfcStatusText('Tempelkan kartu ke perangkat atau alat reader Anda.');

    if ('NDEFReader' in window) {
      try {
        const ndef = new window.NDEFReader();
        await ndef.scan();

        ndef.onreading = event => {
          const serialNumber = event.serialNumber;
          setFormData(prev => ({ ...prev, nfc_card_id: serialNumber }));
          setNfcStatusText('Kartu terbaca, memproses login...');

          setTimeout(() => {
            setShowNfcModal(false);
            executeSubmit('nfc', '', serialNumber);
          }, 600);
        };

        ndef.onreadingerror = () => {
          setNfcStatusText('Browser menolak e-KTP. Ketik ID manual di kolom bawah atau gunakan alat USB.');
        };
      } catch (error) {
        setNfcStatusText('Sensor NFC tidak aktif. Ketik manual atau gunakan alat USB.');
      }
    } else {
      setNfcStatusText('Browser tidak mendukung Web NFC. Ketik manual atau gunakan alat USB.');
    }
  };

  const circleRadius = 110;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (scanProgress / 100) * circleCircumference;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-500 overflow-hidden relative">
      <style>{`
        @keyframes scanForm { 0% { top: -50%; } 100% { top: 150%; } }
        @keyframes typeLogin1 { 0%, 15% { width: 0; } 30%, 100% { width: 80px; } }
        @keyframes typeLogin2 { 0%, 35% { width: 0; } 55%, 100% { width: 60px; } }
        @keyframes cursorLogin { 0%, 5% { transform: translate(200px, 300px); opacity: 0; } 10% { transform: translate(200px, 300px); opacity: 1; } 15% { transform: translate(50px, 152px); } 30% { transform: translate(130px, 152px); } 35% { transform: translate(50px, 202px); } 55% { transform: translate(110px, 202px); } 60% { transform: translate(120px, 268px); scale: 1; } 65% { transform: translate(120px, 268px) scale(0.8); } 70%, 90% { transform: translate(120px, 268px) scale(1); opacity: 0; } 100% { transform: translate(200px, 300px); opacity: 0; } }
        @keyframes checkLogin { 0%, 65% { transform: scale(0); opacity: 0; } 70%, 90% { transform: scale(1); opacity: 1; } 95%, 100% { transform: scale(0); opacity: 0; } }
        @keyframes typeReg1 { 0%, 8% { width: 0; } 20%, 100% { width: 90px; } }
        @keyframes typeReg2 { 0%, 25% { width: 0; } 37%, 100% { width: 80px; } }
        @keyframes typeReg3 { 0%, 42% { width: 0; } 54%, 100% { width: 70px; } }
        @keyframes cursorReg { 0%, 2% { transform: translate(200px, 300px); opacity: 0; } 4% { opacity: 1; transform: translate(200px, 300px); } 8% { transform: translate(50px, 125px); } 20% { transform: translate(140px, 125px); } 25% { transform: translate(50px, 170px); } 37% { transform: translate(130px, 170px); } 42% { transform: translate(50px, 215px); } 54% { transform: translate(120px, 215px); } 60% { transform: translate(120px, 268px); scale: 1; } 65% { transform: translate(120px, 268px) scale(0.8); } 70%, 90% { transform: translate(120px, 268px) scale(1); opacity: 0; } 100% { transform: translate(200px, 300px); opacity: 0; } }
        @keyframes checkReg { 0%, 65% { transform: scale(0); opacity: 0; } 70%, 90% { transform: scale(1); opacity: 1; } 95%, 100% { transform: scale(0); opacity: 0; } }
        @keyframes tapCard { 0%, 100% { transform: translate(30px, -30px) rotate(15deg); opacity: 0; } 20% { opacity: 1; } 50% { transform: translate(0px, 0px) rotate(0deg); } 80% { opacity: 1; transform: translate(0px, 0px) rotate(0deg); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes pingEffect { 0% { transform: scale(1); opacity: 1; } 75%, 100% { transform: scale(2); opacity: 0; } }

        .type-login-1 { animation: typeLogin1 4s infinite ease-out; }
        .type-login-2 { animation: typeLogin2 4s infinite ease-out; }
        .cursor-login { animation: cursorLogin 4s infinite ease-in-out; }
        .check-login { animation: checkLogin 4s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: 120px 180px; }
        .type-reg-1 { animation: typeReg1 5.5s infinite ease-out; }
        .type-reg-2 { animation: typeReg2 5.5s infinite ease-out; }
        .type-reg-3 { animation: typeReg3 5.5s infinite ease-out; }
        .cursor-reg { animation: cursorReg 5.5s infinite ease-in-out; }
        .check-reg { animation: checkReg 5.5s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-origin: 120px 180px; }
        
        .anim-scan { animation: scanForm 5s linear infinite; }
        .anim-pop { animation: popIn 0.3s ease-out forwards; }
        .anim-pop-fast { animation: popIn 0.2s ease-out forwards; }
        .anim-ping-1 { animation: pingEffect 1.5s cubic-bezier(0,0,0.2,1) infinite; }
        .anim-ping-2 { animation: pingEffect 2s cubic-bezier(0,0,0.2,1) infinite; }
        .anim-tap { animation: tapCard 2s ease-in-out infinite; transform-origin: bottom right; }
      `}</style>

      <button onClick={() => onNavigate('landing')} className="absolute top-6 left-6 z-50 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[rgb(var(--theme-600))] dark:hover:text-[rgb(var(--theme-400))] transition-colors font-medium bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-md">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Kembali
      </button>

      <div className={`max-w-5xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <div className="w-full md:w-1/2 bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-12 relative overflow-hidden hidden md:flex">
          <div className="absolute inset-0 z-0 pointer-events-none"><div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[rgb(var(--theme-600))] to-transparent opacity-5 dark:opacity-10"></div></div>
          <div className="relative w-64 h-80 z-10 flex items-center justify-center">
            <svg viewBox="0 0 240 320" className={`absolute inset-0 w-full h-full drop-shadow-2xl transition-all duration-500 ${isLogin ? 'opacity-100 scale-100 z-20' : 'opacity-0 scale-95 z-0 pointer-events-none'}`}>
              <rect x="10" y="10" width="220" height="300" rx="16" className="fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700" strokeWidth="2" />
              <circle cx="120" cy="75" r="20" className="fill-[rgb(var(--theme-100))] dark:fill-[rgba(var(--theme-900),0.5)]" />
              <path d="M 90 110 A 30 30 0 0 1 150 110" stroke="currentColor" className="stroke-[rgb(var(--theme-500))]" strokeWidth="4" strokeLinecap="round" fill="none" />
              <circle cx="120" cy="75" r="8" className="fill-[rgb(var(--theme-500))]" />
              <rect x="40" y="140" width="160" height="24" rx="6" className="fill-gray-100 dark:fill-gray-900" />
              <rect x="45" y="150" height="4" rx="2" className="fill-[rgb(var(--theme-400))] type-login-1" />
              <rect x="40" y="190" width="160" height="24" rx="6" className="fill-gray-100 dark:fill-gray-900" />
              <rect x="45" y="200" height="4" rx="2" className="fill-[rgb(var(--theme-400))] type-login-2" />
              <rect x="40" y="250" width="160" height="36" rx="8" className="fill-[rgb(var(--theme-600))]" />
              <rect x="95" y="266" width="50" height="4" rx="2" className="fill-white opacity-60" />
              <g className="check-login"><circle cx="120" cy="180" r="45" className="fill-green-500" /><path d="M100 180 L115 195 L145 160" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></g>
              <g className="cursor-login"><path d="M 0 0 L 18 7 L 11 11 L 7 18 Z" className="fill-gray-800 dark:fill-gray-300 drop-shadow-md" /></g>
            </svg>
            <svg viewBox="0 0 240 320" className={`absolute inset-0 w-full h-full drop-shadow-2xl transition-all duration-500 ${!isLogin ? 'opacity-100 scale-100 z-20' : 'opacity-0 scale-95 z-0 pointer-events-none'}`}>
              <rect x="10" y="10" width="220" height="300" rx="16" className="fill-white dark:fill-gray-800 stroke-gray-200 dark:stroke-gray-700" strokeWidth="2" />
              <circle cx="120" cy="65" r="16" className="fill-[rgb(var(--theme-100))] dark:fill-[rgba(var(--theme-900),0.5)]" />
              <path d="M 96 95 A 24 24 0 0 1 144 95" stroke="currentColor" className="stroke-[rgb(var(--theme-500))]" strokeWidth="4" strokeLinecap="round" fill="none" />
              <circle cx="120" cy="65" r="6" className="fill-[rgb(var(--theme-500))]" />
              <rect x="40" y="115" width="160" height="20" rx="6" className="fill-gray-100 dark:fill-gray-900" />
              <rect x="45" y="123" height="4" rx="2" className="fill-[rgb(var(--theme-400))] type-reg-1" />
              <rect x="40" y="160" width="160" height="20" rx="6" className="fill-gray-100 dark:fill-gray-900" />
              <rect x="45" y="168" height="4" rx="2" className="fill-[rgb(var(--theme-400))] type-reg-2" />
              <rect x="40" y="205" width="160" height="20" rx="6" className="fill-gray-100 dark:fill-gray-900" />
              <rect x="45" y="213" height="4" rx="2" className="fill-[rgb(var(--theme-400))] type-reg-3" />
              <rect x="40" y="250" width="160" height="36" rx="8" className="fill-[rgb(var(--theme-600))]" />
              <rect x="95" y="266" width="50" height="4" rx="2" className="fill-white opacity-60" />
              <g className="check-reg"><circle cx="120" cy="180" r="45" className="fill-green-500" /><path d="M100 180 L115 195 L145 160" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></g>
              <g className="cursor-reg"><path d="M 0 0 L 18 7 L 11 11 L 7 18 Z" className="fill-gray-800 dark:fill-gray-300 drop-shadow-md" /></g>
            </svg>
          </div>
          <h2 className="mt-8 text-2xl font-bold text-gray-900 dark:text-white tracking-wide z-10">Jiaf <span className="text-[rgb(var(--theme-600))]">Sistem</span></h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-xs z-10">Akses platform manajemen kartu digital dengan aman dan cepat.</p>
        </div>

        <div className="w-full md:w-1/2 p-10 md:p-14 relative overflow-hidden flex flex-col justify-center bg-white dark:bg-gray-800">
          <div className="absolute left-0 right-0 h-48 bg-gradient-to-b from-transparent via-[rgba(var(--theme-500),0.05)] dark:via-[rgba(var(--theme-500),0.1)] to-transparent anim-scan pointer-events-none z-0"></div>
          <div className="relative z-10 w-full h-full">
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">{isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{isLogin ? 'Silakan masukkan kredensial Anda untuk melanjutkan.' : 'Daftarkan diri Anda untuk mengelola kartu anggota.'}</p>

            {message.text && (
              <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'}`}>
                {message.text}
              </div>
            )}

            <form className="space-y-5 relative" onSubmit={handleInitialSubmit}>

              <div className="opacity-100 transition-all">
                {!isLogin && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                    <input type="text" name="nama_lengkap" value={formData.nama_lengkap} onChange={handleChange} required={!isLogin} className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                  </div>
                )}

                {(isLogin && loginStep === 1) && (
                  <>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                      <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-[rgb(var(--theme-600))] text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(var(--theme-600),0.4)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                      {isLoading ? 'Mengecek...' : 'Lanjut'}
                    </button>
                  </>
                )}

                {(isLogin && loginStep === 2) && (
                  <>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                      <div className="flex gap-2">
                        <input type="text" value={formData.username} disabled className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed"/>
                        <button type="button" onClick={() => { setLoginStep(1); setShowMethodSelection(false); setShowPasswordField(false); }} className="px-5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Ubah</button>
                      </div>
                    </div>

                    {showMethodSelection && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Pilih Metode Login:</p>
                        {hasFaceId && (
                           <button type="button" onClick={() => startFaceLogin(selectedCamera)} disabled={!modelsLoaded} className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-4 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98] disabled:opacity-70">
                             {!modelsLoaded ? <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>}
                             {modelsLoaded ? 'Login dengan Face ID' : 'Memuat AI...'}
                           </button>
                        )}
                        {hasNFC && (
                           <button type="button" onClick={selectNfcMethod} className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-4 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98]">
                             <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                             Scan Kartu / e-KTP
                           </button>
                        )}
                        <button type="button" onClick={selectPasswordMethod} className="w-full flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-4 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98]">
                           <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                           Gunakan Kata Sandi
                        </button>
                      </div>
                    )}

                    {showPasswordField && (
                      <>
                        <div className="mb-5 relative">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                          <div className="relative">
                            <input type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                              {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                          {(hasFaceId || hasNFC) ? (
                            <button type="button" onClick={() => { setShowPasswordField(false); setShowMethodSelection(true); }} className="text-sm text-[rgb(var(--theme-600))] hover:underline font-bold flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                              Ganti Metode
                            </button>
                          ) : <div></div>}
                          <a href="#" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium">Lupa Password?</a>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-[rgb(var(--theme-600))] text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(var(--theme-600),0.4)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                          {isLoading ? 'Memproses...' : 'Masuk'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {!isLogin && (
                  <>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                      <input type="text" name="username" value={formData.username} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                    </div>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                    </div>
                    <div className="mb-5 relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-[rgb(var(--theme-600))] text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(var(--theme-600),0.4)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                      {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
                    </button>
                  </>
                )}

              </div>
            </form>

            <div className={`mt-8 text-center text-sm text-gray-600 dark:text-gray-400`}>
              {isLogin ? 'Belum memiliki akun? ' : 'Sudah memiliki akun? '}
              <button onClick={toggleAuthMode} className="text-[rgb(var(--theme-600))] font-bold hover:underline">
                {isLogin ? 'Daftar' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFaceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl"></div>
          <div className="w-full max-w-md p-6 z-10 relative flex flex-col items-center select-none anim-pop">
            <div className="mb-6 text-center">
              <h3 className="text-3xl font-black text-white tracking-tight">Login Face ID</h3>
              <div className="mt-2 min-h-[50px] flex flex-col items-center justify-center">
                {scanPhase === 'idle' && <p className="text-gray-400 text-base">Siapkan wajah Anda</p>}
                {scanPhase === 'requesting' && <p className="text-blue-400 text-base animate-pulse">Menghubungkan sensor...</p>}
                {scanPhase === 'detecting' && !isBlinked && <p className="text-yellow-400 text-base">Tatap kamera dan kedipkan mata Anda...</p>}
                {scanPhase === 'detecting' && isBlinked && <p className="text-emerald-400 text-base">Mata terdeteksi, memindai wajah...</p>}
                {scanPhase === 'processing' && <p className="text-blue-400 text-lg font-bold">Memverifikasi wajah...</p>}
                {scanPhase === 'success' && <p className="text-emerald-400 text-lg font-bold">Verifikasi Selesai</p>}
              </div>
            </div>
            <div className="relative w-72 h-72 flex items-center justify-center mb-6">
              <svg className="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none" viewBox="0 0 260 260">
                <circle cx="130" cy="130" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                <circle cx="130" cy="130" r={circleRadius} fill="none" stroke={scanPhase === 'success' ? '#10B981' : '#3B82F6'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circleCircumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-300 ease-out" />
              </svg>
              <div className="absolute w-[220px] h-[220px] rounded-full overflow-hidden bg-zinc-900 z-10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10">
                <video ref={videoRef} playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] ${scanPhase === 'detecting' || scanPhase === 'processing' || scanPhase === 'success' ? 'block' : 'hidden'}`}></video>
                {scanPhase === 'success' && (
                  <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center anim-pop z-30">
                    <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
              </div>
            </div>
            {cameras.length > 1 && scanPhase !== 'success' && (
              <div className="mb-6 w-full max-w-xs">
                <select value={selectedCamera} onChange={handleCameraChange} className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-center cursor-pointer">
                  {cameras.map((camera, index) => (
                    <option key={camera.deviceId} value={camera.deviceId} className="text-gray-900 bg-white">
                      {camera.label || `Kamera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-full max-w-xs space-y-3 mt-4">
              <button onClick={cancelFaceLogin} className="w-full px-4 py-3.5 rounded-2xl font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">Batalkan</button>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 p-8 text-center anim-pop-fast">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Autentikasi 2 Langkah</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Masukkan PIN keamanan 2FA Anda</p>
            <div className="relative mb-6">
              <input type={showPin ? "text" : "password"} maxLength="6" name="pin" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/[^0-9]/g, '')})} placeholder="••••••" className="w-full text-center text-3xl tracking-[0.5em] px-4 py-4 pr-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
              <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                {showPin ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => {setShowPinModal(false); setFormData({...formData, pin: ''})}} className="flex-1 py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Batal</button>
              <button onClick={submitPin} disabled={isLoading} className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] disabled:opacity-70">Verifikasi</button>
            </div>
          </div>
        </div>
      )}

      {showNfcModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 p-8 text-center anim-pop-fast">
            <div className="flex justify-end mb-2">
              <button onClick={() => {setShowNfcModal(false); setFormData({...formData, nfc_card_id: ''})}} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="relative w-32 h-40 mx-auto mb-6 flex justify-center items-center">
              <svg className="absolute w-20 h-32 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01" />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <span className="absolute w-8 h-8 border-2 border-emerald-500 rounded-full anim-ping-1"></span>
                <span className="absolute w-12 h-12 border-2 border-emerald-500 rounded-full anim-ping-2"></span>
              </div>
              <svg className="absolute w-16 h-10 text-[rgb(var(--theme-500))] anim-tap" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4v8h16V8H4z" />
              </svg>
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Scan Kartu Anda</h3>
            <p className="text-sm font-semibold text-red-500 mb-4">{nfcStatusText}</p>
            <div className="relative mb-6">
              <input 
                ref={nfcInputRef}
                type={showNfcId ? "text" : "password"} 
                name="nfc_card_id" 
                value={formData.nfc_card_id} 
                onChange={(e) => setFormData({...formData, nfc_card_id: e.target.value})} 
                onKeyDown={handleNfcKeyDown}
                placeholder="Ketik manual Nomor KTP (NIK)" 
                className="w-full text-center px-4 py-4 pr-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"
              />
              <button type="button" onClick={() => setShowNfcId(!showNfcId)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                {showNfcId ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            <button onClick={submitNfc} disabled={isLoading} className="w-full py-4 rounded-xl font-bold text-white bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] disabled:opacity-70 shadow-lg">
              {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuthPage;