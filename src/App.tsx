import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import TripsPage from "./pages/TripsPage";
import TripPage from "./pages/TripPage";
import InvitePage from "./pages/InvitePage";

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TripsPage />} />
        <Route path="/trip/:tripId" element={<TripPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
