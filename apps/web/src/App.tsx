import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HomeLoggedIn from './pages/HomeLoggedIn';
import Login from './pages/Login';
import Connect from './pages/Connect';
import SelectDifficulty from './pages/SelectDifficulty';
import SelectIngredient from './pages/SelectIngredient/SelectIngredient';
import Game from './pages/Game/Game';
import Result from './pages/Result/Result';
import Profile from './pages/Profile';
import SoupHistory from './pages/SoupHistory';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home-logged-in" element={<HomeLoggedIn />} />
        <Route path="/login" element={<Login />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/difficulty" element={<SelectDifficulty />} />
        <Route path="/select" element={<SelectIngredient />} />
        <Route path="/game" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/soup-history" element={<SoupHistory />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
