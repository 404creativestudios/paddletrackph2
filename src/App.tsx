import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import MobileAppLayout from "./components/MobileAppLayout";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ProfileSetup from "./pages/ProfileSetup";
import StartGame from "./pages/StartGame";
import ScheduleGame from "./pages/ScheduleGame";
import LobbyDetail from "./pages/LobbyDetail";
import GameHistory from "./pages/GameHistory";
import SkillAssessment from "./pages/SkillAssessment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Unauthenticated routes - web style */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Authenticated routes - mobile app style */}
            <Route element={<MobileAppLayout />}>
              <Route path="/home" element={<Index />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/start-game" element={<StartGame />} />
              <Route path="/schedule-game" element={<ScheduleGame />} />
              <Route path="/lobby/:lobbyId" element={<LobbyDetail />} />
              <Route path="/history" element={<GameHistory />} />
              <Route path="/skill-assessment" element={<SkillAssessment />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
