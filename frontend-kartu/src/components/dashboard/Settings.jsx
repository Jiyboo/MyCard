import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const Settings = ({ onNavigate }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    two_factor_enabled: false,
    biometric_enabled: false,
    nfc_enabled: false,
    face_data: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [scanPhase, setScanPhase] = useState('idle'); 
  const [scanProgress, setScanProgress] = useState(0);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionInterval = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setSettings({
        two_factor_enabled: parsedUser.two_factor_enabled || false,
        biometric_enabled: parsedUser.biometric_enabled || false,
        nfc_enabled: parsedUser.nfc_enabled || false,
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
    
    return () => {
      stopCamera();
    };
  }, []);

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
    } catch (e) {
      console.error(e);
    }
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
      showAlert('Gagal Akses Kamera', 'Pastikan izin kamera telah diberikan dan tidak digunakan aplikasi lain.', 'error');
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
    setSettings(prev => ({ ...prev, [settingName]: !prev[settingName] }));
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUser = data.user || { ...user, ...settings };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        showAlert('Berhasil', 'Pengaturan keamanan berhasil diperbarui.', 'success');
      } else {
        showAlert('Gagal Menyimpan', data.error || 'Terjadi kesalahan saat memperbarui pengaturan.', 'error');
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
              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Autentikasi Dua Langkah (2FA)</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tambahkan lapisan keamanan ekstra dengan kode OTP saat login.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={settings.two_factor_enabled} onChange={() => handleToggle('two_factor_enabled')} className="sr-only peer" />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--theme-500))]"></div>
                </label>
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

              <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Login via NFC (e-KTP / Kartu Anggota)</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tempelkan kartu fisik yang memiliki chip NFC ke perangkat Anda untuk masuk.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={settings.nfc_enabled} onChange={() => handleToggle('nfc_enabled')} className="sr-only peer" />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[rgb(var(--theme-500))]"></div>
                </label>
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