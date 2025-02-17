import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from "./component/common/Navbar";
import RoomPage from './component/pages/RoomPage';
import WebRTCSFUStreamPage from './component/pages/WebRTCSFUStreamPage';
import RegisterPage from './component/pages/RegisterPage';
import LoginPage from './component/pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path='/room' element={<RoomPage />} />
        <Route path='/room/:roomId' element={<WebRTCSFUStreamPage />} />
        <Route path='/register' element={<RegisterPage />} />
        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
