import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ApiService from "../../service/ApiService";

// ICE 서버 설정 (STUN 서버 사용)
const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const WebRTCP2PStreamPage = () => {
  // URL 파라미터에서 roomId를 가져옴
  const { roomId } = useParams();

  // 비디오 엘리먼트 참조
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // WebSocket 참조
  const socketRef = useRef(null);

  // 시청자는 단일 RTCPeerConnection을 사용, 방송자는 여러 viewer와 각각 연결
  const peerConnectionRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { [viewerId]: RTCPeerConnection }

  // 방송자용 로컬 스트림 참조
  const localStreamRef = useRef(null);

  // 현재 사용자가 방송자인지 여부를 상태로 관리 (null: 결정 전)
  const [isBroadcaster, setIsBroadcaster] = useState(null);

  /**
   * API를 호출하여 해당 room에 이미 방송자가 존재하는지 확인합니다.
   * 결과에 따라 현재 사용자의 역할(isBroadcaster)을 설정합니다.
   */
  const checkBroadcaster = async () => {
    try {
      const response = await ApiService.checkBroadcaster(roomId);
      setIsBroadcaster(response.data);
    } catch (error) {
      console.error("checkBroadcaster error:", error);
    }
  };

  /**
   * 방송자라면, 사용자의 카메라로부터 로컬 스트림을 가져와 video 태그에 할당합니다.
   */
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

  /**
   * 방송자가 새 시청자(viewer)에게 offer를 보내기 위해 RTCPeerConnection을 생성하고, offer를 전달합니다.
   * @param {string} viewerId - offer를 보낼 시청자의 ID
   */
  const createOfferForViewer = async (viewerId) => {
    // 로컬 스트림이 없는 경우 먼저 획득
    if (!localStreamRef.current) {
      await getLocalStream();
    }

    // 새로운 RTCPeerConnection 생성
    const pc = new RTCPeerConnection(ICE_SERVERS);
    // viewerId를 key로 해당 연결을 저장
    peerConnectionsRef.current[viewerId] = pc;

    // 로컬 스트림의 모든 트랙을 RTCPeerConnection에 추가
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // ICE 후보가 발생하면 해당 정보를 signaling 서버로 전송
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        const candidateMessage = {
          type: "signal",
          roomId,
          viewerId, // candidate 메시지에 대상 viewerId 포함
          signalData: {
            type: "candidate",
            candidate: event.candidate.toJSON(),
          },
        };
        socketRef.current.send(JSON.stringify(candidateMessage));
      }
    };

    // offer 생성 및 로컬 설명(localDescription) 설정
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 생성된 offer (SDP offer 객체)를 시그널링 메시지로 전송
    const offerMessage = {
      type: "signal",
      roomId,
      viewerId,
      signalData: pc.localDescription,
    };
    socketRef.current.send(JSON.stringify(offerMessage));
    console.log("📡 방송자: offer 전송 to viewer", viewerId, offer);
  };

  /**
   * 시청자가 방송자로부터 offer를 수신했을 때 처리하는 함수입니다.
   * offer를 받아 RTCPeerConnection을 생성하고, answer를 생성하여 방송자에게 전송합니다.
   * @param {object} offerData - 방송자로부터 받은 SDP offer 데이터
   */
  const startWatching = async (offerData) => {
    // 새로운 RTCPeerConnection 생성
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // ICE 후보 발생 시 처리
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        const candidateMessage = {
          type: "signal",
          roomId,
          signalData: {
            type: "candidate",
            candidate: event.candidate.toJSON(),
          },
        };
        socketRef.current.send(JSON.stringify(candidateMessage));
      }
    };

    // 원격 스트림 수신 시, video 태그에 할당
    pc.ontrack = (event) => {
      console.log("📺 ontrack event:", event);
      if (event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // 수신한 offer를 원격 설명으로 설정
    await pc.setRemoteDescription(new RTCSessionDescription(offerData));
    // answer 생성 및 로컬 설명 설정
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // 생성된 answer를 방송자에게 전송
    const answerMessage = {
      type: "signal",
      roomId,
      signalData: pc.localDescription,
    };
    socketRef.current.send(JSON.stringify(answerMessage));
    console.log("📺 시청자: answer 전송", answer);
  };

  /**
   * WebSocket을 통해 전달받은 시그널링 메시지를 처리합니다.
   * 방송자인 경우: 시청자로부터 받은 answer나 candidate를 처리
   * 시청자인 경우: 방송자로부터 받은 offer나 candidate를 처리
   * @param {object} data - WebSocket 메시지 데이터
   */
  const handleSignal = async (data) => {
    const { signalData, viewerId } = data;

    if (isBroadcaster) {
      // 방송자: 시청자로부터 answer나 candidate 메시지를 처리
      if (signalData.type === "answer") {
        // viewerId에 해당하는 RTCPeerConnection을 찾아 answer 처리
        const pc = peerConnectionsRef.current[viewerId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          console.log("📡 방송자: answer 수신 from viewer", viewerId, signalData);
        }
      } else if (signalData.type === "candidate") {
        const pc = peerConnectionsRef.current[viewerId];
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          console.log("📡 방송자: candidate 수신 from viewer", viewerId, signalData.candidate);
        }
      }
    } else {
      // 시청자: 방송자로부터 offer나 candidate 메시지를 처리
      if (signalData.type === "offer") {
        console.log("📺 시청자: offer 수신", signalData);
        await startWatching(signalData);
      } else if (signalData.type === "candidate") {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          console.log("📺 시청자: candidate 수신", signalData.candidate);
        }
      }
    }
  };

  // 컴포넌트 마운트 시, 방송자 여부 확인 API 호출
  useEffect(() => {
    checkBroadcaster();
  }, []);

  // isBroadcaster 값이 결정된 후에 WebSocket 연결 및 이벤트 설정
  useEffect(() => {
    if (isBroadcaster === null) return; // 아직 방송자 여부를 결정하지 않은 경우

    // WebSocket 연결 생성
    const ws = new WebSocket("ws://localhost:8080/ws");
    socketRef.current = ws;

    // 연결이 열리면, join 메시지를 보내고 방송자라면 로컬 스트림 획득
    ws.onopen = async () => {
      const role = isBroadcaster ? "broadcaster" : "viewer";
      const joinMessage = { type: "join", role, roomId };
      ws.send(JSON.stringify(joinMessage));
      console.log(`WebSocket 연결 성공: role = ${role}`);

      if (isBroadcaster) {
        await getLocalStream();
      }
    };

    // WebSocket 메시지 수신 시 처리
    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log("📥 WebSocket 메시지 수신:", data);

      // 시그널 메시지 처리
      if (data.type === "signal") {
        await handleSignal(data);
      }
      // 방송자에게 새 시청자가 입장했다는 알림이 오면,
      // 해당 viewerId를 대상으로 offer 생성
      else if (data.type === "newViewer") {
        if (isBroadcaster) {
          const newViewerId = data.viewerId;
          console.log("👀 새로운 시청자 입장:", newViewerId);
          await createOfferForViewer(newViewerId);
        }
      }
    };

    // 에러 발생 시 로그 출력
    ws.onerror = (err) => {
      console.error("WebSocket 에러:", err);
    };

    // 컴포넌트 언마운트 시 WebSocket 연결 종료
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
          style={{ width: "100px" }}
        />
      )}
      {!isBroadcaster && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "100px" }}
        />
      )}
    </div>
  );
};

export default WebRTCP2PStreamPage;
