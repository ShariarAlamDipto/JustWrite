import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider } from '@/lib/useAuth';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>JustWrite</title>
      </Head>
      <AuthProvider>
        <div className="container">
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    </>
  );
}
