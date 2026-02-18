import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import AOS from "aos";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/ThemeContext";
import { LanguageProvider } from "@/lib/LanguageContext";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import { PageEntrance } from "@/components/ui/PageEntrance";
import Dashboard from "@/pages/Dashboard";
import Courses from "@/pages/Courses";
import CourseDetails from "@/pages/CourseDetails";
import AcademicHistory from "@/pages/AcademicHistory";
import Planner from "@/pages/Planner";
import AICoach from "@/pages/AICoach";
import Analytics from "@/pages/Analytics";
import StudyTools from "@/pages/StudyTools";
import Notes from "@/pages/Notes";
import SubjectTree from "@/pages/SubjectTree";
import VoiceToText from "@/pages/VoiceToText";
import VideoTranslate from "@/pages/VideoTranslate";
import ReadTexts from "@/pages/ReadTexts";
import TextToVideo from "@/pages/TextToVideo";
import TextToImages from "@/pages/TextToImages";
import Presentations from "@/pages/Presentations";
import Infographics from "@/pages/Infographics";
import Theses from "@/pages/Theses";
import UserGuide from "@/pages/UserGuide";
import CodeEditor from "@/pages/CodeEditor";
import AdminPanel from "@/pages/AdminPanel";
import Settings from "@/pages/Settings";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">Uni</div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AOSRefresh() {
  const { pathname } = useLocation();
  useEffect(() => {
    AOS.init({ duration: 600, once: false, offset: 50 });
  }, []);
  useEffect(() => {
    AOS.refresh();
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">Uni</div>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <PageEntrance pathname="/"><LandingPage /></PageEntrance>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><AppLayout><Courses /></AppLayout></ProtectedRoute>} />
      <Route path="/academic-history" element={<ProtectedRoute><AppLayout><AcademicHistory /></AppLayout></ProtectedRoute>} />
      <Route path="/courses/:courseId" element={<ProtectedRoute><AppLayout><CourseDetails /></AppLayout></ProtectedRoute>} />
      <Route path="/planner" element={<ProtectedRoute><AppLayout><Planner /></AppLayout></ProtectedRoute>} />
      <Route path="/ai-coach" element={<ProtectedRoute><AppLayout><AICoach /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
      <Route path="/study-tools" element={<ProtectedRoute><AppLayout><StudyTools /></AppLayout></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><AppLayout><Notes /></AppLayout></ProtectedRoute>} />
      <Route path="/subject-tree" element={<ProtectedRoute><AppLayout><SubjectTree /></AppLayout></ProtectedRoute>} />
      <Route path="/voice-to-text" element={<ProtectedRoute><AppLayout><VoiceToText /></AppLayout></ProtectedRoute>} />
      <Route path="/translate-video" element={<ProtectedRoute><AppLayout><VideoTranslate /></AppLayout></ProtectedRoute>} />
      <Route path="/read-texts" element={<ProtectedRoute><AppLayout><ReadTexts /></AppLayout></ProtectedRoute>} />
      <Route path="/text-to-video" element={<ProtectedRoute><AppLayout><TextToVideo /></AppLayout></ProtectedRoute>} />
      <Route path="/text-to-images" element={<ProtectedRoute><AppLayout><TextToImages /></AppLayout></ProtectedRoute>} />
      <Route path="/presentations" element={<ProtectedRoute><AppLayout><Presentations /></AppLayout></ProtectedRoute>} />
      <Route path="/infographics" element={<ProtectedRoute><AppLayout><Infographics /></AppLayout></ProtectedRoute>} />
      <Route path="/theses" element={<ProtectedRoute><AppLayout><Theses /></AppLayout></ProtectedRoute>} />
      <Route path="/user-guide" element={<ProtectedRoute><AppLayout><UserGuide /></AppLayout></ProtectedRoute>} />
      <Route path="/code-editor" element={<ProtectedRoute><AppLayout><CodeEditor /></AppLayout></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminRoute><AppLayout><AdminPanel /></AppLayout></AdminRoute></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AuthProvider>
            <AOSRefresh />
            <AppRoutes />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
