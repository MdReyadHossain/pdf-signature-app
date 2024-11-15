import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AdminPanel from '../components/AdminPanel';
import UserPanel from '../components/UserPanel';
import { useState } from 'react';

const AppRouter = () => {
    const [pdfFile, setPdfFile] = useState<File | string>();
    return (
        <Router>
            <Routes>
                <Route path="/admin" element={<AdminPanel handleSendToUser={(file) => setPdfFile(file)} />} />
                <Route path="/user" element={<UserPanel pdfFile={pdfFile as File} />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;
