"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';


const Header = () => {
    const [activeButton, setActiveButton] = useState(null);

    const handleButtonClick = (buttonName) => {
        setActiveButton(buttonName);
    };

    return (
        <div className="pt-4 px-4 flex items-center justify-between fixed w-full shadow-sm z-20">
            <div>
                <Link href="/dashboard">
                    <h1 className="text-3xl font-bold px-5"><span className='text-yellow-400'>Lunex</span></h1>
                </Link>
            </div>
            <div className='flex justify-center'>
                <Link href="/dashboard">
                    <button type="button" onClick={() => handleButtonClick('dashboard')}
                        className={`font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 hover:text-yellow-400 ${activeButton === 'dashboard' ? 'text-yellow-400' : 'text-white'}`}>
                        Dashboard
                    </button>
                </Link>
                <Link href="/exchange">
                    <button type="button" onClick={() => handleButtonClick('exchange')}
                        className={`font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 hover:text-yellow-400 ${activeButton === 'exchange' ? 'text-yellow-400' : 'text-white'}`}>Exchange
                    </button>
                </Link>
            </div>
            <div className="flex items-center">
                <WalletMultiButton />
            </div>
        </div>
    )
}

export default Header;
