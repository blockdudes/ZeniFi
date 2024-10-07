import { Inter } from "next/font/google";
import StoreProvider from "@/lib/StoreProvider";
import "./globals.css";
import Header from "@/components/Header";
import { Toaster } from 'react-hot-toast';
import { ThirdwebProvider } from "thirdweb/react";
import AppWalletProvider from "@/components/providers/AppWalletProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Lunex",
  description: "Lunex Leverage Trading Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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