import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './context/AuthContext.jsx'

import MobileLayout from './components/layout/MobileLayout.jsx'
import AdminLayout from './components/admin/AdminLayout.jsx'
import BackendStatus from './components/ui/BackendStatus.jsx'

// Mobile screens
import SplashScreen from './screens/SplashScreen.jsx'
import OnboardingScreen from './screens/OnboardingScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import RegisterScreen from './screens/RegisterScreen.jsx'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen.jsx'
import HomeScreen from './screens/HomeScreen.jsx'
import PatientsScreen from './screens/PatientsScreen.jsx'
import PatientProfileScreen from './screens/PatientProfileScreen.jsx'
import ScreenMenuScreen from './screens/ScreenMenuScreen.jsx'
import AntenatalScreen from './screens/AntenatalScreen.jsx'
import RiskResultScreen from './screens/RiskResultScreen.jsx'
import NutriCheckScreen from './screens/NutriCheckScreen.jsx'
import SickleCellScreen from './screens/SickleCellScreen.jsx'
import ReferralsScreen from './screens/ReferralsScreen.jsx'
import ReportsScreen from './screens/ReportsScreen.jsx'
import MoreScreen from './screens/MoreScreen.jsx'
import NotificationsScreen from './screens/NotificationsScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import PreferencesScreen from './screens/PreferencesScreen.jsx'
import OfflineSyncScreen from './screens/OfflineSyncScreen.jsx'
import AboutScreen from './screens/AboutScreen.jsx'
import LeaderboardScreen from './screens/LeaderboardScreen.jsx'

import NewReferralScreen from './screens/NewReferralScreen.jsx'

// Admin pages
import AdminLogin from './admin/AdminLogin.jsx'
import AdminMainDashboard from './admin/AdminMainDashboard.jsx'
import AdminDatasetManager from './admin/AdminDatasetManager.jsx'
import AdminDatasetDetail from './admin/AdminDatasetDetail.jsx'
import AdminModelManager from './admin/AdminModelManager.jsx'
import AdminTrainingLab from './admin/AdminTrainingLab.jsx'
import AdminAllChws from './admin/AdminAllChws.jsx'
import AdminAllReferrals from './admin/AdminAllReferrals.jsx'
import AdminAlerts from './admin/AdminAlerts.jsx'
import AdminAntenatalReports from './admin/AdminAntenatalReports.jsx'
import AdminNutriCheckReports from './admin/AdminNutriCheckReports.jsx'
import AdminSickleReports from './admin/AdminSickleReports.jsx'
import AdminBroadcast from './admin/AdminBroadcast.jsx'
import AdminNationalMap from './admin/AdminNationalMap.jsx'
import AdminLeaderboard from './admin/AdminLeaderboard.jsx'
import AdminCompounds from './admin/AdminCompounds.jsx'
import AdminPerformance from './admin/AdminPerformance.jsx'
import AdminNotifications from './admin/AdminNotifications.jsx'
import AdminExports from './admin/AdminExports.jsx'
import AdminSettings from './admin/AdminSettings.jsx'
import AdminUsers from './admin/AdminUsers.jsx'
import AdminAuditLog from './admin/AdminAuditLog.jsx'

function RequireChw({ children }) {
  const { user } = useAuth()
  if (!user || user.kind !== 'chw') return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!user || user.kind !== 'admin') return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  const location = useLocation()
  return (
    <>
      <BackendStatus />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot" element={<ForgotPasswordScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />

        {/* Mobile CHW app */}
        <Route element={<RequireChw><MobileLayout /></RequireChw>}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/patients" element={<PatientsScreen />} />
          <Route path="/patients/:id" element={<PatientProfileScreen />} />
          <Route path="/screen" element={<ScreenMenuScreen />} />
          <Route path="/screen/antenatal" element={<AntenatalScreen />} />
          <Route path="/screen/antenatal/result" element={<RiskResultScreen />} />
          <Route path="/screen/nutricheck" element={<NutriCheckScreen />} />
          <Route path="/screen/sickle" element={<SickleCellScreen />} />
          <Route path="/referrals" element={<ReferralsScreen />} />
          <Route path="/referral/new/:patientId" element={<NewReferralScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/preferences" element={<PreferencesScreen />} />
          <Route path="/offline-sync" element={<OfflineSyncScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
        </Route>

        {/* Admin portal */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route path="/admin" element={<AdminMainDashboard />} />
          <Route path="/admin/map" element={<AdminNationalMap />} />
          <Route path="/admin/antenatal" element={<AdminAntenatalReports />} />
          <Route path="/admin/nutricheck" element={<AdminNutriCheckReports />} />
          <Route path="/admin/sickle" element={<AdminSickleReports />} />
          <Route path="/admin/referrals" element={<AdminAllReferrals />} />
          <Route path="/admin/alerts" element={<AdminAlerts />} />
          <Route path="/admin/chws" element={<AdminAllChws />} />
          <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
          <Route path="/admin/compounds" element={<AdminCompounds />} />
          <Route path="/admin/broadcast" element={<AdminBroadcast />} />
          <Route path="/admin/datasets" element={<AdminDatasetManager />} />
          <Route path="/admin/datasets/:id" element={<AdminDatasetDetail />} />
          <Route path="/admin/models" element={<AdminModelManager />} />
          <Route path="/admin/training" element={<AdminTrainingLab />} />
          <Route path="/admin/performance" element={<AdminPerformance />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/exports" element={<AdminExports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/audit" element={<AdminAuditLog />} />
          <Route path="/admin/profile" element={<ProfileScreen />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
    </>
  )
}
