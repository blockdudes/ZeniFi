import { LEVERAGE_CONTRACT_ADDRESS } from "@/utils/constant";
import { leverageContractABI } from "@/abis/leverageContractAbi";
import { ethers } from 'ethers';

export const POST = async (request) => {
  try {
    const message = await request.json();
    const tokenIn = message.execute_order.token_in === "USDT" ? "0x819cF2cC38De03A4421da0C155085cA94B5B34AE" : "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const tokenOut = message.execute_order.token_out === "USDT" ? "0x819cF2cC38De03A4421da0C155085cA94B5B34AE" : "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

    const provider = new ethers.JsonRpcProvider("https://arbitrum-sepolia.blockpi.network/v1/rpc/public");
    const wallet = new ethers.Wallet(process.env.NEXT_PUBLIC_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(LEVERAGE_CONTRACT_ADDRESS, leverageContractABI.abi, wallet);

    const orderId = message.execute_order.order_id;
    const userAddress = message.execute_order.user_address;
    const amountIn = BigInt(Math.floor(message.execute_order.amount_in));
    const amountOut = BigInt(Math.floor(message.execute_order.amount_out));

    const tx = await contract.orderExecute(orderId, userAddress, tokenIn, tokenOut, amountIn, amountOut);
    const receipt = await tx.wait();

    if (receipt) {
      if (receipt.status === 1) {
        return Response.json({ txHash: receipt.hash })
      } else {
        return Response.error();
      }
    } else {
      return Response.error();
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}