// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
// import { useConnection, useWallet } from '@solana/wallet-adapter-react';
// import { PublicKey } from '@solana/web3.js';
// import React, { FC, useCallback, useState } from 'react';

// export const GetAccountData: FC = () => {
//     const { connection } = useConnection();
//     const { publicKey } = useWallet();
//     const [accountData, setAccountData] = useState<Buffer | null>(null);

//     const programId = new PublicKey('YourProgramPublicKeyHere'); // Replace with the Program ID you're calling
//     const accountPublicKey = new PublicKey('AccountPublicKeyHere'); // Replace with the account public key you want to query

//     const fetchData = useCallback(async () => {
//         if (!publicKey) throw new WalletNotConnectedError();

//         // Fetch the account info
//         const accountInfo = await connection.getAccountInfo(accountPublicKey);

//         if (accountInfo) {
//             // Here, accountInfo.data is the raw data in the account
//             setAccountData(accountInfo.data);
//         } else {
//             console.log("Account not found");
//         }
//     }, [publicKey, connection]);

//     return (
//         <div>
//             <button onClick={fetchData} disabled={!publicKey}>
//                 Fetch Account Data
//             </button>
//             {accountData && <pre>{accountData.toString('hex')}</pre>}
//         </div>
//     );
// };



// import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
// import { useConnection, useWallet } from '@solana/wallet-adapter-react';
// import { PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
// import React, { FC, useCallback } from 'react';

// export const CallProgramFunction: FC = () => {
//     const { connection } = useConnection();
//     const { publicKey, sendTransaction } = useWallet();

//     const programId = new PublicKey('YourProgramPublicKeyHere'); // Replace with the Program ID you're calling
//     const targetAccountPublicKey = new PublicKey('AccountPublicKeyHere'); // The account you're interacting with

//     const callFunction = useCallback(async () => {
//         if (!publicKey) throw new WalletNotConnectedError();

//         // Create the instruction to send to the program
//         const instruction = new TransactionInstruction({
//             keys: [
//                 { pubkey: publicKey, isSigner: true, isWritable: true }, // Your wallet account
//                 { pubkey: targetAccountPublicKey, isSigner: false, isWritable: true } // Target account
//             ],
//             programId, // The program you're calling
//             data: Buffer.alloc(0), // Add any required input data here in the right format
//         });

//         // Create a transaction and add the instruction
//         const transaction = new Transaction().add(instruction);

//         // Send the transaction
//         const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } = await connection.getLatestBlockhashAndContext();
//         const signature = await sendTransaction(transaction, connection, { minContextSlot });

//         // Confirm the transaction
//         await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });

//         console.log('Transaction sent:', signature);
//     }, [publicKey, sendTransaction, connection, programId, targetAccountPublicKey]);

//     return (
//         <button onClick={callFunction} disabled={!publicKey}>
//             Call Program Function
//         </button>
//     );
// };
