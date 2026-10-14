import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
export const metadata:Metadata={
  metadataBase:new URL('https://stay.frankiflow.de'),
  title:'FrankiHolz | Private stays, thoughtfully hosted in Frankfurt',
  description:'Discover private rooms in Frankfurt-Sachsenhausen. Explore amenities, availability, reviews and book your stay directly at FrankiHolz.',
  openGraph:{title:'FrankiHolz — Your stay in Frankfurt',description:'A calmer way to stay in Frankfurt.',type:'website'},
  robots:{index:true,follow:true}
};
export const viewport:Viewport={themeColor:'#0c3447',width:'device-width',initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Script src="/assets/config.js" strategy="beforeInteractive"/>{children}</body></html>;
}
