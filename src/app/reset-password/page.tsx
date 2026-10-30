import { RecoveryScreen } from '@/components/recovery-screen';
export const metadata = { title: 'Choose a new password', referrer: 'no-referrer' as const };
export default function ResetPasswordPage() { return <RecoveryScreen mode="reset"/>; }
