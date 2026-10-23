import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://stay.frankiflow.de'),
  title: { default:'FrankiHolz | Your stay in Frankfurt', template:'%s | FrankiHolz' },
  description: 'Personally hosted private rooms in Frankfurt-Sachsenhausen. Explore the rooms, check availability and request your stay directly.',
  openGraph: { title:'FrankiHolz — Your stay in Frankfurt', description:'Private rooms. A personal welcome. Your own pace.', type:'website', images:['/assets/frankiholz-logo-for-dark.png'] },
  icons: { icon:'/assets/frankiholz-favicon.svg' },
  // v2 is an isolated, unpublished release candidate.
  robots: { index:false, follow:false },
};
export const viewport: Viewport = {themeColor:'#0c3447',width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Script src="/assets/config.js" strategy="beforeInteractive"/>{children}</body></html>;
}
