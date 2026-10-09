import { useState, useRef, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const VideoPlayer = ({ stream, isLocal, trigger }) => {
  const ref = useRef();
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, trigger]);
  return (
    <video
      ref={ref}
      autoPlay
      muted={isLocal}
      playsInline
      className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
    />
  );
};

const AudioPlayer = ({ stream, trigger }) => {
  const ref = useRef();
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, trigger]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
};

const LiveChat = ({ role }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChat, setSelectedChat] = useState(null);
  const selectedChatRef = useRef(null);
  
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const [searchChatQuery, setSearchChatQuery] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchMessageQuery, setSearchMessageQuery] = useState('');
  const [isSearchingMessage, setIsSearchingMessage] = useState(false);
  
  const [callState, setCallState] = useState({ active: false, incoming: false, type: null, callerName: '', groupId: null, isGroup: false, participantIds: [], callerId: null });
  const [mediaState, setMediaState] = useState({ isMuted: false, isVideoOff: false, isScreenSharing: false, isScreenAudioEnabled: false });
  const [streamUpdateTrigger, setStreamUpdateTrigger] = useState(0);

  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [remoteMediaStates, setRemoteMediaStates] = useState(new Map());

  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');

  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showTransferAdminModal, setShowTransferAdminModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupNameModal, setShowEditGroupNameModal] = useState(false);
  const [showScreenShareConfirm, setShowScreenShareConfirm] = useState(false);
  const [showAddCallMember, setShowAddCallMember] = useState(false);
  const [showScreenAudioConfirm, setShowScreenAudioConfirm] = useState(false);
  
  const [newAdminId, setNewAdminId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');

  const [newChatType, setNewChatType] = useState('direct');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [newMembers, setNewMembers] = useState([]);
  const [callNewMembers, setCallNewMembers] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser.id;

  useEffect(() => {
    const getDevices = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputDevices);
        if (videoInputDevices.length > 0 && !selectedVideoDeviceId) {
          setSelectedVideoDeviceId(videoInputDevices[0].deviceId);
        }
      } catch (err) {}
    };
    
    getDevices();
    
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', getDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }
  }, [selectedVideoDeviceId]);

  const getUserDisplayInfo = (userId) => {
    if (userId === currentUserId) {
      return { 
        name: currentUser.nama_lengkap || 'Anda', 
        role: currentUser.role_akun || 'User', 
        initial: (currentUser.nama_lengkap || 'U').substring(0, 2).toUpperCase(),
        fullName: `${currentUser.nama_lengkap || 'Anda'} - ${currentUser.role_akun || 'User'} (Anda)`
      };
    }
    const u = availableUsers.find(user => user.id === userId) || selectedChat?.participants?.find(p => p.user_id === userId)?.user;
    if (u) {
      return { 
        name: u.nama_lengkap, 
        role: u.role_akun, 
        initial: u.nama_lengkap.substring(0, 2).toUpperCase(),
        fullName: `${u.nama_lengkap} - ${u.role_akun}`
      };
    }
    return { name: 'Pengguna', role: 'User', initial: 'U', fullName: 'Pengguna - User' };
  };

  const createPeerConnection = (targetId, type) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnections.current.set(targetId, pc);

    const streamToUse = mediaState.isScreenSharing && screenStreamRef.current ? screenStreamRef.current : localStreamRef.current;

    if (streamToUse) {
      streamToUse.getTracks().forEach(track => pc.addTrack(track, streamToUse));
    }

    let isNegotiating = false;

    pc.onnegotiationneeded = async () => {
      if (isNegotiating) return;
      isNegotiating = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'call-offer', 
            sender_id: currentUserId, 
            target_id: targetId, 
            payload: { offer, groupId: callStateRef.current.groupId } 
          }));
        }
      } catch (err) {}
      finally {
        isNegotiating = false;
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const next = new Map(prev);
        next.set(targetId, event.streams[0]);
        return next;
      });
      setStreamUpdateTrigger(prev => prev + 1);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'ice-candidate', sender_id: currentUserId, target_id: targetId, payload: event.candidate }));
      }
    };

    return pc;
  };

  const removePeer = (id) => {
    const pc = peerConnections.current.get(id);
    if (pc) {
      pc.close();
      peerConnections.current.delete(id);
    }
    setRemoteStreams(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setRemoteMediaStates(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const endCallLocal = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => { track.stop(); });
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => { track.stop(); });
      screenStreamRef.current = null;
    }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
    setRemoteMediaStates(new Map());
    setCallState({ active: false, incoming: false, type: null, callerName: '', groupId: null, isGroup: false, participantIds: [], callerId: null });
    setMediaState({ isMuted: false, isVideoOff: false, isScreenSharing: false, isScreenAudioEnabled: false });
  };

  const sendMediaStateUpdate = (newState) => {
    if (!wsRef.current || !callStateRef.current.active) return;
    
    const pIds = callStateRef.current.participantIds || [];
    
    wsRef.current.send(JSON.stringify({
      type: 'call-stream-update',
      sender_id: currentUserId,
      target_id: 0, 
      payload: { 
        isMuted: newState.isMuted, 
        isVideoOff: newState.isVideoOff, 
        isScreenSharing: newState.isScreenSharing,
        participantIds: pIds
      }
    }));
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMutedState = !audioTrack.enabled;
        const newState = { ...mediaState, isMuted: newMutedState };
        setMediaState(newState);
        sendMediaStateUpdate(newState);
      }
    }
  };

  const changeVideoDevice = async (deviceId) => {
    setSelectedVideoDeviceId(deviceId);
    if (!mediaState.isVideoOff && !mediaState.isScreenSharing && localStreamRef.current) {
      try {
        const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);

        peerConnections.current.forEach(pc => {
          const senders = pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(newVideoTrack);
          }
        });
        setStreamUpdateTrigger(prev => prev + 1);
      } catch (err) {}
    }
  };

  const toggleVideo = async () => {
    const newState = { ...mediaState, isVideoOff: !mediaState.isVideoOff };
    
    if (localStreamRef.current) {
      if (newState.isVideoOff) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          localStreamRef.current.removeTrack(videoTrack);
        }
      } else if (!mediaState.isScreenSharing) {
        try {
          const newVideoStream = await navigator.mediaDevices.getUserMedia({ 
            video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true 
          });
          const newVideoTrack = newVideoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newVideoTrack);
          
          peerConnections.current.forEach(pc => {
             const senders = pc.getSenders();
             const videoSender = senders.find(s => s.track && s.track.kind === 'video');
             if(videoSender) {
                 videoSender.replaceTrack(newVideoTrack);
             } else {
                 pc.addTrack(newVideoTrack, localStreamRef.current);
             }
          });
        } catch (e) {
          return;
        }
      }
      
      setMediaState(newState);
      sendMediaStateUpdate(newState);
      setStreamUpdateTrigger(prev => prev + 1);
    }
  };

  const executeScreenShare = async (withAudio) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return;
      }
      
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: isTouch ? false : withAudio 
      });
      
      screenStreamRef.current = stream;

      const screenVideoTrack = stream.getVideoTracks()[0];
      
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      peerConnections.current.forEach(pc => {
        const senders = pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        
        if (videoSender) {
          videoSender.replaceTrack(screenVideoTrack);
        } else {
           pc.addTrack(screenVideoTrack, stream);
        }

        if (!isTouch && withAudio && stream.getAudioTracks().length > 0) {
           const screenAudioTrack = stream.getAudioTracks()[0];
           const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
           
           if(audioSender) {
              audioSender.replaceTrack(screenAudioTrack);
           } else {
              pc.addTrack(screenAudioTrack, stream);
           }
        }
      });

      const newState = { ...mediaState, isScreenSharing: true, isScreenAudioEnabled: !isTouch && withAudio };
      setMediaState(newState);
      sendMediaStateUpdate(newState);
      setStreamUpdateTrigger(prev => prev + 1);

    } catch (err) {}
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    if (localStreamRef.current) {
        const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
        const localAudioTrack = localStreamRef.current.getAudioTracks()[0];
        
        peerConnections.current.forEach(pc => {
           const senders = pc.getSenders();
           const videoSender = senders.find(s => s.track && s.track.kind === 'video');
           const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
           
           if(videoSender && localVideoTrack) {
               videoSender.replaceTrack(localVideoTrack);
           }
           
           if(audioSender && localAudioTrack) {
               audioSender.replaceTrack(localAudioTrack);
           }
        });
    }
    
    const newState = { ...mediaState, isScreenSharing: false, isScreenAudioEnabled: false };
    setMediaState(newState);
    sendMediaStateUpdate(newState);
    setStreamUpdateTrigger(prev => prev + 1);
  };

  const toggleScreenShare = () => {
    if (mediaState.isScreenSharing) {
      stopScreenShare();
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        return;
      }
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        executeScreenShare(false);
      } else {
        if (mediaState.isVideoOff) {
          setShowScreenShareConfirm(true);
        } else {
          setShowScreenAudioConfirm(true);
        }
      }
    }
  };

  const handleScreenShareConfirm = async () => {
    setShowScreenShareConfirm(false);
    await toggleVideo();
    setShowScreenAudioConfirm(true);
  };

  const fetchChats = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API_URL}/api/chats?user_id=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = (data || []).map(c => {
          let cName = c.name;
          let avatarStr = 'GC';
          let cRole = 'Grup';
          const myParticipant = c.participants?.find(p => p.user_id === currentUserId);
          const myRole = myParticipant?.role || 'member';
          
          if (c.type === 'direct') {
            const otherParticipant = c.participants?.find(p => p.user_id !== currentUserId)?.user;
            cName = otherParticipant?.nama_lengkap || 'Pengguna';
            cRole = otherParticipant?.role_akun || 'User';
            avatarStr = cName.substring(0, 2).toUpperCase();
          } else {
            avatarStr = cName ? cName.substring(0, 2).toUpperCase() : 'GR';
            cRole = `${c.participants?.length || 0} Anggota`;
          }

          const lastMsg = c.messages && c.messages.length > 0 ? c.messages[0] : null;
          let timeStr = '';
          if (lastMsg) {
            const d = new Date(lastMsg.created_at);
            timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          let lastMessageDisplay = 'Belum ada pesan';
          if (lastMsg) {
            if (lastMsg.is_deleted) {
              lastMessageDisplay = 'Pesan dihapus';
            } else if (lastMsg.is_media) {
              lastMessageDisplay = 'Mengirim media';
            } else {
              lastMessageDisplay = lastMsg.content;
            }
          }

          return {
            id: c.id,
            type: c.type,
            name: cName,
            role: cRole,
            myRole: myRole,
            creator_id: c.creator_id,
            avatar: avatarStr,
            lastMessage: lastMessageDisplay,
            time: timeStr,
            unread: c.unread_count || 0,
            isOnline: c.is_online || false, 
            members: c.participants?.length || 0,
            participants: c.participants || []
          };
        });
        setChats(formatted);
      }
    } catch (error) {}
  };

  const fetchMessages = async (chatId) => {
    if (!chatId || !currentUserId) return;
    try {
      const res = await fetch(`${API_URL}/api/chats/${chatId}/messages?user_id=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (error) {}
  };

  const markAsRead = async (chatId) => {
    if (!chatId || !currentUserId) return;
    try {
      await fetch(`${API_URL}/api/chats/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: chatId, user_id: currentUserId })
      });
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread: 0 } : c));
    } catch (error) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers((data || []).filter(u => u.id !== currentUserId));
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchChats();
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const WS_URL = API_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${WS_URL}/api/chats/ws?user_id=${currentUserId}`);
    
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      const state = callStateRef.current;
      const currentChatId = selectedChatRef.current?.id;

      switch (msg.type) {
        case 'new-message':
          fetchChats();
          if (currentChatId === msg.payload.conversation_id) {
             setMessages(prev => {
                if(prev.find(m => m.id === msg.payload.id)) return prev;
                return [...prev, msg.payload];
             });
             markAsRead(msg.payload.conversation_id);
          }
          break;
        case 'call-ring':
          if (state.active) return;
          setCallState({
            active: true,
            incoming: true,
            type: msg.payload.chatType,
            callerName: msg.payload.callerName,
            groupId: msg.payload.groupId,
            isGroup: msg.payload.isGroup,
            participantIds: msg.payload.participantIds,
            callerId: msg.sender_id
          });
          break;
        case 'call-join':
          if (!state.active || state.groupId !== msg.payload.groupId) return;
          let pcOffer = peerConnections.current.get(msg.sender_id);
          if (!pcOffer) {
            pcOffer = createPeerConnection(msg.sender_id, state.type);
            const offer = await pcOffer.createOffer();
            await pcOffer.setLocalDescription(offer);
            wsRef.current.send(JSON.stringify({ type: 'call-offer', sender_id: currentUserId, target_id: msg.sender_id, payload: { offer, groupId: state.groupId } }));
          }
          break;
        case 'call-offer':
          if (!state.active || state.groupId !== msg.payload.groupId) return;
          let pcAnswer = peerConnections.current.get(msg.sender_id);
          if (!pcAnswer) {
            pcAnswer = createPeerConnection(msg.sender_id, state.type);
          }
          await pcAnswer.setRemoteDescription(new RTCSessionDescription(msg.payload.offer));
          const answer = await pcAnswer.createAnswer();
          await pcAnswer.setLocalDescription(answer);
          wsRef.current.send(JSON.stringify({ type: 'call-answer', sender_id: currentUserId, target_id: msg.sender_id, payload: answer }));
          break;
        case 'call-answer':
          const pc = peerConnections.current.get(msg.sender_id);
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
          break;
        case 'ice-candidate':
          const pcIce = peerConnections.current.get(msg.sender_id);
          if (pcIce) await pcIce.addIceCandidate(new RTCIceCandidate(msg.payload));
          break;
        case 'call-leave':
          removePeer(msg.sender_id);
          if (!state.isGroup) endCallLocal();
          break;
        case 'call-reject':
          if (!state.isGroup) endCallLocal();
          break;
        case 'call-stream-update':
          setRemoteMediaStates(prev => {
            const next = new Map(prev);
            next.set(msg.sender_id, {
              isMuted: msg.payload.isMuted,
              isVideoOff: msg.payload.isVideoOff,
              isScreenSharing: msg.payload.isScreenSharing
            });
            return next;
          });
          break;
        case 'call-participants-update':
          if (state.active && state.groupId === msg.payload.groupId) {
            setCallState(prev => ({ ...prev, participantIds: msg.payload.participantIds, isGroup: true }));
          }
          break;
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
      endCallLocal();
    };
  }, [currentUserId]);

  const startCall = async (type) => {
    if (!selectedChat) return;
    
    try {
      let stream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: type === 'video' ? (selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true) : false, 
          audio: true 
        });
      }
      localStreamRef.current = stream;
      
      const initialMediaState = { isMuted: false, isVideoOff: type === 'audio', isScreenSharing: false };
      setMediaState(initialMediaState);

      const pIds = selectedChat.participants.map(p => p.user_id);
      const isGrp = selectedChat.type === 'group';

      setCallState({
        active: true,
        incoming: false,
        type,
        callerName: currentUser.nama_lengkap,
        groupId: selectedChat.id,
        isGroup: isGrp,
        participantIds: pIds,
        callerId: currentUserId
      });

      pIds.forEach(id => {
        if (id !== currentUserId && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'call-ring',
            sender_id: currentUserId,
            target_id: id,
            payload: { chatType: type, callerName: currentUser.nama_lengkap, groupId: selectedChat.id, isGroup: isGrp, participantIds: pIds }
          }));
        }
      });
      
      setRemoteStreams(new Map());
      setRemoteMediaStates(new Map());
      
      setTimeout(() => sendMediaStateUpdate(initialMediaState), 1000);

    } catch (err) {
      endCallLocal();
    }
  };

  const acceptCall = async () => {
    try {
      let stream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: callState.type === 'video' ? (selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true) : false, 
          audio: true 
        });
      }
      localStreamRef.current = stream;

      const initialMediaState = { isMuted: false, isVideoOff: callState.type === 'audio', isScreenSharing: false };
      setMediaState(initialMediaState);
      
      setCallState(prev => ({ ...prev, incoming: false }));

      callState.participantIds.forEach(id => {
        if (id !== currentUserId && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'call-join',
            sender_id: currentUserId,
            target_id: id,
            payload: { groupId: callState.groupId }
          }));
        }
      });
      
      setTimeout(() => sendMediaStateUpdate(initialMediaState), 1000);
      
    } catch (err) {
      endCallLocal();
    }
  };

  const declineCall = () => {
    if (callState.callerId && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'call-reject', sender_id: currentUserId, target_id: callState.callerId }));
    }
    endCallLocal();
  };

  const endCall = () => {
    callState.participantIds.forEach(id => {
      if (id !== currentUserId && wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'call-leave', sender_id: currentUserId, target_id: id }));
      }
    });
    endCallLocal();
  };

  const handleAddMemberToCall = (e) => {
    e.preventDefault();
    if (callNewMembers.length === 0) return;

    const updatedParticipantIds = [...new Set([...callState.participantIds, ...callNewMembers])];
    
    setCallState(prev => ({ ...prev, participantIds: updatedParticipantIds, isGroup: true }));

    callState.participantIds.forEach(id => {
      if (id !== currentUserId && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-participants-update',
          sender_id: currentUserId,
          target_id: id,
          payload: { groupId: callState.groupId, participantIds: updatedParticipantIds }
        }));
      }
    });

    callNewMembers.forEach(id => {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'call-ring',
          sender_id: currentUserId,
          target_id: id,
          payload: { 
            chatType: callState.type, 
            callerName: currentUser.nama_lengkap, 
            groupId: callState.groupId, 
            isGroup: true, 
            participantIds: updatedParticipantIds 
          }
        }));
      }
    });

    setShowAddCallMember(false);
    setCallNewMembers([]);
  };

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(c => c.id === selectedChat.id);
      if (updatedChat) {
        setSelectedChat(updatedChat);
      } else {
        setSelectedChat(null);
        setShowGroupInfo(false);
      }
    }
  }, [chats]);

  useEffect(() => {
    if (selectedChat?.id) {
      markAsRead(selectedChat.id);
      fetchMessages(selectedChat.id);
      setReplyingTo(null);
    }
  }, [selectedChat?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredChats = chats.filter(chat => {
    const matchesTab = activeTab === 'all' || chat.type === activeTab;
    const matchesSearch = chat.name.toLowerCase().includes(searchChatQuery.toLowerCase()) || 
                          chat.lastMessage.toLowerCase().includes(searchChatQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredUsers = availableUsers.filter(u => 
    u.nama_lengkap.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const filteredMessages = messages.filter(m => 
    !isSearchingMessage || searchMessageQuery === '' ||
    m.content.toLowerCase().includes(searchMessageQuery.toLowerCase())
  );

  const getAvatarColor = (name) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500'];
    const index = name ? name.length % colors.length : 0;
    return colors[index];
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || !selectedChat) return;

    const formData = new FormData();
    formData.append('conversation_id', selectedChat.id);
    formData.append('sender_id', currentUserId);
    formData.append('content', messageInput);
    if (replyingTo) {
      formData.append('reply_to_id', replyingTo.id);
    }
    if (selectedFile) {
      formData.append('media', selectedFile);
    }

    setMessageInput('');
    setSelectedFile(null);
    setReplyingTo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const res = await fetch(`${API_URL}/api/chats/messages`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        scrollToBottom();
      }
    } catch (error) {}
  };

  const handleDeleteMessage = async (msgId, type) => {
    try {
      const res = await fetch(`${API_URL}/api/chats/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId, type })
      });
      if (res.ok) {
        setOpenMenuId(null);
        fetchMessages(selectedChat.id);
        fetchChats();
      }
    } catch (error) {}
  };

  const openNewChatModal = () => {
    fetchUsers();
    setNewChatType('direct');
    setSelectedUserIds([]);
    setGroupName('');
    setSearchUserQuery('');
    setShowNewChatModal(true);
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;
    if (newChatType === 'group' && !groupName.trim()) return;

    const participant_ids = [currentUserId, ...selectedUserIds];

    const payload = {
      type: newChatType,
      name: newChatType === 'group' ? groupName : '',
      participant_ids: participant_ids,
      creator_id: currentUserId
    };

    try {
      const res = await fetch(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowNewChatModal(false);
        fetchChats();
      }
    } catch (error) {}
  };

  const handleAddMembers = async (e) => {
    e.preventDefault();
    if (newMembers.length === 0 || !selectedChat) return;

    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: currentUserId,
          user_ids: newMembers
        })
      });
      if (res.ok) {
        setShowAddMemberModal(false);
        setNewMembers([]);
        fetchChats();
        fetchMessages(selectedChat.id);
      }
    } catch (error) {}
  };

  const handleUpdateGroupName = async (e) => {
    e.preventDefault();
    if (!editGroupName.trim() || !selectedChat) return;

    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: currentUserId,
          name: editGroupName
        })
      });
      if (res.ok) {
        setShowEditGroupNameModal(false);
        fetchChats();
      }
    } catch (error) {}
  };

  const handlePromoteAdmin = async (targetId) => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: currentUserId,
          target_id: targetId
        })
      });
      if (res.ok) {
        fetchChats();
      }
    } catch (error) {}
  };

  const handleDemoteAdmin = async (targetId) => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: currentUserId,
          target_id: targetId
        })
      });
      if (res.ok) {
        fetchChats();
      }
    } catch (error) {}
  };

  const handleRemoveMember = async (targetId) => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_id: currentUserId,
          target_id: targetId
        })
      });
      if (res.ok) {
        fetchChats();
        fetchMessages(selectedChat.id);
      }
    } catch (error) {}
  };

  const handleDeleteChat = async () => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}?user_id=${currentUserId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedChat(null);
        setShowChatMenu(false);
        setShowGroupInfo(false);
        fetchChats();
      }
    } catch (error) {}
  };

  const handleLeaveChatInitiate = () => {
    if (selectedChat.type === 'group' && selectedChat.creator_id === currentUserId) {
      const otherMembers = selectedChat.participants.filter(p => p.user_id !== currentUserId);
      if (otherMembers.length > 0) {
        setNewAdminId(null);
        setShowTransferAdminModal(true);
        setShowChatMenu(false);
        setShowGroupInfo(false);
        return;
      }
    }
    handleLeaveChat();
  };

  const handleLeaveChat = async () => {
    if (!selectedChat) return;
    const payload = { user_id: currentUserId };
    if (newAdminId) {
      payload.new_admin_id = parseInt(newAdminId);
    }

    try {
      const res = await fetch(`${API_URL}/api/chats/${selectedChat.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSelectedChat(null);
        setShowChatMenu(false);
        setShowTransferAdminModal(false);
        setShowGroupInfo(false);
        fetchChats();
      }
    } catch (error) {}
  };

  const toggleUserSelection = (id) => {
    if (newChatType === 'direct') {
      setSelectedUserIds([id]);
    } else {
      setSelectedUserIds(prev => 
        prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
      );
    }
  };

  const toggleNewMemberSelection = (id) => {
    setNewMembers(prev => 
      prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
    );
  };

  const toggleCallMemberSelection = (id) => {
    setCallNewMembers(prev => 
      prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
    );
  };

  return (
    <div className="animate-[popIn_0.4s_ease-out] flex flex-col h-[calc(100vh-8rem)]" onClick={() => { setShowChatMenu(false); setOpenMenuId(null); }}>
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pesan & Komunikasi</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Komunikasi real-time antar pengguna dan grup regional.</p>
        </div>
        <button onClick={openNewChatModal} className="bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-[rgba(var(--theme-600),0.3)] transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Mulai Percakapan
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex-1 flex overflow-hidden transition-colors">
        
        <div className={`${selectedChat && isMobileView ? 'hidden' : 'flex'} flex-col w-full md:w-[350px] lg:w-[400px] border-r border-gray-100 dark:border-gray-800 shrink-0`}>
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari pesan atau kontak..." 
                value={searchChatQuery}
                onChange={(e) => setSearchChatQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-[rgb(var(--theme-500))] text-sm font-medium text-gray-900 dark:text-white transition-all"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            
            <div className="flex gap-2 mt-4">
              {['all', 'direct', 'group'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-[rgb(var(--theme-600))] text-white shadow-md' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {tab === 'all' ? 'Semua' : tab === 'direct' ? 'Personal' : 'Grup'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredChats.map((chat) => (
              <button 
                key={chat.id} 
                onClick={() => { setSelectedChat(chat); setIsSearchingMessage(false); setSearchMessageQuery(''); }}
                className={`w-full flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-800/50 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${getAvatarColor(chat.name)}`}>
                    {chat.avatar}
                  </div>
                  {chat.type === 'direct' && chat.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                  )}
                  {chat.type === 'group' && (
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate pr-2 text-sm">{chat.name}</h4>
                    <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap">{chat.time}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <p className={`text-xs truncate ${chat.unread > 0 ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                        {chat.lastMessage}
                      </p>
                    </div>
                    {chat.unread > 0 && (
                      <span className="shrink-0 bg-[rgb(var(--theme-600))] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {filteredChats.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">Tidak ada obrolan ditemukan.</div>
            )}
          </div>
        </div>

        <div className={`${!selectedChat && isMobileView ? 'hidden' : 'flex'} flex-1 flex-col bg-gray-50/30 dark:bg-gray-900/50 relative`}>
          {selectedChat ? (
            <>
              <div className="h-20 px-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0 relative">
                
                {isSearchingMessage ? (
                  <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 animate-[popIn_0.2s_ease-out]">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Cari pesan di sini..." 
                      value={searchMessageQuery}
                      onChange={(e) => setSearchMessageQuery(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full ml-3 text-gray-900 dark:text-white outline-none"
                    />
                    <button onClick={() => { setIsSearchingMessage(false); setSearchMessageQuery(''); }} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div 
                      className={`flex items-center gap-4 ${selectedChat.type === 'group' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 -ml-2 rounded-xl transition-colors' : ''}`}
                      onClick={() => {
                        if (selectedChat.type === 'group') setShowGroupInfo(true);
                      }}
                    >
                      {isMobileView && (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedChat(null); }} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${getAvatarColor(selectedChat.name)}`}>
                        {selectedChat.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{selectedChat.name}</h3>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {selectedChat.role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 relative">
                      <button onClick={() => setIsSearchingMessage(true)} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </button>
                      <button onClick={() => startCall('audio')} className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </button>
                      <button onClick={() => startCall('video')} className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>

                      {selectedChat.type === 'group' && selectedChat.myRole === 'admin' && (
                        <button onClick={() => { setEditGroupName(selectedChat.name); setShowEditGroupNameModal(true); }} className="p-2.5 text-gray-400 hover:text-[rgb(var(--theme-600))] hover:bg-blue-50 dark:hover:bg-gray-800 rounded-full transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowChatMenu(!showChatMenu); setOpenMenuId(null); }}
                        className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                      </button>

                      {showChatMenu && (
                        <div className="absolute right-0 top-12 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                          {selectedChat.type === 'group' ? (
                            <>
                              <button onClick={() => { setShowGroupInfo(true); setShowChatMenu(false); }} className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors border-b border-gray-100 dark:border-gray-700">
                                Info Grup
                              </button>
                              {selectedChat.creator_id === currentUserId && (
                                <button onClick={handleDeleteChat} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors border-b border-gray-100 dark:border-gray-700">
                                  Hapus Grup
                                </button>
                              )}
                              <button onClick={handleLeaveChatInitiate} className="w-full text-left px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium transition-colors">
                                Keluar Grup
                              </button>
                            </>
                          ) : (
                            <button onClick={handleDeleteChat} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">
                              Hapus Obrolan
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {filteredMessages.map((msg) => {
                  if (msg.is_system) {
                    return (
                      <div key={msg.id} className="text-center my-2">
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  const isMine = msg.sender_id === currentUserId;
                  const d = new Date(msg.created_at);
                  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const senderName = isMine ? 'Anda' : (msg.sender?.nama_lengkap || 'Pengguna');
                  
                  return (
                    <div key={msg.id} className={`flex relative group ${isMine ? 'justify-end' : 'justify-start'}`}>
                      
                      {!isMine && !msg.is_deleted && (
                        <div className="flex items-center relative gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg.id ? null : msg.id); setShowChatMenu(false); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </button>
                          {openMenuId === msg.id && (
                            <div className="absolute left-16 top-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                              <button onClick={() => handleDeleteMessage(msg.id, 'me')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors">
                                Hapus untuk saya
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {selectedChat.type === 'group' && !isMine && (
                          <span className="text-xs font-semibold text-gray-500 mb-1 ml-1">{senderName}</span>
                        )}
                        <div className={`px-5 py-3.5 rounded-2xl ${isMine && !msg.is_deleted ? 'bg-[rgb(var(--theme-600))] text-white rounded-br-sm shadow-md shadow-[rgba(var(--theme-600),0.2)]' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                          
                          {msg.reply_to && !msg.is_deleted && (
                            <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs ${isMine ? 'bg-black/10 border-white' : 'bg-black/5 dark:bg-white/5 border-[rgb(var(--theme-500))]'}`}>
                              <span className="font-bold">{msg.reply_to.sender?.nama_lengkap || 'Pengguna'}</span>
                              <p className="truncate opacity-80">{msg.reply_to.is_deleted ? 'Pesan ini telah dihapus' : msg.reply_to.content}</p>
                            </div>
                          )}

                          {msg.is_media && !msg.is_deleted && msg.media_url ? (
                            <div className="mb-2 rounded-xl overflow-hidden">
                              {msg.media_type === 'image' && (
                                <a href={`${API_URL}${msg.media_url}`} download target="_blank" rel="noopener noreferrer">
                                  <img src={`${API_URL}${msg.media_url}`} alt="Media" className="max-w-full max-h-[300px] object-contain rounded-xl hover:opacity-90 transition-opacity" />
                                </a>
                              )}
                              {msg.media_type === 'video' && (
                                <video src={`${API_URL}${msg.media_url}`} controls className="max-w-full max-h-[300px] rounded-xl"></video>
                              )}
                              {msg.media_type === 'document' && (
                                <a href={`${API_URL}${msg.media_url}`} download target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-xl ${isMine ? 'bg-black/10' : 'bg-gray-100 dark:bg-gray-700'} hover:opacity-80 transition-opacity`}>
                                  <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                  <span className="text-sm font-semibold truncate max-w-[200px]">{msg.media_url.split('/').pop().substring(11)}</span>
                                </a>
                              )}
                              {msg.content && msg.content !== "Mengirim file" && (
                                <p className="text-sm leading-relaxed mt-2">{msg.content}</p>
                              )}
                            </div>
                          ) : msg.is_deleted ? (
                            <p className={`text-sm italic flex items-center gap-1.5 ${msg.is_media ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              {msg.content}
                            </p>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] font-semibold text-gray-400">{timeStr}</span>
                          {isMine && !msg.is_deleted && (
                            <span className={`${msg.status === 'read' || !msg.status ? 'text-blue-500' : 'text-gray-400'}`}>
                              {msg.status === 'sent' && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {(msg.status === 'delivered' || msg.status === 'read' || !msg.status) && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 12l4 4L16 6M8 16l4 4L22 10" />
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {isMine && !msg.is_deleted && (
                        <div className="flex items-center relative gap-1">
                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg.id ? null : msg.id); setShowChatMenu(false); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-gray-600 transition-opacity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                          </button>
                          {openMenuId === msg.id && (
                            <div className="absolute right-16 top-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                              <button onClick={() => handleDeleteMessage(msg.id, 'me')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors border-b border-gray-100 dark:border-gray-700">
                                Hapus untuk saya
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id, 'everyone')} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">
                                Hapus untuk semua orang
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
                
                {filteredMessages.length === 0 && messages.length > 0 && isSearchingMessage && (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Tidak ada pesan yang cocok.</div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {replyingTo && (
                <div className="w-full px-6 py-2 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex flex-col text-sm border-l-4 border-[rgb(var(--theme-500))] pl-3">
                    <span className="font-bold text-[rgb(var(--theme-600))]">{replyingTo.sender?.nama_lengkap || 'Anda'}</span>
                    <span className="text-gray-500 dark:text-gray-400 truncate max-w-[200px] md:max-w-[400px]">{replyingTo.is_deleted ? 'Pesan ini telah dihapus' : replyingTo.content}</span>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="w-full px-6 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center animate-[popIn_0.2s_ease-out]">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-[rgb(var(--theme-100))] dark:bg-[rgba(var(--theme-900),0.5)] flex items-center justify-center shrink-0">
                      {selectedFile.type.startsWith('image/') ? (
                        <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      ) : selectedFile.type.startsWith('video/') ? (
                        <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-5 h-5 text-[rgb(var(--theme-600))]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-50))] dark:hover:bg-gray-800 rounded-full transition-colors shrink-0 mb-0.5">
                    <svg className="w-6 h-6 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
                    }} 
                    className="hidden" 
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                  
                  <textarea 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Ketik pesan Anda..." 
                    className="flex-1 max-h-32 min-h-[50px] bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--theme-500))] focus:border-transparent resize-none text-sm text-gray-900 dark:text-white"
                    rows="1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={!messageInput.trim() && !selectedFile}
                    className="w-12 h-12 rounded-full bg-[rgb(var(--theme-600))] hover:bg-[rgb(var(--theme-700))] text-white flex items-center justify-center shadow-lg shadow-[rgba(var(--theme-600),0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
                  >
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-[rgb(var(--theme-600))] mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pilih Obrolan</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">Pilih kontak atau grup di panel kiri untuk mulai membaca atau mengirim pesan.</p>
            </div>
          )}
        </div>

      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowNewChatModal(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mulai Percakapan</h3>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-800 rounded-full p-2 shadow-sm border border-gray-100 dark:border-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateChat} className="p-6 space-y-4">
              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => { setNewChatType('direct'); setSelectedUserIds([]); }} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${newChatType === 'direct' ? 'bg-[rgb(var(--theme-600))] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Personal</button>
                <button type="button" onClick={() => { setNewChatType('group'); setSelectedUserIds([]); }} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${newChatType === 'group' ? 'bg-[rgb(var(--theme-600))] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>Grup</button>
              </div>

              {newChatType === 'group' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Grup</label>
                  <input required type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pilih Kontak</label>
                
                <div className="relative mb-2">
                  <input 
                    type="text" 
                    placeholder="Cari pengguna..." 
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[rgb(var(--theme-500))] text-sm text-gray-900 dark:text-white outline-none"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                  {filteredUsers.map(u => (
                    <label key={u.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <input 
                        type={newChatType === 'direct' ? 'radio' : 'checkbox'} 
                        name="userSelection"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="mr-3 w-4 h-4 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))] border-gray-300"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{u.nama_lengkap}</p>
                        <p className="text-xs text-gray-500">{u.role_akun} - {u.region || 'Semua Region'}</p>
                      </div>
                    </label>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-gray-500">Tidak ada pengguna yang cocok.</div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewChatModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={selectedUserIds.length === 0} className="px-6 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Buat Obrolan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferAdminModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowTransferAdminModal(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pilih Admin Baru</h3>
              <button onClick={() => setShowTransferAdminModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 rounded-full p-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Anda adalah pembuat grup. Pilih anggota lain sebagai admin sebelum keluar.</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                {selectedChat?.participants?.filter(p => p.user_id !== currentUserId).map(p => (
                  <label key={p.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      name="newAdminSelection"
                      checked={newAdminId === p.user_id}
                      onChange={() => setNewAdminId(p.user_id)}
                      className="mr-3 w-4 h-4 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))] border-gray-300"
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{p.user?.nama_lengkap || 'Pengguna'}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowTransferAdminModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="button" onClick={handleLeaveChat} disabled={!newAdminId} className="px-6 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Keluar & Pindahkan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupInfo && selectedChat && selectedChat.type === 'group' && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowGroupInfo(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Info Grup</h3>
              <button onClick={() => setShowGroupInfo(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 rounded-full p-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <div className="p-8 text-center border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/10 flex flex-col items-center">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-md mb-4 ${getAvatarColor(selectedChat.name)}`}>
                  {selectedChat.avatar}
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{selectedChat.name}</h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">{selectedChat.participants.length} Anggota</p>
              </div>

              <div className="p-6">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  Anggota Grup
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">{selectedChat.participants.length}</span>
                </h4>
                
                <div className="space-y-1">
                  {selectedChat.myRole === 'admin' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowAddMemberModal(true); fetchUsers(); }} 
                      className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-colors mb-2 border border-dashed border-gray-300 dark:border-gray-700"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[rgb(var(--theme-600))] text-white flex items-center justify-center shadow-sm shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                      </div>
                      <span className="font-bold text-sm text-[rgb(var(--theme-600))]">Tambah Anggota Baru</span>
                    </button>
                  )}

                  {selectedChat.participants.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-colors group relative">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0 ${getAvatarColor(p.user?.nama_lengkap)}`}>
                          {(p.user?.nama_lengkap || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {p.user?.nama_lengkap || 'Pengguna'} {p.user_id === currentUserId && <span className="text-gray-400 font-normal italic">(Anda)</span>}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">{p.user?.role_akun || 'User'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.role === 'admin' && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full font-bold border border-emerald-100 dark:border-emerald-800">Admin</span>
                        )}
                        {p.user_id === selectedChat.creator_id && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full font-bold border border-blue-100 dark:border-blue-800">Pembuat</span>
                        )}
                        {selectedChat.myRole === 'admin' && p.user_id !== currentUserId && (
                          <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `member-${p.id}` ? null : `member-${p.id}`); }} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {openMenuId === `member-${p.id}` && (
                              <div className="absolute right-0 top-8 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-[60]">
                                {p.role !== 'admin' && (
                                  <button onClick={(e) => { e.stopPropagation(); handlePromoteAdmin(p.user_id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors border-b border-gray-100 dark:border-gray-700">
                                    Jadikan Admin
                                  </button>
                                )}
                                {p.role === 'admin' && selectedChat.creator_id === currentUserId && p.user_id !== selectedChat.creator_id && (
                                  <button onClick={(e) => { e.stopPropagation(); handleDemoteAdmin(p.user_id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium transition-colors border-b border-gray-100 dark:border-gray-700">
                                    Berhentikan Admin
                                  </button>
                                )}
                                {(p.user_id !== selectedChat.creator_id && (selectedChat.creator_id === currentUserId || p.role !== 'admin')) && (
                                  <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(p.user_id); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors">
                                    Keluarkan dari Grup
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity" onClick={() => setShowAddMemberModal(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out] flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Anggota</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 rounded-full p-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddMembers} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pilih kontak untuk ditambahkan</p>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden">
                  {availableUsers.filter(u => !selectedChat?.participants?.find(p => p.user_id === u.id)).map(u => (
                    <label key={u.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <input 
                        type="checkbox"
                        checked={newMembers.includes(u.id)}
                        onChange={() => toggleNewMemberSelection(u.id)}
                        className="mr-3 w-4 h-4 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))] border-gray-300"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{u.nama_lengkap}</p>
                        <p className="text-xs text-gray-500">{u.role_akun}</p>
                      </div>
                    </label>
                  ))}
                  {availableUsers.filter(u => !selectedChat?.participants?.find(p => p.user_id === u.id)).length === 0 && (
                    <div className="px-4 py-6 text-center text-sm font-medium text-gray-500">Semua pengguna sudah berada di dalam grup ini.</div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={newMembers.length === 0} className="px-6 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Tambahkan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditGroupNameModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowEditGroupNameModal(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ubah Nama Grup</h3>
              <button onClick={() => setShowEditGroupNameModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 rounded-full p-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateGroupName} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nama Grup Baru</label>
                <input required type="text" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[rgb(var(--theme-500))] outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditGroupNameModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={!editGroupName.trim()} className="px-6 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScreenShareConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowScreenShareConfirm(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out]">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aktifkan Layar Utama</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Panggilan suara Anda akan beralih ke mode video/layar untuk dapat melakukan share screen. Lanjutkan?</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowScreenShareConfirm(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button onClick={handleScreenShareConfirm} className="px-6 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white transition-all">Lanjutkan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScreenAudioConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setShowScreenAudioConfirm(false); executeScreenShare(false); }}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out]">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Bagikan Audio Perangkat?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Apakah Anda ingin suara dari komputer Anda juga terdengar oleh peserta lain selama Share Screen?</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setShowScreenAudioConfirm(false); executeScreenShare(true); }} className="w-full px-6 py-3 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white transition-all">Ya, Bagikan Audio Layar</button>
                <button onClick={() => { setShowScreenAudioConfirm(false); executeScreenShare(false); }} className="w-full px-5 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Tidak, Layar Saja</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddCallMember && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowAddCallMember(false)}></div>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl z-10 overflow-hidden animate-[popIn_0.2s_ease-out] flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-800 shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Peserta Panggilan</h3>
              <button onClick={() => setShowAddCallMember(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 rounded-full p-2 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddMemberToCall} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pilih kontak untuk ditambahkan ke panggilan</p>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-hidden">
                  {availableUsers.filter(u => !(callState.participantIds || []).includes(u.id)).map(u => (
                    <label key={u.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <input 
                        type="checkbox"
                        checked={callNewMembers.includes(u.id)}
                        onChange={() => toggleCallMemberSelection(u.id)}
                        className="mr-3 w-4 h-4 text-[rgb(var(--theme-600))] focus:ring-[rgb(var(--theme-500))] border-gray-300"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{u.nama_lengkap}</p>
                        <p className="text-xs text-gray-500">{u.role_akun}</p>
                      </div>
                    </label>
                  ))}
                  {availableUsers.filter(u => !(callState.participantIds || []).includes(u.id)).length === 0 && (
                    <div className="px-4 py-6 text-center text-sm font-medium text-gray-500">Semua pengguna sudah berada dalam panggilan ini.</div>
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowAddCallMember(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Batal</button>
                <button type="submit" disabled={callNewMembers.length === 0} className="px-6 py-2.5 rounded-xl font-bold bg-[rgb(var(--theme-600))] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all">Tambahkan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {callState.active && (() => {
        const isVideoLayout = !mediaState.isVideoOff || mediaState.isScreenSharing || Array.from(remoteMediaStates.values()).some(m => !m.isVideoOff || m.isScreenSharing);
        
        let screenSharingUser = null;
        let screenSharingStream = null;

        if (mediaState.isScreenSharing) {
          screenSharingUser = currentUserId;
          screenSharingStream = screenStreamRef.current;
        } else {
          Array.from(remoteMediaStates.entries()).forEach(([uId, uState]) => {
            if (uState.isScreenSharing) {
              screenSharingUser = uId;
              screenSharingStream = remoteStreams.get(uId);
            }
          });
        }

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 backdrop-blur-md animate-[popIn_0.3s_ease-out]">
            <div className="text-center flex flex-col items-center w-full px-4 h-full py-8">
              
              {isVideoLayout && !callState.incoming && (
                <div className={`w-full flex-1 flex ${screenSharingUser ? 'flex-col lg:flex-row' : 'flex-wrap justify-center'} gap-4 mb-4 overflow-y-auto custom-scrollbar p-2`}>
                  
                  {screenSharingUser && (
                    <div className="w-full lg:flex-[3] relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col">
                      <div className="absolute top-4 left-4 z-10 bg-blue-600/90 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 backdrop-blur-sm shadow-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Layar {getUserDisplayInfo(screenSharingUser).name}
                      </div>
                      <div className="flex-1 w-full h-full flex items-center justify-center p-2">
                         <VideoPlayer stream={screenSharingStream} isLocal={screenSharingUser === currentUserId} trigger={streamUpdateTrigger} />
                      </div>
                    </div>
                  )}

                  <div className={`flex ${screenSharingUser ? 'flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto lg:w-64 shrink-0' : 'flex-wrap justify-center w-full'} gap-4`}>
                    
                    {(!screenSharingUser || screenSharingUser !== currentUserId || !mediaState.isVideoOff) && (
                      <div className={`relative bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-700 flex items-center justify-center ${screenSharingUser ? 'w-48 lg:w-full h-32 lg:h-40 shrink-0' : 'flex-1 min-w-[300px] max-w-[600px] aspect-video'}`}>
                        {mediaState.isVideoOff ? (
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl ${getAvatarColor(getUserDisplayInfo(currentUserId).name)}`}>
                            {getUserDisplayInfo(currentUserId).initial}
                          </div>
                        ) : (
                          <VideoPlayer stream={localStreamRef.current} isLocal={true} trigger={streamUpdateTrigger} />
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-md text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5">
                          {getUserDisplayInfo(currentUserId).name}
                          {mediaState.isMuted && (
                            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                      const userInfo = getUserDisplayInfo(userId);
                      const userMediaState = remoteMediaStates.get(userId) || {};
                      
                      if (screenSharingUser === userId && userMediaState.isVideoOff) return null;

                      return (
                        <div key={userId} className={`relative bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-700 flex items-center justify-center ${screenSharingUser ? 'w-48 lg:w-full h-32 lg:h-40 shrink-0' : 'flex-1 min-w-[300px] max-w-[600px] aspect-video'}`}>
                          {userMediaState.isVideoOff ? (
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-xl ${getAvatarColor(userInfo.name)}`}>
                              {userInfo.initial}
                            </div>
                          ) : (
                             <VideoPlayer stream={stream} isLocal={false} trigger={streamUpdateTrigger} />
                          )}
                          
                          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-md text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5">
                            {userInfo.name}
                            {userMediaState.isMuted && (
                              <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isVideoLayout && !callState.incoming && (
                 <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className="flex flex-wrap justify-center gap-8 mb-8 max-w-4xl">
                      <div className="flex flex-col items-center animate-pulse relative">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-xl mb-4 ${getAvatarColor(getUserDisplayInfo(currentUserId).name)} ring-4 ring-emerald-500/30`}>
                          {getUserDisplayInfo(currentUserId).initial}
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full">
                          <span className="text-base font-medium text-white">
                            {getUserDisplayInfo(currentUserId).fullName}
                          </span>
                          {mediaState.isMuted && (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                          )}
                        </div>
                      </div>

                      {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                        const userInfo = getUserDisplayInfo(userId);
                        const userMediaState = remoteMediaStates.get(userId) || {};
                        return (
                          <div key={userId} className="flex flex-col items-center relative">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-xl mb-4 ${getAvatarColor(userInfo.name)} ring-4 ring-emerald-500/30`}>
                              {userInfo.initial}
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full max-w-[250px]">
                              <span className="text-base font-medium text-white truncate">
                                {userInfo.fullName}
                              </span>
                              {userMediaState.isMuted && (
                                 <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                              )}
                            </div>
                            <AudioPlayer stream={stream} trigger={streamUpdateTrigger} />
                          </div>
                        );
                      })}

                      {callState.isGroup && Array.from(remoteStreams.entries()).length === 0 && (
                        <p className="text-gray-400 mt-10 w-full text-center text-lg">Menunggu peserta lain bergabung...</p>
                      )}
                    </div>
                    <p className="text-2xl text-emerald-400 font-medium tracking-wide">Panggilan Suara {callState.isGroup ? 'Grup' : ''}</p>
                 </div>
              )}

              {!callState.incoming && (
                <div className="flex justify-between items-center w-full max-w-4xl bg-gray-800/80 p-4 rounded-3xl border border-gray-700 backdrop-blur-md shrink-0 mt-auto mx-auto gap-4 relative">
                   
                   <div className="flex-1 flex justify-start min-w-0">
                     {videoDevices.length > 0 && (!mediaState.isVideoOff || mediaState.isScreenSharing) && (
                       <div className="relative group hidden sm:block max-w-full z-20">
                         <select 
                           value={selectedVideoDeviceId} 
                           onChange={(e) => changeVideoDevice(e.target.value)}
                           className="bg-gray-900 text-gray-300 text-sm rounded-xl pl-4 pr-10 py-2.5 outline-none border border-gray-600 hover:border-gray-400 transition-colors appearance-none cursor-pointer max-w-[200px] lg:max-w-[250px] truncate shadow-sm font-medium w-full"
                         >
                           {videoDevices.map((d, i) => (
                             <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${i + 1}`}</option>
                           ))}
                         </select>
                         <svg className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                       </div>
                     )}
                   </div>

                   <div className="flex items-center gap-3 md:gap-4 justify-center shrink-0">
                     <button onClick={toggleMute} className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 z-20 ${mediaState.isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {mediaState.isMuted ? (
                          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                        ) : (
                          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                     </button>
                     
                     <button onClick={toggleVideo} className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 z-20 ${mediaState.isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {mediaState.isVideoOff ? (
                           <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>
                        ) : (
                           <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                     </button>

                     <button onClick={toggleScreenShare} className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 z-20 ${mediaState.isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                     </button>
                   </div>

                   <div className="flex-1 flex justify-end items-center gap-3">
                     <button onClick={() => { fetchUsers(); setShowAddCallMember(true); }} className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-110 bg-gray-700 hover:bg-gray-600 z-20">
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                     </button>

                     <button onClick={endCall} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all transform hover:scale-110 z-20">
                       <svg className="w-6 h-6 md:w-7 md:h-7 transform rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                     </button>
                   </div>
                </div>
              )}

              {callState.incoming && (
                <div className="flex flex-col items-center my-auto">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
                    <div className={`relative w-40 h-40 rounded-full flex items-center justify-center text-white font-bold text-6xl shadow-2xl mb-8 z-10 ${getAvatarColor(getUserDisplayInfo(callState.callerId).name)} border-4 border-white/10`}>
                        {getUserDisplayInfo(callState.callerId).initial}
                    </div>
                  </div>
                  <h2 className="text-5xl font-bold text-white mb-3">{getUserDisplayInfo(callState.callerId).name}</h2>
                  <p className="text-lg text-emerald-300 font-semibold mb-4 px-4 py-1.5 bg-emerald-900/30 rounded-full border border-emerald-500/20">{getUserDisplayInfo(callState.callerId).role}</p>
                  <p className="text-2xl text-gray-300 mb-16 font-medium">Panggilan {callState.type === 'video' ? 'Video' : 'Suara'} {callState.isGroup ? 'Grup ' : ''}Masuk...</p>
                  <div className="flex gap-10">
                    <button onClick={acceptCall} className="group flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-emerald-500 group-hover:bg-emerald-400 flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform group-hover:scale-110">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <span className="text-emerald-400 font-bold text-lg tracking-wide">Terima</span>
                    </button>
                    <button onClick={declineCall} className="group flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-red-500 group-hover:bg-red-400 flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all transform group-hover:scale-110">
                        <svg className="w-10 h-10 transform rotate-[135deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <span className="text-red-400 font-bold text-lg tracking-wide">Tolak</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LiveChat;