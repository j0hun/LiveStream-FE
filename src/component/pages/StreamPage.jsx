import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// StreamPage 컴포넌트: 방송자와 시청자가 WebRTC를 통해 실시간 스트리밍을 주고받는 페이지
const StreamPage = () => {
    // video 엘리먼트를 직접 제어하기 위한 ref 설정
    const remoteVideoRef = useRef(null); // 시청자가 볼 원격 스트림
    const localVideoRef = useRef(null);  // 방송자가 자신의 스트림을 볼 로컬 스트림
    // WebSocket 연결과 RTCPeerConnection 객체를 저장할 ref
    const socketRef = useRef(null);      
    const peerConnectionRef = useRef(null);

    // 현재 라우터의 location 객체를 통해 전달된 상태값을 가져옴
    // location.state에 isBroadcaster (방송 여부)와 roomId (방송자의 방 식별자)가 포함됨
    const location = useLocation();
    const { isBroadcaster} = location.state || {}; 
    const roomId = 1;
    // ICE 서버 설정: STUN 서버를 이용하여 NAT 환경에서도 피어 간의 연결을 도와줌
    const servers = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // 컴포넌트가 마운트될 때 WebSocket 연결을 설정하고 이벤트 핸들러를 등록
    useEffect(() => {
        // WebSocket 서버에 연결 (예: 로컬 서버에서 ws://localhost:8080/ws)
        const ws = new WebSocket("ws://localhost:8080/ws");
        socketRef.current = ws; // 나중에 메시지 전송에 사용할 수 있도록 저장
        // WebSocket 연결이 열리면 호출되는 이벤트 핸들러
        ws.onopen = () => {
            if (isBroadcaster) {
                // 방송자라면, 서버에 "broadcaster" 역할로 참여한다고 알림
                ws.send(JSON.stringify({ type: "join", role: "broadcaster", roomId: roomId }));
                // 방송 시작: 카메라 스트림을 가져와서 WebRTC 연결을 설정
                startBroadcasting();
            } else {
                // 시청자라면, 서버에 "viewer" 역할과 함께 어느 방송자의 방송을 볼 것인지 알려줌
                ws.send(JSON.stringify({ type: "join", role: "viewer", roomId: roomId }));
            }
        };

        // WebSocket으로부터 메시지를 수신하면 호출됨
        ws.onmessage = async (event) => {
            // 받은 메시지를 JSON 객체로 변환
            const data = JSON.parse(event.data);
            console.log("📥 WebSocket 메시지:", data);

            // 메시지 타입이 "signal"이면 WebRTC 연결에 필요한 신호 데이터를 처리
            if (data.type === "signal") {
                handleSignal(data);
            }
        };

        // 컴포넌트 언마운트 시 WebSocket 연결을 닫음
        return () => {
            ws.close();
        };
    }, [isBroadcaster, roomId]);

    // 방송자용 함수: 사용자의 카메라에서 미디어 스트림을 받아와 WebRTC 연결을 설정하고 offer를 생성하여 전송
    const startBroadcasting = async () => {
        try {
            // 사용자의 카메라(비디오) 스트림을 요청 (오디오도 추가 가능)
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // 로컬 비디오 엘리먼트에 스트림을 할당하여 자신의 영상을 화면에 표시
            localVideoRef.current.srcObject = stream;

            // RTCPeerConnection 객체를 생성하여 피어 간의 연결을 관리
            const pc = new RTCPeerConnection(servers);
            peerConnectionRef.current = pc;

            // 가져온 스트림의 각 트랙(여기서는 비디오 트랙)을 PeerConnection에 추가
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // ICE 후보(네트워크 연결에 사용될 후보 정보)가 생성되면 이를 상대방에게 전송
            pc.onicecandidate = (event) => {
                if (event.candidate && socketRef.current) {
                    socketRef.current.send(
                        JSON.stringify({
                            type: "signal",
                            signalData: { type: "candidate", candidate: event.candidate },
                        })
                    );
                }
            };

            // 연결을 시작하기 위한 SDP offer를 생성
            const offer = await pc.createOffer();
            // 생성된 offer를 로컬 세션 설명으로 설정
            await pc.setLocalDescription(offer);
            // 생성한 offer를 WebSocket을 통해 상대방(시청자)에게 전송
            socketRef.current.send(
                JSON.stringify({
                    type: "signal",
                    roomId: roomId,
                    signalData: pc.localDescription,
                })
            );
        } catch (error) {
            console.error("Failed to get user media:", error);
            alert("카메라 권한을 허용해주세요.");
        }
    };

    // 시청자용 함수: 방송자로부터 전달받은 offer를 기반으로 RTCPeerConnection을 생성하고 answer를 만들어 전송
    const startWatching = async (signalData) => {
        // 새로운 RTCPeerConnection 객체를 생성
        const pc = new RTCPeerConnection(servers);
        peerConnectionRef.current = pc;

        // ICE 후보가 생성되면 방송자에게 전송
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

        // 방송자로부터 전송된 스트림이 도착하면, 이를 시청자의 video 엘리먼트에 할당
        pc.ontrack = (event) => {
            if (event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // 수신한 offer를 원격 세션 설명으로 설정
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        // offer에 응답하는 answer를 생성
        const answer = await pc.createAnswer();
        // 생성한 answer를 로컬 세션 설명으로 설정
        await pc.setLocalDescription(answer);

        // 생성된 answer를 WebSocket을 통해 방송자에게 전송
        if (socketRef.current) {
            socketRef.current.send(
                JSON.stringify({
                    type: "signal",
                    signalData: pc.localDescription,
                })
            );
        }
    };

    // WebRTC 신호 데이터(offer, answer, candidate 등)를 처리하는 함수
    const handleSignal = async (data) => {
        const { signalData } = data;

        // 만약 signalData의 타입이 "offer"이고 현재 사용자가 방송자가 아니라면
        if (signalData.type === "offer" && !isBroadcaster) {
            // 시청자일 경우, offer를 받고 answer를 생성하도록 startWatching 함수를 호출
            await startWatching(signalData);
        } else if (signalData.type === "candidate") {
            // 수신한 ICE candidate 정보를 현재의 RTCPeerConnection에 추가
            const pc = peerConnectionRef.current;
            if (pc) {
                await pc.addIceCandidate(signalData.candidate);
            }
        }
    };

    // 두 번째 useEffect: isBroadcaster 값이 변경되었을 때 방송을 시작하도록 호출
    // (주의: 이미 첫 번째 useEffect의 onopen에서 방송자일 경우 startBroadcasting을 호출하므로 중복 호출에 주의)
    useEffect(() => {
        if (isBroadcaster) {
            startBroadcasting();
        }
    }, [isBroadcaster]);

    // 렌더링 부분:
    // - 방송자인 경우: 자신의 로컬 비디오 스트림을 muted(음소거) 상태로 화면에 표시
    // - 시청자인 경우: 방송자로부터 전달받은 원격 스트림을 화면에 표시
    return (
        <div>
            <h3>{isBroadcaster ? "Broadcasting" : "Watching Stream"}</h3>
            {isBroadcaster && <video ref={localVideoRef} autoPlay muted />}
            {!isBroadcaster && <video ref={remoteVideoRef} autoPlay />}
        </div>
    );
};

export default StreamPage;
