import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from "./component/common/Navbar";
import WebRTCP2PRoomPage from './component/pages/WebRTCP2PRoomPage';
import WebRTCSFURoomPage from './component/pages/WebRTCSFURoomPage';
import WebRTCAMSBroadcasterPage from './component/pages/WebRTCAMSBroadcasterPage';
import RegisterPage from './component/pages/RegisterPage';
import LoginPage from './component/pages/LoginPage';
import WebRTCAMSStreamPage from './component/pages/WebRTCAMSStreamPage';
import RTMPHlsViewPage from './component/pages/RTMPHlsViewPage';
import WebRTCP2PStreamPage from './component/pages/WebRTCP2PStreamPage';
import WebRTCSFUStreamPage from './component/pages/WebRTCSFUStreamPage';

import BroadcasterPage from "./component/pages/BroadcasterPage";
import ViewerPage from "./component/pages/ViewerPage";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path='/webrtc-p2p' element={<WebRTCP2PRoomPage />} />
        <Route path='/webrtc-p2p/:roomId' element={<WebRTCP2PStreamPage />} />

        <Route path='/webrtc-sfu' element={<WebRTCSFURoomPage />} />
        <Route path='/webrtc-sfu/:roomId' element={<WebRTCSFUStreamPage />} />

        <Route path='/webrtc-ams/broad/:broadId' element={<WebRTCAMSBroadcasterPage />} />
        <Route path='/webrtc-ams/stream/:streamId' element={<WebRTCAMSStreamPage />} />

        <Route path='/stream/:streamId' element={<RTMPHlsViewPage />} />

        <Route path='/register' element={<RegisterPage />} />
        <Route path='/login' element={<LoginPage />} />

        <Route path="/broadcast/:roomId" element={<BroadcasterPage />} />
        <Route path="/view/:roomId" element={<ViewerPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
