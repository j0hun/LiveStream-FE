import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ApiService from "../../service/ApiService";
import adapter from "webrtc-adapter";
import Janus from "janus-gateway";

const JANUS_SERVER = process.env.REACT_APP_JANUS_SERVER;
window.adapter = adapter;

const ViewerPage = () => {
  const { roomId } = useParams();

  // 시청자(Subscriber) 비디오
  const remoteVideoRef = useRef(null);

  // Janus 인스턴스 & 구독자 핸들
  const janusInstanceRef = useRef(null);
  const subscriberHandleRef = useRef(null);
  const isSubscribedRef = useRef(false); // 중복 join 방지

  // 백엔드에서 publisher feed ID 조회 & join
  const joinRoomOnBackend = async (sessionId, handleId) => {
    try {
      let feed = await ApiService.getPublishers(sessionId, handleId, Number(roomId));
      console.log("구독할 feed ID:", feed);
      if (!feed) {
        console.error("유효한 feed ID가 없습니다.");
        return null;
      }
      // 백엔드에 join 요청 (이미 가입되었을 수 있음)
      const response = await ApiService.joinRoom(
        sessionId,
        handleId,
        Number(roomId),
        "Subscriber",
        "subscriber",
        feed
      );
      console.log("백엔드 join 응답:", response);
      return feed;
    } catch (error) {
      console.error("백엔드 join 실패:", error);
      return null;
    }
  };

  useEffect(() => {
    Janus.init({
      debug: "all",
      callback: () => {
        // (1) STUN/TURN 서버 설정
        const iceServers = [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: TURN_SERVER,
            username: TURN_USERNAME,
            credential: TURN_CREDENTIAL,
          },
        ];
        Janus.iceServers = iceServers;

        // Janus 세션 생성
        janusInstanceRef.current = new Janus({
          server: JANUS_SERVER,
          iceServers,
          rtcConfiguration: { iceTransportPolicy: "relay" },
          success: async () => {
            console.log("Janus session 생성 성공");
            const sessionId = janusInstanceRef.current.getSessionId();
            if (!sessionId) {
              console.error("Janus 세션 ID가 유효하지 않음!");
              return;
            }

            // Subscriber plugin attach
            janusInstanceRef.current.attach({
              plugin: "janus.plugin.videoroom",
              success: async (pluginHandle) => {
                subscriberHandleRef.current = pluginHandle;
                console.log("Subscriber attach 성공");
                const handleId = pluginHandle.getId();

                // 백엔드를 통해 시청할 feed ID 조회 & join
                const feed = await joinRoomOnBackend(sessionId, handleId);
                if (!feed) {
                  console.error("유효한 feed ID 없음");
                  return;
                }

                // 중복 가입 방지를 위해 한 번만 join 요청
                if (!isSubscribedRef.current) {
                  const subscribe = {
                    request: "join",
                    room: Number(roomId),
                    ptype: "subscriber",
                    feed: feed,
                  };
                  console.log("구독 요청:", subscribe);
                  pluginHandle.send({ message: subscribe });
                  isSubscribedRef.current = true;
                } else {
                  console.log("이미 구독된 상태입니다.");
                }
              },
              error: (error) => console.error("Subscriber attach 에러:", error),
              onmessage: (msg, jsep) => {
                console.log("Subscriber onmessage:", msg);
                // 이미 가입된 경우 에러 코드 425를 무시
                if (msg.error_code && msg.error_code === 425) {
                  console.log("이미 구독된 상태입니다. 중복 join 요청 무시");
                  return;
                }
                // jsep이 있으면 Answer 생성
                if (jsep) {
                  subscriberHandleRef.current.createAnswer({
                    jsep,
                    media: { audioSend: false, videoSend: false },
                    success: (jsepAnswer) => {
                      const body = { request: "start", room: Number(roomId) };
                      subscriberHandleRef.current.send({ message: body, jsep: jsepAnswer });
                      console.log("Subscriber answer 전송");
                    },
                    error: (error) => console.error("Subscriber createAnswer 에러:", error),
                  });
                }
              },
              onremotetrack: (track, mid, on) => {
                console.log("onremotetrack 이벤트:", track, mid, on);
                if (on) {
                  let stream = remoteVideoRef.current.srcObject;
                  if (!stream) {
                    stream = new MediaStream();
                    remoteVideoRef.current.srcObject = stream;
                    console.log("새로운 MediaStream 생성");
                  }
                  if (!stream.getTracks().includes(track)) {
                    stream.addTrack(track);
                    console.log("스트림에 새로운 트랙 추가:", track.kind);
                  }
                } else {
                  console.log("트랙 ended:", track.kind);
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
      <h3>스트리밍 시청 (Viewer)</h3>
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100px" }} />
    </div>
  );
};

export default ViewerPage;
