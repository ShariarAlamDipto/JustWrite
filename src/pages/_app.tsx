import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/next';
import '../styles/globals.css';
import { AuthProvider } from '@/lib/useAuth';
import { ThemeProvider } from '@/lib/ThemeContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>JustWrite</title>
        {/* Load Times New Roman as fallback, system fonts */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Prevent flash of wrong theme */
          html { background: #0a0a0a; }
          html[data-theme="light"] { background: #ffffff; }
        `}</style>
      </Head>
      <ThemeProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </ThemeProvider>
      <Analytics />
    </>
  );
}
