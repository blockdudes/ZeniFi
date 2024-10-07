"use client";
import React, { useEffect, useState } from "react";
import TokenSelectorMenu from "./TokenSelectorMenu";
import { useDispatch } from "react-redux";
import { addBalance, fetchUserData } from "@/lib/features/userDataInteractSlice";
import { LEVERAGE_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } from "@/utils/constant";
import { leverageContractABI } from "../abis/leverageContractAbi";
import { TokenContractABI } from "../abis/TokenContractABI";
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { PublicKey } from '@solana/web3.js';
import * as solanaWeb3 from '@solana/web3.js';
import { useCallback } from "react";
import bs58 from "bs58";
import * as borsh from '@coral-xyz/borsh'
import tokenIdl from "./token_idl.json"
import leverageIdl from "./darkpool_idl.json"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import {
  Program,
  Idl,
  AnchorProvider,
  setProvider,
  BN,
  web3
} from "@coral-xyz/anchor"

import { sendAndConfirmTransaction } from "@solana/web3.js";
import { clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { createAssociatedTokenAccountInstruction, createInitializeMintInstruction, createMint, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, getOrCreateAssociatedTokenAccount, MINT_SIZE, MintLayout, mintTo, Token } from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { leverage_public_key, mint_public_key, user_token_ATA, vault_token_ATA, version } from "@/constant/constant";


const FormButtons = () => {
  const [activeForm, setActiveForm] = useState("");
  const [tokenAddress, setTokenAddress] = useState(null);
  const [amount, setAmount] = useState(null);
  const [success, setSuccess] = useState(false);
  const dispatch = useDispatch();
  const { publicKey, sendTransaction } = useWallet();
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [loadingBorrow, setLoadingBorrow] = useState(false);
  const [loadingRepay, setLoadingRepay] = useState(false);
  const [loadingGetUsdc, setLoadingGetUsdc] = useState(false);

  const handleButtonClick = (formName) => {
    setActiveForm(formName);
  };


  const programId = new PublicKey('6HEsfvvUtEDgpu3214E4Chf9boYX28WJ8spbpvsvZDZJ');
  const leverageProgramId = new PublicKey('5FPrCjrhxkfm8dR79gPrCfYVYuJ7iUdpdZLLUMtZUwXR');


  const secretKeyBase58 = process.env.NEXT_PUBLIC_AUTH_MINT;
  const secretKeyUint8Array = bs58.decode(secretKeyBase58);
  const keypair = solanaWeb3.Keypair.fromSecretKey(secretKeyUint8Array);

  const wallet = useAnchorWallet()
  const connection = new solanaWeb3.Connection(clusterApiUrl("devnet"), "confirmed");
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" })
  setProvider(provider)


  function getKeypairFromSecretKey(secretKeyArray) {
    const secretKey = new Uint8Array(JSON.parse(secretKeyArray));
    return web3.Keypair.fromSecretKey(secretKey);
  }

  const mintKeypair = getKeypairFromSecretKey(process.env.NEXT_PUBLIC_MINT_SECRET_KEY)
  const levrageAccount = getKeypairFromSecretKey(process.env.NEXT_PUBLIC_LEVERAGE_SECRET_KEY)
  const mintInfoKeypair = getKeypairFromSecretKey(process.env.NEXT_PUBLIC_MINT_INFO_SECRET_KEY)


  useEffect(() => {
    handleGetBalance()
  }, [wallet, leverageProgramId])

  const handleGetBalance = async () => {
    try {

      if (!wallet || !wallet.publicKey) {
        console.error("Wallet or wallet.publicKey is undefined.");
        return;
      }
      const new_program = new Program(leverageIdl, provider);
      const pda = PublicKey.findProgramAddressSync([Buffer.from("user_balance"), wallet.publicKey.toBuffer()], leverageProgramId);

      const userBalance = await new_program.account.userBalance.fetch(new PublicKey(pda[0]));
      console.log({ native: userBalance.nativeBalance, fungible: userBalance.fungibleBalance })
      dispatch(addBalance({ native: userBalance.nativeBalance, fungible: userBalance.fungibleBalance }))
    } catch (error) {
      console.log(error)
    }
  }

  const handleGetOrders = async () => {
    try {

      if (!wallet || !wallet.publicKey) {
        console.error("Wallet or wallet.publicKey is undefined.");
        return;
      }

      const new_program = new Program(leverageIdl, provider);
      // const pda = PublicKey.findProgramAddressSync([Buffer wallet.publicKey.toBuffer()], leverageProgramId);

      // const userBalance = await new_program.account.userBalance.fetch(new PublicKey(pda[0]));
      const userBalance = await new_program.account.getUserOrderState.fetch(new PublicKey(pda[0]));
      dispatch(addBalance({ native: userBalance.nativeBalance, fungible: userBalance.fungibleBalance }))
    } catch (error) {
      console.log(error)
    }
  }

  const handleGetUsdc = async () => {
    try {

      if (!wallet || !wallet.publicKey) {
        console.error("Wallet or wallet.publicKey is undefined.");
        return;
      }
      setLoadingGetUsdc(true);
      const program = new Program(tokenIdl, provider);
      const newMintKeypair = new solanaWeb3.Keypair();
      console.log(mintKeypair, newMintKeypair)

      let localUserTokenAccount = localStorage.getItem('userTokenAccount') && new PublicKey(JSON.parse(localStorage.getItem('userTokenAccount')))
      if (!localUserTokenAccount) {


        // const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        // const createMintInfoIx = web3.SystemProgram.createAccount({
        //   fromPubkey: wallet.publicKey,
        //   newAccountPubkey: mintKeypair.publicKey,
        //   space: MINT_SIZE,
        //   lamports: mintRent,
        //   programId: TOKEN_PROGRAM_ID,  // Ensure this is the correct program ID
        // });

        // const initializeMint_Tx = await createInitializeMintInstruction(
        //   mintKeypair.publicKey,
        //   9,
        //   wallet.publicKey,
        //   wallet.publicKey,
        // );

        // const transaction = new web3.Transaction().add(createMintInfoIx, initializeMint_Tx)
        // const signature = await provider.sendAndConfirm(transaction, [mintKeypair]);

        // Ensure the userTokenAccount is writable
        const userTokenAccount = await getAssociatedTokenAddress(
          mintKeypair.publicKey,
          wallet.publicKey
        );

        console.log(userTokenAccount.toString())

        const createAtaIx = createAssociatedTokenAccountInstruction(
          wallet.publicKey,  // payer
          userTokenAccount,           // ata
          wallet.publicKey,  // owner
          mintKeypair.publicKey       // mint
        );

        const tx = new web3.Transaction().add(createAtaIx)
        const signer = await provider.sendAndConfirm(tx)

        localUserTokenAccount = userTokenAccount;
        localStorage.setItem('userTokenAccount', JSON.stringify(userTokenAccount))
      }

      // console.log("minting")

      const mintToUserIx = await program.methods.mintTokens(new BN(1000000000000000))
        .accounts({
          user: keypair.publicKey,
          mint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenAccount: localUserTokenAccount,
        })
        .signers([keypair])
        .rpc();

    } catch (error) {
      toast.error(error.message)
      throw error;
    } finally {
      setLoadingGetUsdc(false);
    }

  }

  const handleMint = useCallback(async (amount) => {
    try {
      if (!wallet || !wallet.publicKey) {
        console.error("Wallet or wallet.publicKey is undefined.");
        return;
      }

      const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
      const mintKeypair = new solanaWeb3.Keypair();

      // Ensure the program is correctly initialized with the expected program ID
      const program = new Program(tokenIdl, provider);

      // Additional debug information
      console.log("Program ID:", program.programId.toString());

      const mintRent = await connection.getMinimumBalanceForRentExemption(82);
      const createMintAccountIx = web3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,  // Ensure this is the correct program ID
      });

      // Initialize mint instruction
      const initializeMintIx = await createInitializeMintInstruction(
        mintKeypair.publicKey,
        0,
        wallet.publicKey,
        wallet.publicKey,
        TOKEN_PROGRAM_ID
      );

      // Ensure the userTokenAccount is writable
      const userTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey
      );

      const createAtaIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey,  // payer
        userTokenAccount,           // ata
        wallet.publicKey,  // owner
        mintKeypair.publicKey       // mint
      );

      const tx = await program.methods.mintTokens(new BN(9))
        .accounts({
          user: wallet.publicKey,
          mint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenAccount: userTokenAccount,
        })
        .signers(mintKeypair ? [mintKeypair] : [])
        .instruction()

      const transaction = new web3.Transaction().add(
        createMintAccountIx,
        initializeMintIx,
        createAtaIx,
        tx
      );

      // Sign and send the transaction
      const signature = await provider.sendAndConfirm(transaction, [mintKeypair]);
      console.log("Mint and ATA created successfully. Signature:", signature);
      console.log("Mint address:", mintKeypair.publicKey.toBase58());
      console.log("ATA address:", userTokenAccount.toBase58());
      console.log("Mint transaction successful. Signature:", tx);




    } catch (error) {
      console.error("Mint transaction error:", error);
    }
  }, [wallet, programId]);

  const handleVaultInit = useCallback(async () => {
    try {
      if (!wallet || !wallet.publicKey) {
        console.error("Wallet or wallet.publicKey is undefined.");
        return;
      }

      const mintKeypair = new solanaWeb3.Keypair();
      const levrageAccount = new solanaWeb3.Keypair();
      const mintInfoKeypair = new solanaWeb3.Keypair();

      console.log('mint keypair', Object.values(mintKeypair.secretKey));
      console.log('levrage account', Object.values(levrageAccount.secretKey));
      console.log('mint info keypair', Object.values(mintInfoKeypair.secretKey));

      const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
      const program = new Program(tokenIdl, provider);

      console.log('mint keypair', mintKeypair.publicKey.toString());
      console.log('mintlevrage account', levrageAccount.publicKey.toString());

      const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      const createMintInfoIx = web3.SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,  // Ensure this is the correct program ID
      });

      const initializeMint_Tx = await createInitializeMintInstruction(
        mintKeypair.publicKey,
        9,
        wallet.publicKey,
        wallet.publicKey,
      );

      const transaction = new web3.Transaction().add(createMintInfoIx, initializeMint_Tx)
      const signature = await provider.sendAndConfirm(transaction, [mintKeypair]);

      // Transaction for mint initialization
      const tx = await program.methods.initialize("test", "test", new BN(9))
        .accounts({
          mintInfo: mintInfoKeypair.publicKey,           // Mint PDA as the mint info
          user: wallet.publicKey,      // User's public key
          mint: mintKeypair.publicKey,               // Mint PDA as the mint address
          systemProgram: solanaWeb3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: solanaWeb3.SYSVAR_RENT_PUBKEY,
        })
        .signers([mintInfoKeypair])
        .rpc();

      // const new_tx = new web3.Transaction().add(createMintInfoIx, tx)


      // console.log("Mint initialization transaction signature:", tx);

      // // Deriving the Leverage Account PDA (deterministic address) using findProgramAddressSync
      const darkpool_program = new Program(leverageIdl, provider);

      console.log("Creating a new leverage account...");
      const darkpool_tx = await darkpool_program.methods.initialize(mintKeypair.publicKey)
        .accounts({
          leverageAccount: levrageAccount.publicKey,  // Leverage PDA
          owner: wallet.publicKey,       // User's public key
        })
        .signers([levrageAccount])
        .rpc();

      console.log("Leverage account creation transaction signature:", darkpool_tx);

      // Ensure the userTokenAccount is writable
      const vaultTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        levrageAccount.publicKey
      );

      const createVaultAtaIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey,  // payer
        vaultTokenAccount,           // ata
        levrageAccount.publicKey,
        mintKeypair.publicKey       // mint
      );

      const vault_transaction = new web3.Transaction().add(
        createVaultAtaIx,
      );


      // Sign and send the transaction
      const vault_signature = await provider.sendAndConfirm(vault_transaction);
      console.log("vault ATA address:", vaultTokenAccount.toString());

    } catch (error) {
      console.log('Transaction error:', error);
    }
  }, [wallet, programId, provider]);

  const handleInitialize = useCallback(async () => {
    try {
      if (!wallet || !wallet.publicKey) {
        console.error("Wallet or wallet.publicKey is undefined.");
        return;
      }

      const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
      const program = new Program(tokenIdl, provider);

      const mintKeypair = new solanaWeb3.Keypair();
      const levrageAccount = new solanaWeb3.Keypair();
      console.log('mint keypair', mintKeypair.publicKey.toString());
      console.log('levrage account', levrageAccount.publicKey.toString());

      // Transaction for mint initialization
      const tx = await program.methods.initialize("test", "test", new BN(9))
        .accounts({
          mintInfo: mintKeypair.publicKey,           // Mint PDA as the mint info
          user: wallet.publicKey,      // User's public key
          mint: mintKeypair.publicKey,               // Mint PDA as the mint address
          systemProgram: solanaWeb3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: solanaWeb3.SYSVAR_RENT_PUBKEY,
        })
        .signers(mintKeypair ? [mintKeypair] : [])
        .rpc();

      console.log("Mint initialization transaction signature:", tx);

      // Deriving the Leverage Account PDA (deterministic address) using findProgramAddressSync
      const darkpool_program = new Program(leverageIdl, provider);

      console.log("Creating a new leverage account...");
      const darkpool_tx = await darkpool_program.methods.initialize(mintKeypair.publicKey)
        .accounts({
          leverageAccount: levrageAccount.publicKey,  // Leverage PDA
          owner: wallet.publicKey,       // User's public key
        })
        .signers([levrageAccount])
        .rpc();

      console.log("Leverage account creation transaction signature:", darkpool_tx);

    } catch (error) {
      console.log('Transaction error:', error);
    }
  }, [wallet, programId, provider]);


  const handleDeposit = useCallback(async () => {
    try {
      if (!wallet || !wallet.publicKey) {
        toast.error("Please connect your wallet.");
        return;
      }

      if (!amount || !tokenAddress) {
        toast.error("Please enter an amount and select a token.");
        return;
      }
      setLoadingDeposit(true);
      const program = new Program(leverageIdl, provider);
      // const pda = PublicKey.findProgramAddressSync([Buffer.from("user_balance"), wallet.publicKey.toBuffer(), Buffer.from(version)], leverageProgramId);
      const pda = PublicKey.findProgramAddressSync([Buffer.from("user_balance"), wallet.publicKey.toBuffer()], leverageProgramId);

      if (tokenAddress === "SOL") {
        const tx = await program.methods.deposit(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: new PublicKey(leverage_public_key),
            userBalance: new PublicKey(pda[0]),
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else if (tokenAddress === "USDC") {

        let localUserTokenAccount = localStorage.getItem('userTokenAccount') && new PublicKey(JSON.parse(localStorage.getItem('userTokenAccount')))
        if (!localUserTokenAccount) {

          console.log(object)
          const mintRent = await connection.getMinimumBalanceForRentExemption(82);
          const tx = new Transaction();

          const createMintAccountIx = web3.SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: 82,
            lamports: mintRent,
            programId: TOKEN_PROGRAM_ID,  // Ensure this is the correct program ID
          });

          console.log(createMintAccountIx)
          // Initialize mint instruction
          const initializeMintIx = await createInitializeMintInstruction(
            mintKeypair.publicKey,
            0,
            wallet.publicKey,
            wallet.publicKey,
            TOKEN_PROGRAM_ID
          );

          // Ensure the userTokenAccount is writable
          const userTokenAccount = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            wallet.publicKey
          );


          const createAtaIx = createAssociatedTokenAccountInstruction(
            wallet.publicKey,  // payer
            userTokenAccount,           // ata
            wallet.publicKey,  // owner
            mintKeypair.publicKey       // mint
          );


          tx.add(createMintAccountIx, initializeMintIx, createAtaIx)
          const send = await provider.sendAndConfirm(tx, [mintKeypair])

          localUserTokenAccount = userTokenAccount;
          localStorage.setItem('userTokenAccount', JSON.stringify(userTokenAccount))
        }

        const deposit_tx = await program.methods.depositErc20(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: levrageAccount.publicKey,
            userBalance: new PublicKey(pda[0]),
            tokenMint: mintKeypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userTokenAccount: localUserTokenAccount,
            vaultTokenAccount: new PublicKey(vault_token_ATA),
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();

      } else {
        throw new Error("Invalid token address");
      }
      await handleGetBalance();
    } catch (error) {
      toast.error(error.message)
      throw error;
    } finally {
      setLoadingDeposit(false);
      setAmount(null)
    setTokenAddress(null)
    }
  }, [wallet, programId]);


  const handleWithdraw = useCallback(async () => {
    try {
      if (!wallet || !wallet.publicKey) {
        toast.error("Please connect your wallet.");
        return;
      }

      if (!amount || !tokenAddress) {
        toast.error("Please enter an amount and select a token.");
        return;
      }
      setLoadingWithdraw(true);
      const program = new Program(leverageIdl, provider);
      const pda = PublicKey.findProgramAddressSync([Buffer.from("user_balance"), wallet.publicKey.toBuffer()], leverageProgramId);

      if (tokenAddress === "SOL") {
        const withdraw_tx = await program.methods.withdraw(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: levrageAccount.publicKey,
            userBalance: new PublicKey(pda[0]),
            tokenProgram: null,
            tokenMint: null,
            vaultTokenAccount: null,
            userTokenAccount: null,
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else if (tokenAddress === "USDC") {
        const withdraw_tx = await program.methods.withdraw(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: levrageAccount.publicKey,
            userBalance: new PublicKey(pda[0]),
            tokenMint: mintKeypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userTokenAccount: new PublicKey(JSON.parse(localStorage.getItem('userTokenAccount'))),
            vaultTokenAccount: new PublicKey(vault_token_ATA),
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else { throw new Error("Invalid token address") }
      await handleGetBalance();
    } catch (error) {
      toast.error(error.message)
      throw error;
    } finally {
      setLoadingWithdraw(false);
      setAmount(null)
      setTokenAddress(null)
    }
  }, [wallet, leverageProgramId])

  const handleBorrow = useCallback(async () => {
    try {
      if (!wallet || !wallet.publicKey) {
        toast.error("Please connect your wallet.");
        return;
      }

      if (!amount || !tokenAddress) {
        toast.error("Please enter an amount and select a token.");
        return;
      }
      setLoadingBorrow(true);
      const program = new Program(leverageIdl, provider);
      const pda = PublicKey.findProgramAddressSync([Buffer.from("user_balance"), wallet.publicKey.toBuffer()], leverageProgramId);

      if (tokenAddress === "SOL") {
        const borrow_tx = await program.methods.borrow(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: new PublicKey(leverage_public_key),
            userBalance: new PublicKey(pda[0]),
            tokenProgram: null,
            tokenMint: null,
            vaultTokenAccount: null,
            userTokenAccount: null,
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else if (tokenAddress === "USDC") {
        const borrow_tx = await program.methods.borrow(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: levrageAccount.publicKey,
            userBalance: new PublicKey(pda[0]),
            tokenMint: mintKeypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userTokenAccount: new PublicKey(JSON.parse(localStorage.getItem('userTokenAccount'))),
            vaultTokenAccount: new PublicKey(vault_token_ATA),
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else { throw new Error("Invalid token address") }
      await handleGetBalance();
    } catch (error) {
      toast.error(error.message)
      throw error;
    } finally {
      setLoadingBorrow(false);
      setAmount(null)
      setTokenAddress(null)
    }
  }, [wallet, leverageProgramId])

  const handleRepay = useCallback(async () => {
    try {
      if (!wallet || !wallet.publicKey) {
        toast.error("Please connect your wallet.");
        return;
      }

      if (!amount || !tokenAddress) {
        toast.error("Please enter an amount and select a token.");
        return;
      }
      setLoadingRepay(true);
      const program = new Program(leverageIdl, provider);
      const pda = PublicKey.findProgramAddressSync([Buffer.from("user_balance"), wallet.publicKey.toBuffer()], leverageProgramId);

      if (tokenAddress === "SOL") {
        const repay_tx = await program.methods.repay(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: new PublicKey(leverage_public_key),
            userBalance: new PublicKey(pda[0]),
            tokenProgram: null,
            tokenMint: null,
            vaultTokenAccount: null,
            userTokenAccount: null,
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else if (tokenAddress === "USDC") {
        const repay_tx = await program.methods.repay(new BN(amount * (10 ** 9)))
          .accounts({
            user: wallet.publicKey,
            leverageAccount: levrageAccount.publicKey,
            userBalance: new PublicKey(pda[0]),
            tokenMint: mintKeypair.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            userTokenAccount: new PublicKey(JSON.parse(localStorage.getItem('userTokenAccount'))),
            vaultTokenAccount: new PublicKey(vault_token_ATA),
            systemProgram: solanaWeb3.SystemProgram.programId,
          })
          .rpc();
      }
      else { throw new Error("Invalid token address") }

      await handleGetBalance();
    } catch (error) {
      toast.error(error.message)
      throw error;
    } finally {
      setLoadingRepay(false);
      setAmount(null)
      setTokenAddress(null)
    }
  }, [wallet, leverageProgramId])


  return (
    <div className="flex flex-col h-fit bg-grey-900[0.4] text-gray-100 w-[400px]">
      <div className="w-full max-w-md mx-auto space-y-4 p-6 rounded-lg">
        <button onClick={handleGetUsdc} className={`bg-[#2550C0]/[0.21] w-full py-4 rounded-lg border border-gray-700`} disabled={loadingGetUsdc}>{loadingGetUsdc ? "Processing..." : "Get USDC"}</button>
        <div
          className={`bg-[#2550C0]/[0.21] w-full py-4 rounded-lg border ${activeForm === "deposit" ? "border-blue-500" : "border-gray-700"
            }`}
          onClick={() => handleButtonClick("deposit")}
        >
          <p className="text-center">Deposit</p>
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${activeForm === "deposit"
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
              }`}
          >
            {activeForm === "deposit" && (
              <div className="mt-4 p-4 rounded-lg">
                <TokenSelectorMenu setTokenAddress={setTokenAddress} />
                <input
                  type="text"
                  placeholder="Enter deposit amount"
                  className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-800 text-white"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 rounded-lg w-full"
                  onClick={handleDeposit}
                  disabled={loadingDeposit}
                >
                  {loadingDeposit ? "Processing..." : "Submit Deposit"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className={`bg-[#2550C0]/[0.21] w-full py-4 rounded-lg border ${activeForm === "withdraw" ? "border-blue-500" : "border-gray-700"
            }`}
          onClick={() => handleButtonClick("withdraw")}
          disabled={loadingWithdraw}
        >
          <p className="text-center">Withdraw</p>
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${activeForm === "withdraw"
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
              }`}
          >
            {activeForm === "withdraw" && (
              <div className="mt-4 p-4 rounded-lg">
                <TokenSelectorMenu setTokenAddress={setTokenAddress} />
                <input
                  type="text"
                  placeholder="Enter withdraw amount"
                  className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-800 text-white"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 rounded-lg w-full"
                  onClick={handleWithdraw}
                  disabled={loadingWithdraw}
                >
                  {loadingWithdraw ? "Processing..." : "Submit Withdraw"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div
          className={`bg-[#2550C0]/[0.21] w-full py-4 rounded-lg border ${activeForm === "borrow" ? "border-blue-500" : "border-gray-700"
            }`}
          onClick={() => handleButtonClick("borrow")}
          disabled={loadingBorrow}
        >
          <p className="text-center">Borrow</p>
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${activeForm === "borrow"
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
              }`}
          >
            {activeForm === "borrow" && (
              <div className="mt-4 p-4 rounded-lg">
                <TokenSelectorMenu setTokenAddress={setTokenAddress} />
                <input
                  type="text"
                  placeholder="Enter borrow amount"
                  className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-800 text-white"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 rounded-lg w-full"
                  onClick={handleBorrow}
                  disabled={loadingBorrow}
                >
                  {loadingBorrow ? "Processing..." : "Submit Borrow"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div
          className={`bg-[#2550C0]/[0.21] w-full py-4 rounded-lg border ${activeForm === "repay" ? "border-blue-500" : "border-gray-700"
            }`}
          onClick={() => handleButtonClick("repay")}
          disabled={loadingRepay}
        >
          <p className="text-center">Repay</p>
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${activeForm === "repay"
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
              }`}
          >
            {activeForm === "repay" && (
              <div className="mt-4 p-4 rounded-lg">
                <TokenSelectorMenu setTokenAddress={setTokenAddress} />
                <input
                  type="text"
                  placeholder="Enter repay amount"
                  className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-800 text-white"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 rounded-lg w-full"
                  onClick={handleRepay}
                  disabled={loadingRepay}
                >
                  {loadingRepay ? "Processing..." : "Submit Repay"}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* <div
          className={`bg-[#2550C0]/[0.21] w-full py-4 rounded-lg border ${activeForm === "burn" ? "border-blue-500" : "border-gray-700"
            }`}
          onClick={() => handleButtonClick("burn")}
        >
          <p className="text-center">Burn</p>
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${activeForm === "burn"
              ? "max-h-96 opacity-100"
              : "max-h-0 opacity-0"
              }`}
          >
            {activeForm === "burn" && (
              <div className="mt-4 p-4 rounded-lg">
                <TokenSelectorMenu setTokenAddress={setTokenAddress} />
                <input
                  type="text"
                  placeholder="Enter burn amount"
                  className="w-full px-3 py-2 rounded border border-gray-700 bg-gray-800 text-white"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 rounded-lg w-full"
                // onClick={handleBurn}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default FormButtons;