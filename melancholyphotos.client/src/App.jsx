import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Gallery from './pages/gallery';
import Home from './pages/home';
import NoPage from './pages/nopage';

function App() {

    return (
        <Router>
            <Routes>
                <Route index element={<Home />} />
                <Route path="/home" element={<Home />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="*" element={<NoPage />} />
            </Routes>
        </Router>
    );
    
}

export default App;