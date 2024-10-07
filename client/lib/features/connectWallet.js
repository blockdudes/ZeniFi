"use client"
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { setupWebKeplr, GasPrice, Registry } from "cosmwasm";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc"
import { SigningStargateClient } from "@cosmjs/stargate";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { add_chain } from "@/chains/chainConfiguration";

const userWalletInitialState = {
    signer: null,
    clientSigner: null,
    client: null,
    loading: false,
    chain: null,
    error: null,
}

export const connectWallet = createAsyncThunk("connectWallet", async () => {
    try {
        add_chain("archway")

        if (!window.keplr) {
            throw new Error("Keplr Wallet extension not found");
        }

        await window.keplr.enable("constantine-3");
        const offlineSigner = await window.keplr.getOfflineSigner("constantine-3");
        const accounts = await offlineSigner.getAccounts();
        const tmClient = await Tendermint37Client.connect("https://rpc.constantine.archway.io:443");
        const signerClient = await setupWebKeplr({
            rpcEndpoint: "https://rpc.constantine.archway.io:443",
            chainId: "constantine-3",
            prefix: "archway",
            gasPrice: GasPrice.fromString("0.250aconst"),
            tmClient
        });
        signerClient.tmClient = tmClient;
        const registry = new Registry([...defaultRegistryTypes, 
            ["/cosmwasm.wasm.v1.MsgExecuteContract", MsgExecuteContract],
            ["/cosmos.bank.v1beta1.MsgSend", MsgSend]
        ]);
        const client = await SigningStargateClient.connectWithSigner(
            "https://rpc.constantine.archway.io:443", offlineSigner, { registry: registry }
        );

        return {
            signer: accounts[0].address,
            clientSigner: signerClient,
            chain: "Archway Testnet",
            client,
        }
    } catch (error) {
        console.log(error)
    }
})

export const connectSlice = createSlice({
    name: "connect wallet slice",
    initialState: userWalletInitialState,
    extraReducers: builder => {
        builder.addCase(connectWallet.pending, (state) => {
            state.loading = true;
        })
        builder.addCase(connectWallet.fulfilled, (state, action) => {
            state.loading = false;
            state.signer = action?.payload?.signer;
            state.clientSigner = action?.payload?.clientSigner;
            state.client = action?.payload?.client;
            state.chain = action?.payload?.chain;
            state.error = null;
        })
        builder.addCase(connectWallet.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message;
            state.signer = null;
            state.clientSigner = null;
            state.client = null;
        })
    },
    reducers: {
        disconnect: () => {
            return userWalletInitialState
        }
    }
})

export const { disconnect } = connectSlice.actions
export default connectSlice.reducer;