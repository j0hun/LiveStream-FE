import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ApiService from "../../service/ApiService";

const StreamPage = () => {
  const { roomId } = useParams();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isBroadcaster, setIsBroadcaster] = useState(null);

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const checkBroadcaster = async () => {
    try {
      const response = await ApiService.checkBroadcaster(roomId);
      setIsBroadcaster(response.data);
    } catch (error) {
      console.error("checkBroadcaster error:", error);
    }
  };

  // 방송자: 로컬 스트림 가져오기
  const getLocalStream = async () => {
    if (!localStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Failed to get user media:", error);
        alert("카메라 권한을 허용해주세요.");
      }
    }
  };

  // 방송자: 시청자에게 offer 생성
  const createOfferForViewer = async () => {
    if (!localStreamRef.current) {
      await getLocalStream();
    }
    // 기존 peer connection이 있으면 새로 생성
    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    // 로컬 스트림의 모든 트랙 추가
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // ICE candidate 발생 시 signaling 처리
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: "signal",
            roomId: roomId,
            signalData: { type: "candidate", candidate: event.candidate },
          })
        );
      }
    };

    // offer 생성 및 로컬 세션 설명 설정
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // 생성된 offer 전송 (객체 그대로 전송)
    socketRef.current.send(
      JSON.stringify({
        type: "signal",
        roomId: roomId,
        signalData: pc.localDescription,
      })
    );
    console.log("📡 방송자: offer 전송", offer);
  };

  // 시청자: offer 수신 후 answer 생성 및 원격 스트림 처리
  const startWatching = async (signalData) => {
    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    // ICE candidate 처리
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: "signal",
            roomId: roomId,
            signalData: { type: "candidate", candidate: event.candidate },
          })
        );
      }
    };

    // ontrack 이벤트: 원격 스트림 수신 시 video 태그에 할당
    pc.ontrack = (event) => {
      console.log("📺 ontrack event:", event);
      if (event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // offer를 원격 설명으로 설정 (객체 그대로 사용)
    await pc.setRemoteDescription(signalData);
    // answer 생성 및 로컬 설명 설정
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    // answer 전송
    socketRef.current.send(
      JSON.stringify({
        type: "signal",
        roomId: roomId,
        signalData: pc.localDescription,
      })
    );
    console.log("📺 시청자: answer 전송", answer);
  };

  // signaling 메시지 처리
  const handleSignal = async (data) => {
    const { signalData } = data;

    if (isBroadcaster) {
      // 방송자: 시청자로부터 받은 answer 또는 candidate 처리
      if (signalData.type === "answer") {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(signalData);
          console.log("📡 방송자: answer 수신", signalData);
        }
      } else if (signalData.type === "candidate") {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(signalData.candidate);
          console.log("📡 방송자: candidate 수신", signalData.candidate);
        }
      }
    } else {
      // 시청자: 방송자로부터 받은 offer 또는 candidate 처리
      if (signalData.type === "offer") {
        console.log("📺 시청자: offer 수신", signalData);
        await startWatching(signalData);
      } else if (signalData.type === "candidate") {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(signalData.candidate);
          console.log("📺 시청자: candidate 수신", signalData.candidate);
        }
      }
    }
  };

  useEffect(() => {
    checkBroadcaster();
  }, []);

  useEffect(() => {
    // isBroadcaster 값이 결정된 후에 WebSocket 연결 시작
    if (isBroadcaster === null) return;

    const ws = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = ws;

    ws.onopen = async () => {
      const role = isBroadcaster ? "broadcaster" : "viewer";
      ws.send(JSON.stringify({ type: "join", role, roomId }));
      console.log(`WebSocket 연결 성공: role = ${role}`);
      if (isBroadcaster) {
        await getLocalStream();
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log("📥 WebSocket 메시지 수신:", data);

      if (data.type === "signal") {
        await handleSignal(data);
      } else if (data.type === "newViewer") {
        // 새 시청자가 입장하면 방송자는 offer 전송
        if (isBroadcaster) {
          await createOfferForViewer();
        }
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket 에러:", err);
    };

    return () => {
      ws.close();
    };
  }, [isBroadcaster, roomId]);

  return (
    <div>
      <h3>{isBroadcaster ? "Broadcasting" : "Watching Stream"}</h3>
      {isBroadcaster && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "300px" }}
        />
      )}
      {!isBroadcaster && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "300px" }}
        />
      )}
    </div>
  );
};

export default StreamPage;
