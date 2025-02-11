import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RoomPage = () => {
    const [isBroadcaster, setIsBroadcaster] = useState(false);
    const [room, setRoom] = useState(null);  // 방송자 정보 대신 방 정보로 변경
    const navigate = useNavigate();
    useEffect(() => {
        const ws = new WebSocket("ws://localhost:8080/ws");

        ws.onopen = () => {
            ws.send(JSON.stringify({ type: "join", role: "viewer" }));
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log("📥 WebSocket 메시지:", data);

            if (data.type === "newBroadcaster") {
                setRoom(data.roomId);  // broadcaster 대신 roomId로 변경
            }

        };

        return () => {
            ws.close();
        };
    }, []);

    const startBroadcasting = () => {
        setIsBroadcaster(true);
        navigate("/stream", { state: { isBroadcaster: true } }); // 방송 시작 시 StreamPage로 이동
    };

    const joinStream = () => {
        navigate("/stream", { state: { isBroadcaster: false, roomId: room } }); // 방송 보기 시 StreamPage로 이동
    };

    return (
        <div className="room">
            <div>
                <h3>Live Stream</h3>                
                {room ? (
                    <button onClick={joinStream}>방송 보기</button> // 방송 보기 버튼
                ) : (
                    <p>방송 중인 사람이 없습니다.</p>
                )}
                <button onClick={startBroadcasting}>Start Broadcasting</button>
            </div>
        </div>
    );
};

export default RoomPage;
