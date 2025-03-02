import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import HlsPlayer from './HlsPlayer.jsx';
import ApiService from "../../service/ApiService";

const RTMPHlsViewPage = () => {
  const { streamId } = useParams();
  const [hlsUrl, setHlsUrl] = useState("");

  useEffect(() => {
      const fetchHlsUrl = async () => {
        try {
          const response = await ApiService.getRTMPHlsUrl(streamId);
          console.log(response);
          setHlsUrl(response);
        } catch (error) {
          console.error("HLS URL 가져오기 실패:", error);
        }
      };

      fetchHlsUrl();
    }, []);

  return (
    <div>
      <h1>HLS 스트림 플레이어</h1>
      {hlsUrl ? <HlsPlayer hlsUrl={hlsUrl} /> : <p>스트림이 없습니다.</p>}
    </div>
  );
};

export default RTMPHlsViewPage;
