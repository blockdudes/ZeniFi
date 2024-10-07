import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenContract } from "../target/types/token_contract";
import { expect } from "chai";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, MINT_SIZE, createAssociatedTokenAccountInstruction, createMint, getAccount, getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount, createInitializeMintInstruction } from "@solana/spl-token";

describe("Token Contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TokenContract as Program<TokenContract>;

  let mintKeypair: Keypair;
  let mintInfoKeypair: Keypair;
  let tokenAccountKeypair: Keypair;

  before(async () => {
    mintKeypair = anchor.web3.Keypair.generate();
    mintInfoKeypair = anchor.web3.Keypair.generate();
    tokenAccountKeypair = anchor.web3.Keypair.generate();
  });

  it("Initializes the token and mint", async () => {
    const name = "My Token";
    const symbol = "MTK";
    const decimals = 9;
    const mintAmount = new anchor.BN(100_000_000_000);
    const approveAmount = new anchor.BN(50_000_000_000);
    const transferAmount = new anchor.BN(25_000_000_000);


    // create mint account
    const lamports = await provider.connection.getMinimumBalanceForRentExemption(82);
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

    await program.methods
      .initialize(name, symbol, decimals)
      .accounts({
        mintInfo: mintInfoKeypair.publicKey,
        user: provider.wallet.publicKey,
        mint: mintKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([mintInfoKeypair])
      .rpc();

    const mintInfo = await program.account.mintInfo.fetch(mintInfoKeypair.publicKey);

    expect(mintInfo.name).to.equal(name);
    expect(mintInfo.symbol).to.equal(symbol);
    expect(mintInfo.decimals).to.equal(decimals);

    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      provider.wallet.publicKey
    );

    try {
      await getAccount(provider.connection, associatedTokenAddress);
    } catch (error) {
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          associatedTokenAddress,
          provider.wallet.publicKey,
          mintKeypair.publicKey
        )
      );
      await provider.sendAndConfirm(transaction);
    }

    await program.methods
      .mintTokens(mintAmount)
      .accounts({
        mint: mintKeypair.publicKey,
        tokenAccount: associatedTokenAddress,
        user: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();

    const tokenAccountInfo = await getAccount(provider.connection, associatedTokenAddress);
    expect(tokenAccountInfo.amount.toString()).to.equal(mintAmount.toString());

    // Verify the total supply
    const mintInfoT = await getMint(provider.connection, mintKeypair.publicKey);
    expect(mintInfoT.supply.toString()).to.equal(mintAmount.toString());


    // Create a new keypair for the spender
    const spenderKeypair = anchor.web3.Keypair.generate();

    // Create a new keypair for the recipient
    const recipientKeypair = anchor.web3.Keypair.generate();

    // Get or create the associated token account for the recipient
    const recipientAssociatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      recipientKeypair.publicKey
    );

    // Create the recipient's associated token account if it doesn't exist
    const transactionx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,  // payer
        recipientAssociatedTokenAddress,
        recipientKeypair.publicKey,
        mintKeypair.publicKey
      )
    );
    await provider.sendAndConfirm(transactionx);

    await program.methods
      .transfer(transferAmount)
      .accounts({
        from: associatedTokenAddress,
        to: recipientAssociatedTokenAddress,
        owner: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      } as any)
      .rpc();


    // Approve the spender
    // await program.methods
    //   .approve(approveAmount)
    //   .accounts({
    //     tokenAccount: associatedTokenAddress,
    //     spender: spenderKeypair.publicKey,
    //     owner: provider.wallet.publicKey,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //   } as any)
    //   .rpc();

    // const updatedTokenAccountInfo = await getAccount(provider.connection, associatedTokenAddress);
    // expect(updatedTokenAccountInfo.delegate).to.eql(spenderKeypair.publicKey);
    // expect(updatedTokenAccountInfo.delegatedAmount.toString()).to.equal(approveAmount.toString());

    // // Create a new keypair for the recipient
    // const recipientKeypair = anchor.web3.Keypair.generate();

    // // Get or create the associated token account for the recipient
    // const recipientAssociatedTokenAddress = await getAssociatedTokenAddress(
    //   mintKeypair.publicKey,
    //   recipientKeypair.publicKey
    // );

    // Create the recipient's associated token account if it doesn't exist

    // const transactiont = new Transaction().add(
    //   createAssociatedTokenAccountInstruction(
    //     provider.wallet.publicKey,  // payer
    //     recipientAssociatedTokenAddress,
    //     recipientKeypair.publicKey,
    //     mintKeypair.publicKey
    //   )
    // );
    // await provider.sendAndConfirm(transactiont);

    // Perform transfer from
    // const transferAmount = new anchor.BN(50_000_000_000); // 25 tokens
    // await program.methods
    //   .transferFrom(transferAmount)
    //   .accounts({
    //     from: associatedTokenAddress,
    //     to: recipientAssociatedTokenAddress,
    //     delegate: spenderKeypair.publicKey,
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //   } as any)
    //   .signers([spenderKeypair])
    //   .rpc();

    // // Verify the transfer
    // const fromAccountInfo = await getAccount(provider.connection, associatedTokenAddress);
    // const toAccountInfo = await getAccount(provider.connection, recipientAssociatedTokenAddress);

    // expect(fromAccountInfo.amount.toString()).to.equal(mintAmount.sub(transferAmount).toString());
    // expect(toAccountInfo.amount.toString()).to.equal(transferAmount.toString());
    // expect(fromAccountInfo.delegatedAmount.toString()).to.equal(approveAmount.sub(transferAmount).toString());
  });
});
