import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from "./component/common/Navbar";
import WebRTCP2PRoomPage from './component/pages/WebRTCP2PRoomPage';
import WebRTCSFURoomPage from './component/pages/WebRTCSFURoomPage';
import WebRTCBroadcaster from './component/pages/WebRTCBroadcaster';
import RegisterPage from './component/pages/RegisterPage';
import LoginPage from './component/pages/LoginPage';
import WebRTCHlsViewPage from './component/pages/WebRTCHlsViewPage';
import RTMPHlsViewPage from './component/pages/RTMPHlsViewPage';
import WebRTCP2PStreamPage from './component/pages/WebRTCP2PStreamPage';
import WebRTCSFUStreamPage from './component/pages/WebRTCSFUStreamPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path='/webrtc-p2p' element={<WebRTCP2PRoomPage />} />
        <Route path='/webrtc-sfu' element={<WebRTCSFURoomPage />} />
        <Route path='/webrtc-p2p/:roomId' element={<WebRTCP2PStreamPage />} />
        <Route path='/webrtc-sfu/:roomId' element={<WebRTCSFUStreamPage />} />
        <Route path='/room/:roomId' element={<WebRTCBroadcaster />} />
        <Route path='/view/:streamId' element={<WebRTCHlsViewPage />} />
        <Route path='/stream/:streamId' element={<RTMPHlsViewPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
