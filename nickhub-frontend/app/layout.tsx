import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
const inter=Inter({subsets:["latin"],variable:"--font-inter",display:"swap"});
export const metadata:Metadata={title:"NickHub | Music Distribution for Independent Artists",description:"Distribute music worldwide, keep 100% of your royalties, and grow with transparent analytics."};
export default function RootLayout({children}:LayoutProps<"/">){return <html lang="en" className={inter.variable}><body>{children}</body></html>}
