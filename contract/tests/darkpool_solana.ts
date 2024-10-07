import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenContract } from "../target/types/token_contract";
import { DarkpoolSolana } from "../target/types/darkpool_solana";
import { expect } from "chai";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, MINT_SIZE, createAssociatedTokenAccountInstruction, createMint, getAccount, getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount, createInitializeMintInstruction } from "@solana/spl-token";

describe("darkpool_solana", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const tokenProgram = anchor.workspace.TokenContract as Program<TokenContract>;
  const darkpoolProgram = anchor.workspace.DarkpoolSolana as Program<DarkpoolSolana>;

  const WSOL_MINT = new anchor.web3.PublicKey("So11111111111111111111111111111111111111112");

  let leverageAccount: anchor.web3.Keypair;
  let tokenAccount: anchor.web3.Keypair;
  let userBalance: anchor.web3.PublicKey;
  let userOrderState: anchor.web3.PublicKey;

  before(async () => {
    // Initialize token and darkpool
    tokenAccount = anchor.web3.Keypair.generate();
    leverageAccount = anchor.web3.Keypair.generate();

    await darkpoolProgram.methods
      .initialize(tokenAccount.publicKey)
      .accounts({
        leverageAccount: leverageAccount.publicKey,
        owner: provider.wallet.publicKey,
      })
      .signers([leverageAccount])
      .rpc();

    // Derive PDAs for user balance and order state
    [userBalance] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );

    [userOrderState] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user-order-state"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );
  });

  it("Deposits SOL", async () => {
    const depositAmount = new anchor.BN(1_000_000_000);

    const [userBalancePda, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );

    try {
      const tx = await darkpoolProgram.methods
        .deposit(depositAmount)
        .accounts({
          user: provider.wallet.publicKey,
          leverageAccount: leverageAccount.publicKey,
          userBalance: userBalancePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Deposit transaction signature", tx);
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }

    const userBalanceAccount = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("hello", userBalanceAccount.nativeBalance.depositTokenBalance.toString());
    console.log("Hello", userBalanceAccount.nativeBalance.leverageTokenBalance.toString());
    expect(userBalanceAccount.nativeBalance.depositTokenBalance.toString()).to.equal(depositAmount.toString());
    expect(userBalanceAccount.nativeBalance.leverageTokenBalance.toString()).to.equal((depositAmount.mul(new anchor.BN(10))).toString());
  });

  it("Borrow SOL", async () => {
    const borrowAmount = new anchor.BN(1_000_000_000);
    const [userBalancePda, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );

    const initialUserBalance = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("Initial user balance:", initialUserBalance.nativeBalance.leverageTokenBalance.toString());

    try {
      const tx = await darkpoolProgram.methods
        .borrow(borrowAmount)
        .accounts({
          user: provider.wallet.publicKey,
          leverageAccount: leverageAccount.publicKey,
          userBalance: userBalancePda,
          tokenProgram: null,
          tokenMint: null,
          vaultTokenAccount: null,
          userTokenAccount: null,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Borrow transaction signature", tx);
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }

    const UserBalance = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("Initial user balance:", UserBalance.nativeBalance.leverageTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.depositTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.borrowTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.userTokenBalance.toString());
  })

  it("Repay SOL", async () => {
    const repayAmount = new anchor.BN(1_000_000_000);
    const [userBalancePda, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );

    const initialUserBalance = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("Initial user balance:", initialUserBalance.nativeBalance.leverageTokenBalance.toString());

    try {
      const tx = await darkpoolProgram.methods
        .repay(repayAmount)
        .accounts({
          user: provider.wallet.publicKey,
          leverageAccount: leverageAccount.publicKey,
          userBalance: userBalancePda,
          tokenProgram: null,
          tokenMint: null,
          vaultTokenAccount: null,
          userTokenAccount: null,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Borrow transaction signature", tx);
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }

    const UserBalance = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("Initial user balance:", UserBalance.nativeBalance.leverageTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.depositTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.borrowTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.userTokenBalance.toString());
  })

  it("Withdraw SOL", async () => {
    const withdrawAmount = new anchor.BN(1_000_000_000);
    const [userBalancePda, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );

    const initialUserBalance = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("Initial user balance:", initialUserBalance.nativeBalance.leverageTokenBalance.toString());

    try {
      const tx = await darkpoolProgram.methods
        .withdraw(withdrawAmount)
        .accounts({
          user: provider.wallet.publicKey,
          leverageAccount: leverageAccount.publicKey,
          userBalance: userBalancePda,
          tokenProgram: null,
          tokenMint: null,
          vaultTokenAccount: null,
          userTokenAccount: null,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .rpc();

      console.log("Borrow transaction signature", tx);
    } catch (error) {
      console.error("Error details:", error);
      throw error;
    }

    const UserBalance = await darkpoolProgram.account.userBalance.fetch(userBalancePda);
    console.log("Initial user balance:", UserBalance.nativeBalance.leverageTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.depositTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.borrowTokenBalance.toString());
    console.log("Initial user balance:", UserBalance.nativeBalance.userTokenBalance.toString());
  })

})

describe("darkpool_solana ERC20 operations", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const tokenProgram = anchor.workspace.TokenContract as Program<TokenContract>;
  const darkpoolProgram = anchor.workspace.DarkpoolSolana as Program<DarkpoolSolana>;

  let mintKeypair: Keypair;
  let mintInfoKeypair: Keypair;
  let leverageAccount: Keypair;
  let userTokenAccount: PublicKey;
  let vaultTokenAccount: PublicKey;
  let userBalance: PublicKey;

  const tokenAmount = new anchor.BN(1_000_000_000);

  before(async () => {
    mintKeypair = anchor.web3.Keypair.generate();
    mintInfoKeypair = anchor.web3.Keypair.generate();
    leverageAccount = anchor.web3.Keypair.generate();

    const name = "usdc";
    const symbol = "USDC";
    const decimals = 9;

    const lamports = await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        provider.wallet.publicKey,
        provider.wallet.publicKey
      )
    );
    await provider.sendAndConfirm(transaction, [mintKeypair]);

    await tokenProgram.methods
      .initialize(name, symbol, decimals)
      .accounts({
        mintInfo: mintInfoKeypair.publicKey,
        user: provider.wallet.publicKey,
        mint: mintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([mintInfoKeypair])
      .rpc();

    // Initialize darkpool
    await darkpoolProgram.methods
      .initialize(mintKeypair.publicKey)
      .accounts({
        leverageAccount: leverageAccount.publicKey,
        owner: provider.wallet.publicKey,
      })
      .signers([leverageAccount])
      .rpc();

    // Create user token account
    userTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      provider.wallet.publicKey
    );

    const createAtaIx = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      userTokenAccount,
      provider.wallet.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new Transaction().add(createAtaIx));

    // Create vault token account
    vaultTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      leverageAccount.publicKey,
      true
    );

    const createVaultAtaIx = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      vaultTokenAccount,
      leverageAccount.publicKey,
      mintKeypair.publicKey
    );

    await provider.sendAndConfirm(new Transaction().add(createVaultAtaIx));

    // Mint tokens to user
    await tokenProgram.methods
      .mintTokens(tokenAmount)
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        user: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    [userBalance] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_balance"), provider.wallet.publicKey.toBuffer()],
      darkpoolProgram.programId
    );
  });

  it("Deposits ERC20 tokens", async () => {
    const depositAmount = new anchor.BN(100_000_000);

    // Fetch initial balances
    const initialUserTokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    const initialVaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);

    console.log("Initial user token balance:", initialUserTokenBalance.value.uiAmount);
    console.log("Initial vault token balance:", initialVaultTokenBalance.value.uiAmount);

    await darkpoolProgram.methods
      .depositErc20(depositAmount)
      .accounts({
        leverageAccount: leverageAccount.publicKey,
        userBalance: userBalance,
        user: provider.wallet.publicKey,
        tokenMint: mintKeypair.publicKey,
        userTokenAccount: userTokenAccount,
        vaultTokenAccount: vaultTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const finalUserTokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    const finalVaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);

    console.log("Final user token balance:", finalUserTokenBalance.value.uiAmount);
    console.log("Final vault token balance:", finalVaultTokenBalance.value.uiAmount);

    const userBalanceAccount = await darkpoolProgram.account.userBalance.fetch(userBalance);
    expect(userBalanceAccount.fungibleBalance.depositTokenBalance.toString()).to.equal(depositAmount.toString());
    expect(userBalanceAccount.fungibleBalance.leverageTokenBalance.toString()).to.equal(depositAmount.mul(new anchor.BN(10)).toString());
  });

  it("Borrows ERC20 tokens", async () => {
    const borrowAmount = new anchor.BN(50_000_000);

    await darkpoolProgram.methods
      .borrow(borrowAmount)
      .accounts({
        user: provider.wallet.publicKey,
        leverageAccount: leverageAccount.publicKey,
        userBalance: userBalance,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMint: mintKeypair.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        userTokenAccount: userTokenAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const userBalanceAccount = await darkpoolProgram.account.userBalance.fetch(userBalance);
    expect(userBalanceAccount.fungibleBalance.borrowTokenBalance.toString()).to.equal(borrowAmount.toString());
    expect(userBalanceAccount.fungibleBalance.userTokenBalance.toString()).to.equal(borrowAmount.toString());
  });

  it("Repays ERC20 tokens", async () => {
    const repayAmount = new anchor.BN(50_000_000);

    await darkpoolProgram.methods
      .repay(repayAmount)
      .accounts({
        user: provider.wallet.publicKey,
        leverageAccount: leverageAccount.publicKey,
        userBalance: userBalance,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMint: mintKeypair.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        userTokenAccount: userTokenAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    const userBalanceAccount = await darkpoolProgram.account.userBalance.fetch(userBalance);
    expect(userBalanceAccount.fungibleBalance.borrowTokenBalance.toString()).to.equal(new anchor.BN(0).toString());
    expect(userBalanceAccount.fungibleBalance.userTokenBalance.toString()).to.equal(new anchor.BN(0).toString());
  });

  it("Withdraws ERC20 tokens", async () => {
    const withdrawAmount = new anchor.BN(50_000_000);

    // Fetch initial balances
    const initialUserTokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    const initialVaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    const initialUserBalanceAccount = await darkpoolProgram.account.userBalance.fetch(userBalance);

    console.log("Initial user token balance:", initialUserTokenBalance.value.uiAmount);
    console.log("Initial vault token balance:", initialVaultTokenBalance.value.uiAmount);
    console.log("Initial user deposit balance:", initialUserBalanceAccount.fungibleBalance.depositTokenBalance.toString());

    await darkpoolProgram.methods
      .withdraw(withdrawAmount)
      .accounts({
        user: provider.wallet.publicKey,
        leverageAccount: leverageAccount.publicKey,
        userBalance: userBalance,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMint: mintKeypair.publicKey,
        vaultTokenAccount: vaultTokenAccount,
        userTokenAccount: userTokenAccount,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    // Fetch final balances
    const finalUserTokenBalance = await provider.connection.getTokenAccountBalance(userTokenAccount);
    const finalVaultTokenBalance = await provider.connection.getTokenAccountBalance(vaultTokenAccount);
    const finalUserBalanceAccount = await darkpoolProgram.account.userBalance.fetch(userBalance);

    console.log("Final user token balance:", finalUserTokenBalance.value.uiAmount);
    console.log("Final vault token balance:", finalVaultTokenBalance.value.uiAmount);
    console.log("Final user deposit balance:", finalUserBalanceAccount.fungibleBalance.depositTokenBalance.toString());

    // Assert the changes
    expect(finalUserBalanceAccount.fungibleBalance.depositTokenBalance.toString()).to.equal(
      initialUserBalanceAccount.fungibleBalance.depositTokenBalance.sub(withdrawAmount).toString()
    );
  });
});