import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AdminPanel from '../components/AdminPanel';
import UserPanel from '../components/UserPanel';
import { useState } from 'react';
import TestPanel from '../components/TestPanel';

const AppRouter = () => {
    const [pdfFile, setPdfFile] = useState<File | string>();
    return (
        <Router>
            <Routes>
                <Route path="/admin" element={<AdminPanel handleSendToUser={(file) => setPdfFile(file)} />} />
                <Route path="/user" element={<UserPanel pdfFile={pdfFile as File} />} />
                <Route path="/test" element={<TestPanel />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;
