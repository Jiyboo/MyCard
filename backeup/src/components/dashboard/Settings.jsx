import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Settings = ({ onNavigate }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    two_factor_enabled: false,
    two_factor_pin: '',
    biometric_enabled: false,
    nfc_enabled: false,
    nfc_card_id: '',
    face_data: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showNfcScanModal, setShowNfcScanModal] = useState(false);
  const [tempPin, setTempPin] = useState('');
  
  const [scanPhase, setScanPhase] = useState('idle'); 
  const [scanProgress, setScanProgress] = useState(0);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const [showNfcSecret, setShowNfcSecret] = useState(false);
  const [showPinSecret, setShowPinSecret] = useState(false);
  const [showTempPin, setShowTempPin] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionInterval = useRef(null);
  const nfcInputRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSettings({
        two_factor_enabled: parsedUser.two_factor_enabled || false,
        two_factor_pin: parsedUser.two_factor_pin || '',
        biometric_enabled: parsedUser.biometric_enabled || false,
        nfc_enabled: parsedUser.nfc_enabled || false,
        nfc_card_id: parsedUser.nfc_card_id || '',
        face_data: parsedUser.face_data || ''
      });
    } else {
      onNavigate('auth');
    }
  }, [onNavigate]);

  useEffect(() => {
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
          await faceapi.detectSingleFace(dummyCanvas).withFaceLandmarks().withFaceDescriptor();
        } catch (e) {}

        setModelsLoaded(true);
      } catch (err) {
        showAlert('Error', 'Gagal memuat model pendeteksi wajah', 'error');
      }
    };
    loadModels();
    
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (showNfcScanModal && nfcInputRef.current) {
      nfcInputRef.current.focus();
    }
  }, [showNfcScanModal]);

  const showAlert = (title, message, type = 'success') => {
    setCustomAlert({ isOpen: true, title, message, type });
    if (type === 'success') {
      setTimeout(() => setCustomAlert(prev => ({ ...prev, isOpen: false })), 2500);
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

  const startCameraStream = async (deviceId = null) => {
    if (!modelsLoaded) return;
    stopCamera();
    setScanPhase('requesting');
    
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
          setScanPhase('scanning');
          setScanProgress(0);
          startFaceDetection();
        };
      }
      
      await loadCameras();
    } catch (error) {
      setScanPhase('idle');
      showAlert('Gagal Akses Kamera', 'Pastikan izin kamera telah diberikan.', 'error');
    }
  };

  const startFaceDetection = () => {
    let progress = 0;
    let descriptors = [];
    
    detectionInterval.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
        
        if (detection) {
          descriptors.push(detection.descriptor);
          progress += 20;
          setScanProgress(progress);
          
          if (progress >= 100) {
            clearInterval(detectionInterval.current);
            finishEnrollment(descriptors[0]);
          }
        }
      }
    }, 500);
  };

  const finishEnrollment = (descriptor) => {
    const descriptorArray = Array.from(descriptor);
    
    setSettings(prev => ({
      ...prev,
      biometric_enabled: true,
      face_data: JSON.stringify(descriptorArray)
    }));

    setScanPhase('success');
    setTimeout(() => {
      stopCamera();
      setShowFaceModal(false);
    }, 2000);
  };

  const generateNfcId = () => {
    const randomId = 'NFC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setSettings(prev => ({ ...prev, nfc_card_id: randomId }));
  };

  const scanHardwareNfc = async () => {
    setShowNfcScanModal(true);
    if ('NDEFReader' in window) {
      try {
        const ndef = new window.NDEFReader();
        await ndef.scan();
        
        ndef.onreading = event => {
          const serialNumber = event.serialNumber;
          setSettings(prev => ({ ...prev, nfc_card_id: serialNumber }));
          setShowNfcScanModal(false);
          showAlert('Berhasil', 'Kartu fisik berhasil dibaca', 'success');
        };

        ndef.onreadingerror = () => {};
      } catch (error) {}
    }
  };

  const handleNfcKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (settings.nfc_card_id.trim() !== '') {
        setShowNfcScanModal(false);
        showAlert('Berhasil', 'ID Kartu tersimpan', 'success');
      }
    }
  };

  const handlePrintNfc = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Kartu NFC</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: monospace; background: #fff; }
            .card { width: 350px; height: 200px; background: #111; color: #fff; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
            .header { font-size: 12px; color: #ccc; text-transform: uppercase; font-family: sans-serif; letter-spacing: 2px;}
            .barcode { font-size: 24px; text-align: center; letter-spacing: 4px; }
            .id { text-align: center; font-size: 16px; letter-spacing: 2px; color: #fff; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">Kartu Keamanan</div>
            <div class="barcode">|||| |||| ||||</div>
            <div class="id">${settings.nfc_card_id}</div>
          </div>
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleToggle = (settingName) => {
    if (settingName === 'biometric_enabled') {
      if (!settings.biometric_enabled) {
        setShowFaceModal(true);
        setScanPhase('idle');
        setScanProgress(0);
        return;
      } else {
        setSettings(prev => ({ ...prev, biometric_enabled: false, face_data: '' }));
        return;
      }
    }
    
    if (settingName === 'two_factor_enabled') {
      if (!settings.two_factor_enabled) {
        setTempPin('');
        setShowPinModal(true);
        return;
      } else {
        setSettings(prev => ({ ...prev, two_factor_enabled: false, two_factor_pin: '' }));
        return;
      }
    }

    if (settingName === 'nfc_enabled') {
      if (!settings.nfc_enabled) {
        setSettings(prev => ({ ...prev, nfc_enabled: true, nfc_card_id: '' }));
        setTimeout(() => scanHardwareNfc(), 500);
        return;
      } else {
        setSettings(prev => ({ ...prev, nfc_enabled: false, nfc_card_id: '' }));
        return;
      }
    }

    setSettings(prev => ({ ...prev, [settingName]: !prev[settingName] }));
  };

  const savePin = () => {
    if (tempPin.length < 4) {
      showAlert('Gagal', 'PIN harus minimal 4 digit', 'error');
      return;
    }
    setSettings(prev => ({ ...prev, two_factor_enabled: true, two_factor_pin: tempPin }));
    setShowPinModal(false);
  };

  const handleCameraChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedCamera(newDeviceId);
    startCameraStream(newDeviceId);
  };

  const cancelFaceScan = () => {
    stopCamera();
    setShowFaceModal(false);
    setScanPhase('idle');
    setScanProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users/${user.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (response.ok) {
        const updatedUser = data.user || { ...user, ...settings };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showAlert('Berhasil', 'Pengaturan keamanan berhasil diperbarui.', 'success');
      } else {
        showAlert('Gagal Menyimpan', data.error || 'Terjadi kesalahan.', 'error');
      }
    } catch (error) {
      showAlert('Koneksi Error', 'Gagal terhubung ke server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const circleRadius = 115;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (scanProgress / 100) * circleCircumference;

  if (!user) return null;

  return (
    <>
      <style>{`
        @keyframes tapCard {
          0%, 100% { transform: translate(30px, -30px) rotate(15deg); opacity: 0; }
          20% { opacity: 1; }
          50% { transform: translate(0px, 0px) rotate(0deg); }
          80% { opacity: 1; transform: translate(0px, 0px) rotate(0deg); }
        }
      `}</style>
      <div className="animate-[popIn_0.4s_ease-out] flex flex-col gap-6 font-sans pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pengaturan Keamanan</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola metode login tambahan untuk melindungi akun Anda.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Autentikasi Dua Langkah (2FA)</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tambahkan lapisan keamanan ekstra dengan PIN saat login.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" checked={settings.two_factor_enabled} onChange={() => handleToggle('two_factor_enabled')} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--theme-500))]"></div>
                  </label>
                </div>
                {settings.two_factor_enabled && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        PIN Aktif: {showPinSecret ? settings.two_factor_pin : '••••••'}
                      </span>
                      <button type="button" onClick={() => setShowPinSecret(!showPinSecret)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        {showPinSecret ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                    <button type="button" onClick={() => setShowPinModal(true)} className="text-sm font-bold text-[rgb(var(--theme-600))] hover:underline">Ubah PIN</button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Login Biometrik (Face ID)</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gunakan pemindaian orientasi wajah untuk login yang lebih cepat.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={settings.biometric_enabled} onChange={() => handleToggle('biometric_enabled')} className="sr-only peer" />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--theme-500))]"></div>
                </label>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Login via NFC</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gunakan NFC (NDEF) atau input ID e-KTP manual.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" checked={settings.nfc_enabled} onChange={() => handleToggle('nfc_enabled')} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--theme-500))]"></div>
                  </label>
                </div>
                {settings.nfc_enabled && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center">
                    <div className="w-72 h-44 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between p-5 border border-gray-700">
                      <div className="flex justify-between items-start">
                        <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kartu Keamanan</span>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full h-8 bg-white flex items-center justify-center font-mono text-black font-bold tracking-widest text-lg">
                          |||| |||| ||||
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-white text-center font-mono text-sm tracking-widest">
                            {showNfcSecret ? settings.nfc_card_id : '******'}
                          </p>
                          <button type="button" onClick={() => setShowNfcSecret(!showNfcSecret)} className="text-gray-400 hover:text-white">
                            {showNfcSecret ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                          </button>
                        </div>
                        <div className="w-full mt-2">
                          <input type="text" value={settings.nfc_card_id} onChange={(e) => setSettings({...settings, nfc_card_id: e.target.value})} placeholder="Input ID Manual (e-KTP)" className="w-full text-center text-xs px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white outline-none focus:ring-2 focus:ring-blue-500"/>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4 flex-wrap justify-center">
                      <button type="button" onClick={scanHardwareNfc} className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg> Scan Kartu Fisik
                      </button>
                      <button type="button" onClick={generateNfcId} className="text-sm font-bold text-[rgb(var(--theme-600))] hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Generate Ulang
                      </button>
                      <button type="button" onClick={handlePrintNfc} className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:underline flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg> Cetak Kartu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={isLoading} className="px-8 py-3.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                )}
                Simpan Pengaturan
              </button>
            </div>
          </form>
        </div>

        {showNfcScanModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setShowNfcScanModal(false)}></div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 p-8 text-center animate-[popIn_0.2s_ease-out]">
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowNfcScanModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="relative w-32 h-40 mx-auto mb-6 flex justify-center items-center">
                <svg className="absolute w-20 h-32 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01" />
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="absolute w-8 h-8 border-2 border-emerald-500 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
                  <span className="absolute w-12 h-12 border-2 border-emerald-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
                </div>
                <svg className="absolute w-16 h-10 text-[rgb(var(--theme-500))] animate-[tapCard_2s_ease-in-out_infinite]" style={{ transformOrigin: 'bottom right' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 4v8h16V8H4z" />
                </svg>
              </div>

              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Scan Kartu Anda</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tempelkan kartu ke perangkat atau NFC USB Reader Anda.</p>
              
              <input
                ref={nfcInputRef}
                type="text"
                value={settings.nfc_card_id}
                onChange={(e) => setSettings({...settings, nfc_card_id: e.target.value})}
                onKeyDown={handleNfcKeyDown}
                className="absolute opacity-0 h-0 w-0"
              />
            </div>
          </div>
        )}

        {showPinModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setShowPinModal(false); if(!settings.two_factor_pin) setSettings(prev => ({...prev, two_factor_enabled: false})) }}></div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 p-8 text-center animate-[popIn_0.2s_ease-out]">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Buat PIN Keamanan</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Masukkan PIN untuk Autentikasi Dua Langkah (2FA)</p>
              
              <div className="relative mb-6">
                <input type={showTempPin ? "text" : "password"} maxLength="6" value={tempPin} onChange={(e) => setTempPin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Masukkan PIN angka" className="w-full text-center text-2xl tracking-[0.5em] px-4 py-4 pr-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-[rgb(var(--theme-500))] focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none text-gray-900 dark:text-white transition-all"/>
                <button type="button" onClick={() => setShowTempPin(!showTempPin)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {showTempPin ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowPinModal(false); if(!settings.two_factor_pin) setSettings(prev => ({...prev, two_factor_enabled: false})) }} className="flex-1 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Batal</button>
                <button onClick={savePin} className="flex-1 py-3 rounded-xl font-bold text-white bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))]">Simpan PIN</button>
              </div>
            </div>
          </div>
        )}

        {customAlert.isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setCustomAlert(prev => ({...prev, isOpen: false}))}></div>
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] w-full max-w-sm shadow-2xl z-10 overflow-hidden text-center animate-[popIn_0.2s_ease-out]">
              <div className={`p-6 flex justify-center relative ${customAlert.type === 'error' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
                <div className="absolute inset-0 bg-white/20 transform -skew-y-12"></div>
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl relative z-10">
                  {customAlert.type === 'error' ? (
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{customAlert.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{customAlert.message}</p>
                <button onClick={() => setCustomAlert(prev => ({...prev, isOpen: false}))} className="w-full px-4 py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200">Tutup</button>
              </div>
            </div>
          </div>
        )}

        {showFaceModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl"></div>
            <div className="w-full max-w-md p-6 z-10 relative flex flex-col items-center select-none">
              
              <div className="mb-6 text-center">
                <h3 className="text-3xl font-black text-white tracking-tight">Face ID</h3>
                <div className="mt-2 min-h-[50px] flex flex-col items-center justify-center">
                  {scanPhase === 'idle' && (
                    <p className="text-gray-400 text-base">Pastikan wajah terlihat jelas dan berada di tempat terang</p>
                  )}
                  {scanPhase === 'requesting' && (
                    <p className="text-blue-400 text-base animate-pulse">Menghubungkan sensor kamera...</p>
                  )}
                  {scanPhase === 'scanning' && (
                    <div className="animate-[popIn_0.3s_ease-out]">
                      <p className="text-xl font-bold text-white tracking-wide">Posisikan Wajah Lurus</p>
                      <p className="text-sm text-gray-400 mt-0.5">Sistem sedang mendeteksi wajah Anda</p>
                    </div>
                  )}
                  {scanPhase === 'success' && (
                    <p className="text-emerald-400 text-lg font-bold">Pendaftaran Wajah Berhasil Selesai</p>
                  )}
                </div>
              </div>

              <div className="relative w-72 h-72 flex items-center justify-center mb-6">
                
                <svg className="absolute inset-0 w-full h-full -rotate-90 z-20 pointer-events-none" viewBox="0 0 260 260">
                  <circle cx="130" cy="130" r={circleRadius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                  <circle 
                    cx="130" 
                    cy="130" 
                    r={circleRadius} 
                    fill="none" 
                    stroke={scanPhase === 'success' ? '#10B981' : '#3B82F6'} 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>

                <div className="absolute w-[220px] h-[220px] rounded-full overflow-hidden bg-zinc-900 z-10 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className={`w-full h-full object-cover transform scale-x-[-1] ${scanPhase === 'scanning' || scanPhase === 'success' ? 'block' : 'hidden'}`}
                  ></video>

                  {scanPhase === 'success' && (
                    <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center animate-[popIn_0.3s_ease-out] z-30">
                      <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}

                  {scanPhase !== 'scanning' && scanPhase !== 'success' && (
                    <div className="flex flex-col items-center justify-center text-zinc-600">
                      <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {cameras.length > 1 && (scanPhase === 'scanning' || scanPhase === 'idle') && (
                <div className="mb-6 w-full max-w-xs">
                  <select 
                    value={selectedCamera} 
                    onChange={handleCameraChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-center cursor-pointer"
                  >
                    {cameras.map((camera, index) => (
                      <option key={camera.deviceId} value={camera.deviceId} className="text-gray-900 bg-white">
                        {camera.label || `Kamera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="w-full max-w-xs space-y-3">
                {scanPhase === 'idle' && (
                  <button 
                    onClick={() => startCameraStream(selectedCamera)} 
                    disabled={!modelsLoaded} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-bold bg-white text-gray-900 hover:bg-gray-100 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {!modelsLoaded ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                        Memuat AI...
                      </>
                    ) : (
                      'Mulai Pendaftaran'
                    )}
                  </button>
                )}
                
                {scanPhase !== 'success' && (
                  <button onClick={cancelFaceScan} className="w-full px-4 py-3.5 rounded-2xl font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors">
                    Batalkan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default Settings;