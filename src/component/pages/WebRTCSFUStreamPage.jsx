import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ApiService from "../../service/ApiService";
import adapter from "webrtc-adapter";
import Janus from "janus-gateway";

const JANUS_SERVER = "http://localhost:8088/janus";
window.adapter = adapter;

const WebRTCSFUStreamPage = () => {
  const { roomId } = useParams();

  // 비디오 엘리먼트 참조
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  // Janus 인스턴스 및 플러그인 핸들 참조
  const janusInstanceRef = useRef(null);
  const publisherHandleRef = useRef(null);
  const subscriberHandleRef = useRef(null);

  // 중복 실행 방지용 ref
  const isRoomCreatedRef = useRef(false);
  const isPublishingRef = useRef(false);

  // 방송자 여부 (null: 결정 전)
  const [isBroadcaster, setIsBroadcaster] = useState(null);

  // 방송자 여부 체크 (백엔드 API 호출)
  const checkBroadcaster = async () => {
    try {
      const response = await ApiService.checkBroadcaster(roomId);
      console.log("방송자 여부 확인:", response.data);
      setIsBroadcaster(response.data);
    } catch (error) {
      console.error("checkBroadcaster error:", error);
    }
  };

  // 방송자: 로컬 스트림 획득
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

  // 방송자: 백엔드에 방 생성 요청
  const createRoomOnBackend = async (sessionId, handleId) => {
    try {
      const response = await ApiService.createRoom(sessionId, handleId, Number(roomId));
      console.log("백엔드 방 생성 응답:", response);
    } catch (error) {
      console.error("백엔드 방 생성 실패:", error);
    }
  };

  // 시청자: 백엔드에서 방송자의 feed ID를 가져와 join 요청 (subscribe)
  const joinRoomOnBackend = async (sessionId, handleId) => {
    try {
      let feed = await ApiService.getPublishers(sessionId, handleId, Number(roomId));
      console.log("구독할 feed ID:", feed);
      if (!feed) {
        console.error("유효한 feed ID가 없습니다.");
        return null;
      }
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
    checkBroadcaster();
  }, [roomId]);

  useEffect(() => {
    if (isBroadcaster === null) return; // 아직 방송자 여부 결정 안됨

    Janus.init({
      debug: "all",
      callback: () => {
        janusInstanceRef.current = new Janus({
          server: JANUS_SERVER,
          success: async () => {
            console.log("Janus session 생성 성공");
            const sessionId = janusInstanceRef.current.getSessionId();
            if (!sessionId) {
              console.error("Janus 세션 ID가 유효하지 않음!");
              return;
            }

            if (isBroadcaster) {
              // 방송자(Publisher) 처리
              const localStream = await getLocalStream();
              janusInstanceRef.current.attach({
                plugin: "janus.plugin.videoroom",
                success: async (pluginHandle) => {
                  publisherHandleRef.current = pluginHandle;
                  console.log("Janus Videoroom 플러그인 (publisher) attach 성공");
                  const handleId = pluginHandle.getId();

                  if (!isRoomCreatedRef.current) {
                    isRoomCreatedRef.current = true;
                    await createRoomOnBackend(sessionId, handleId);
                  }

                  // 방송자 join 요청
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
                  if (jsep) {
                    publisherHandleRef.current.handleRemoteJsep({ jsep });
                  }
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
                },
                onlocalstream: (stream) => {
                  console.log("📡 publisher onlocalstream");
                  if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                  }
                }
              });
            } else {
              // 시청자(Subscriber) 처리
              janusInstanceRef.current.attach({
                plugin: "janus.plugin.videoroom",
                success: async (pluginHandle) => {
                  subscriberHandleRef.current = pluginHandle;
                  console.log("Subscriber attach 성공");
                  const handleId = pluginHandle.getId();
                  console.log(sessionId, handleId);
                  const feed = await joinRoomOnBackend(sessionId, handleId);
                  if (!feed) {
                    console.error("유효한 feed ID 없음");
                    return;
                  }
                  const subscribe = {
                    request: "join",
                    room: Number(roomId),
                    ptype: "subscriber",
                    feed: feed,
                  };
                  console.log("구독 요청:", subscribe);
                  pluginHandle.send({ message: subscribe });
                },
                error: (error) => console.error("Subscriber attach 에러:", error),
                onmessage: (msg, jsep) => {
                  console.log("Subscriber onmessage:", msg);
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
                  console.log("onremotetrack 이벤트 수신:", track, mid, on);
                  if (on) {
                    let stream = remoteVideoRef.current.srcObject;
                    if (!stream) {
                      stream = new MediaStream();
                      remoteVideoRef.current.srcObject = stream;
                      console.log("새로운 스트림 객체 생성");
                    }
                    if (!stream.getTracks().includes(track)) {
                      stream.addTrack(track);
                      console.log("새로운 트랙 추가됨:", track.kind);
                    }
                  }
                }
              });
            }
          },
          error: (error) => console.error("Janus session 생성 에러:", error),
          destroyed: () => console.log("Janus session 파괴됨")
        });
      },
    });
  }, [isBroadcaster, roomId]);

  return (
    <div>
      <h3>{isBroadcaster ? "방송 중" : "스트리밍 시청 중"}</h3>
      <video ref={isBroadcaster ? localVideoRef : remoteVideoRef} autoPlay playsInline style={{ width: "100px" }} />
    </div>
  );
};

export default WebRTCSFUStreamPage;
