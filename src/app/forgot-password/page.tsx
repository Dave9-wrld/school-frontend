import { RecoveryScreen } from '@/components/recovery-screen';
export const metadata = { title: 'Forgot password', referrer: 'no-referrer' as const };
export default function ForgotPasswordPage() { return <RecoveryScreen mode="request"/>; }
