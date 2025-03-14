import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ApiService from "../../service/ApiService";
import adapter from "webrtc-adapter";
import Janus from "janus-gateway";

const JANUS_SERVER = process.env.REACT_APP_JANUS_SERVER;
window.adapter = adapter;

const BroadcasterPage = () => {
  const { roomId } = useParams();

  // 로컬(방송자) 비디오
  const localVideoRef = useRef(null);

  // Janus와 publisher 핸들 보관
  const janusInstanceRef = useRef(null);
  const publisherHandleRef = useRef(null);

  // 중복 작업 방지
  const isRoomCreatedRef = useRef(false);
  const isPublishingRef = useRef(false);

  // 로컬 스트림 획득
  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Failed to get user media:", error);
      alert("카메라 및 마이크 권한을 허용해주세요.");
      throw error;
    }
  };

  // 백엔드에 방 생성 API
  const createRoomOnBackend = async (sessionId, handleId) => {
    try {
      const response = await ApiService.createRoom(sessionId, handleId, Number(roomId));
      console.log("백엔드 방 생성 응답:", response);
    } catch (error) {
      console.error("백엔드 방 생성 실패:", error);
    }
  };

  useEffect(() => {
    // Janus 초기화
    Janus.init({
      debug: "all",
      callback: () => {
        // (1) STUN 서버 설정
        // Janus 내부 전역 ICE 설정
        const iceServers = [
          {
            urls: "stun:stun.l.google.com:19302",
          },
          {
            urls: TURN_SERVER,
            username: TURN_USERNAME,
            credential: TURN_CREDENTIAL,
          },
        ];
        Janus.iceServers = iceServers;

        // 새 Janus 세션 생성
        janusInstanceRef.current = new Janus({
          server: JANUS_SERVER,
          iceServers, // 개별 세션에도 적용
          rtcConfiguration: {
            iceTransportPolicy: "relay"
          },
          success: async () => {
            console.log("Janus session 생성 성공");
            const sessionId = janusInstanceRef.current.getSessionId();
            if (!sessionId) {
              console.error("Janus 세션 ID가 유효하지 않음!");
              return;
            }

            // 로컬 카메라/마이크 스트림 확보
            const localStream = await getLocalStream();

            // Publisher plugin attach
            janusInstanceRef.current.attach({
              plugin: "janus.plugin.videoroom",
              success: async (pluginHandle) => {
                publisherHandleRef.current = pluginHandle;
                console.log("방송자 attach 성공");
                const handleId = pluginHandle.getId();

                // 방 생성(최초 1회만)
                if (!isRoomCreatedRef.current) {
                  isRoomCreatedRef.current = true;
                  await createRoomOnBackend(sessionId, handleId);
                }

                // Videoroom에 "join" (ptype: publisher)
                const register = {
                  request: "join",
                  room: Number(roomId),
                  ptype: "publisher",
                  display: "Broadcaster",
                };
                pluginHandle.send({ message: register });
              },
              error: (error) => console.error("publisher attach 에러:", error),
              onmessage: (msg, jsep) => {
                console.log("publisher onmessage:", msg);

                // (2) videoroom: "joined" 이벤트가 왔는지 확인하여 publish
                if (msg.videoroom === "joined") {
                  // 최초 publish Offer 전송
                  if (!isPublishingRef.current) {
                    isPublishingRef.current = true;
                    publisherHandleRef.current.createOffer({
                      media: { video: true, audio: true },
                      success: (jsep) => {
                        const publish = { request: "publish", audio: true, video: true };
                        publisherHandleRef.current.send({ message: publish, jsep });
                        console.log("Broadcaster: publish 요청 전송");
                      },
                      error: (error) => console.error("publisher createOffer 에러:", error),
                    });
                  }
                }

                // SDP 응답이 있으면 처리
                if (jsep) {
                  publisherHandleRef.current.handleRemoteJsep({ jsep });
                }
              },
              onlocalstream: (stream) => {
                console.log("📡 onlocalstream (방송자)");
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = stream;
                }
              },
            });
          },
          error: (error) => console.error("Janus session 생성 에러:", error),
          destroyed: () => console.log("Janus session 파괴됨"),
        });
      },
    });
  }, [roomId]);

  return (
    <div>
      <h3>방송 중 (Broadcaster)</h3>
      <video ref={localVideoRef} autoPlay playsInline style={{ width: "100px" }} />
    </div>
  );
};

export default BroadcasterPage;
