import { fileURLToPath } from 'node:url';
/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: { root:fileURLToPath(new URL('.',import.meta.url)) },
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async redirects() {
    return [
      ['/index.html','/'], ['/admin.html','/admin'],
      ['/booking-status.html','/booking-status'], ['/payment.html','/payment'],
      ['/payment-success.html','/payment-success'],
      ['/imprint.html','/impressum'], ['/privacy.html','/datenschutz'],
      ['/imprint','/impressum'], ['/privacy','/datenschutz'],
      ['/en','/?lang=en'], ['/de','/?lang=de'],
    ].map(([source,destination])=>({source,destination,permanent:false}));
  },
  async headers() {
    return [{source:'/:path*',headers:[
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'X-Robots-Tag',value:'noindex, nofollow'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    ]}];
  },
};
export default config;
