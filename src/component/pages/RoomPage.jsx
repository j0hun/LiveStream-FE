import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ApiService from "../../service/ApiService";

const RoomPage = () => {
    const [room, setRoom] = useState([]);
    const navigate = useNavigate();

    const fetchRoom = async () => {
        try {
            const response = await ApiService.getAllRooms();
            console.log(response);
            setRoom(response.data);
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        fetchRoom();        
    }, []);

    const startBroadcasting = async () => {
        try {
            const response = await ApiService.addRoom();
            console.log(response.data);
            const id = response.data;
            navigate(`/room/${id}`)
        } catch (error) {
            console.log(error);
        }
    };

    const joinStream = (id) => {
        navigate(`/room/${id}`);
    };

    return (
        <div className="room">
            <div>
                <h3>Live Stream</h3>
                {room.length === 0 ? (
                    <p>방송 중인 사람이 없습니다.</p>
                ) : (
                    <ul>
                        {room.map((item) => (
                            <li key={item.id}>
                                <button onClick={() => joinStream(item.id)}>방송보기</button>
                            </li>
                        ))}
                    </ul>
                )}
                <button onClick={startBroadcasting}>Start Broadcasting</button>
            </div>
        </div>
    );
};

export default RoomPage;
