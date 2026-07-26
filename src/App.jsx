import { useApp } from './context/AppContext';
import Splash from './components/Splash';
import PINLock from './components/PINLock';
import HomeDashboard from './components/HomeDashboard';
import CashEntry from './components/CashEntry';
import DigitalEntry from './components/DigitalEntry';
import CreditEntry from './components/CreditEntry';
import ExpenseEntry from './components/ExpenseEntry';
import ClinicalEntry from './components/ClinicalEntry';
import TargetEntry from './components/TargetEntry';
import SummaryScreen from './components/SummaryScreen';
import HistoryScreen from './components/HistoryScreen';
import UdhaarScreen from './components/UdhaarScreen';
import UdhaarDetail from './components/UdhaarDetail';
import MonthlyReport from './components/MonthlyReport';
import SettingsScreen from './components/SettingsScreen';
import Toast from './components/Toast';

const SCREENS = {
  splash:   Splash,
  lock:     PINLock,
  home:     HomeDashboard,
  cash:     CashEntry,
  digital:  DigitalEntry,
  credit:   CreditEntry,
  expense:  ExpenseEntry,
  clinical: ClinicalEntry,
  target:   TargetEntry,
  summary:  SummaryScreen,
  history:  HistoryScreen,
  udhaar:        UdhaarScreen,
  udhaar_detail: UdhaarDetail,
  monthly:       MonthlyReport,
  settings: SettingsScreen,
};

export default function App() {
  const { state } = useApp();
  const Screen = SCREENS[state.page] || HomeDashboard;

  return (
    <div className="w-full min-h-dvh bg-mesh">
      <Screen />
      <Toast />
    </div>
  );
}
