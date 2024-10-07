import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { contract_execute_msg } from "@/constant/executeContractFunctions"
import { leverage_contract_address, queryBalanceMethods, tokens } from "@/constant/constant"

export const POST = async (request) => {

    const archwayTestnetOptions = {
        rpcEndpoint: "https://rpc.constantine.archway.io:443",
        gasPrice: "0.2aconst",
        chainId: "constantine-3",
        fees: {
            upload: 2000000
        }
    };

    try {

        const { user_address } = await request.json();
        const default_fee = { amount: [{ amount: "510000000000000000", denom: "aconst" }], gas: "3000000" };

        const mnemonic = "cattle boat useless rib few stumble robust arrive early pledge tortoise clip";
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "archway" });
        const [account] = await wallet.getAccounts();
        const addr = account.address;
        const gasPrice = GasPrice.fromString(archwayTestnetOptions.gasPrice);
        const client = await SigningCosmWasmClient.connectWithSigner(archwayTestnetOptions.rpcEndpoint, wallet, { gasPrice });

        const query_balances = {}

        for (const token of tokens) {
            query_balances[token.name] = {};
            for (const queryBalanceMethod of queryBalanceMethods) {
                const response = await client.queryContractSmart(
                    leverage_contract_address,
                    { [queryBalanceMethod.method]: { token_address: token.address, user_address } }
                );
                if (token.name === "native") {
                    query_balances[token.name][queryBalanceMethod.key] = parseFloat(response / (10 ** 18));
                } else {
                    query_balances[token.name][queryBalanceMethod.key] = parseFloat(response / (10 ** 6));
                }
            }
        }

        return Response.json({ balances: query_balances }, { status: 200 })
    } catch (error) {
        return Response.error({ error }, { status: 500 })
    }
}