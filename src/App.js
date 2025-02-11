import './App.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import RoomPage from './component/pages/RoomPage';
import StreamPage from './component/pages/StreamPage';

function App() {
  return (
    <BrowserRouter>      
      <Routes>
        <Route path='/room' element={<RoomPage/>}/>
        <Route path='/stream' element={<StreamPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
