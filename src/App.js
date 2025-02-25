import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from "./component/common/Navbar";
import RoomPage from './component/pages/RoomPage';
import WebRTCBroadcaster from './component/pages/WebRTCBroadcaster';
import RegisterPage from './component/pages/RegisterPage';
import LoginPage from './component/pages/LoginPage';
import WebRTCHlsViewPage from './component/pages/WebRTCHlsViewPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path='/room' element={<RoomPage />} />
        <Route path='/room/:roomId' element={<WebRTCBroadcaster />} />
        <Route path='/view/:streamId' element={<WebRTCHlsViewPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
