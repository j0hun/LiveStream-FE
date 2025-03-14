import React, { useEffect, useRef, useState } from "react";
import { WebRTCAdaptor } from "@antmedia/webrtc_adaptor";
import ApiService from "../../service/ApiService";

const WEBSOCKET_URL = process.env.REACT_APP_LIVEAPP_WEBSOCKET_URL;

const WebRTCAMSBroadcasterPage = () => {
  const videoRef = useRef(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const [hlsUrl, setHlsUrl] = useState(null);

  useEffect(() => {
    const initStream = async () => {
      try {
        // 방송 생성 API 호출
        const response = await ApiService.amsStartStream();        
        setStreamId(response.streamId);
        setHlsUrl(response.hlsUrl);

        // WebRTC 설정
        const pc_config = {
          iceServers: [{ urls: "stun:stun1.l.google.com:19302" }],
        };
        const sdp_constraints = {
          OfferToReceiveAudio: false,
          OfferToReceiveVideo: false,
        };
        const mediaConstraints = { video: true, audio: true };

        // WebRTCAdaptor 초기화 및 콜백 설정
        const webRTCAdaptor = new WebRTCAdaptor({
          websocket_url: WEBSOCKET_URL,
          mediaConstraints,
          peerconnection_config: pc_config,
          sdp_constraints,
          localVideoId: "localVideo",
          debug: true,
          callback: (info, obj) => {
            console.log("Callback:", info, obj);
            if (info === "initialized") {
              webRTCAdaptor.publish(response.streamId);
            } else if (info === "publish_started") {
              setIsPublishing(true);
            } else if (info === "publish_finished") {
              setIsPublishing(false);
            }
          },
          callbackError: (error, message) => {
            console.error("Error callback:", error, message);
          },
        });
      } catch (error) {
        console.error("방송 생성 실패:", error);
      }
    };

    initStream();
  }, []);

  return (
    <div>
      <h2>WebRTC → RTP → HLS</h2>
      <video
        id="localVideo"
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100px" }}
      />
      {streamId && <p>Stream ID: {streamId}</p>}
      {hlsUrl && (
        <p>
          HLS URL:{" "}
          <a href={hlsUrl} target="_blank" rel="noopener noreferrer">
            {hlsUrl}
          </a>
        </p>
      )}
      <p>Status: {isPublishing ? "Publishing" : "Not Publishing"}</p>
    </div>
  );
};

export default WebRTCAMSBroadcasterPage;
