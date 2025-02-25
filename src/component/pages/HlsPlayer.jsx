import React, { useRef, useEffect } from 'react';
import Hls from 'hls.js';

const HlsPlayer = ({ hlsUrl }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (Hls.isSupported() && videoRef.current) {
            const hls = new Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoRef.current.play();
            });
            console.log(hls);
            return () => {
                hls.destroy();
            };
        } else if (videoRef.current && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = hlsUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
                videoRef.current.play();
            });
        }
    }, [hlsUrl]);

    return (
        <video ref={videoRef} controls muted style={{ width: '400px' }} />
    );
};

export default HlsPlayer;