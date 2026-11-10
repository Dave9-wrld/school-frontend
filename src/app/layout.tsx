import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import './globals.css';
import './campus-theme.css';
import './workspace.css';

export const metadata: Metadata = {
  title: {default: 'Dave University — Your next chapter', template: '%s | Dave University'},
  description: 'Your academic life, beautifully connected. The Dave University portal for students, lecturers and administrators.',
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
