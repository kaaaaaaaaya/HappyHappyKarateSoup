import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Connect from './pages/Connect';
import SelectIngredient from './pages/SelectIngredient';
import Game from './pages/Game/Game';
import Result from './pages/Result/Result';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/select" element={<SelectIngredient />} />
        <Route path="/game" element={<Game />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
