import { Inter } from "next/font/google";
import StoreProvider from "@/lib/StoreProvider";
import "./globals.css";
import Header from "@/components/Header";
import { Toaster } from 'react-hot-toast';
import { ThirdwebProvider } from "thirdweb/react";
import AppWalletProvider from "@/components/providers/AppWalletProvider";
import Head from 'next/head';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ZeniFi",
  description: "ZeniFi Leverage Trading Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <Head>
        <link rel="shortcut icon" href="./favicon.ico" />
      </Head>
      <body className={inter.className}>
        <ThirdwebProvider>
          <StoreProvider>
            <AppWalletProvider>
              <div>
                <Header />
                <Toaster />
                {children}
              </div>
            </AppWalletProvider>
          </StoreProvider>
        </ThirdwebProvider>
      </body>
    </html>
  );
}