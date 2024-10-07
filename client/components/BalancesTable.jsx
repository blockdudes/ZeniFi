"use client"
import React from "react";
import { useSelector } from "react-redux";
import Skeleton from "./Skeleton";

export default function BalancesTable() {
  const { fungible, native, loading } = useSelector(
    (state) => state.userDataInteract
  );
  return (
    <div className="bg-transparent p-4 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-white border border-gray-700">
          <thead className="text-xs text-white uppercase bg-gray-700/[0.3]">
            <tr>
              <th className="px-6 py-3">Balances</th>
              <th className="px-6 py-3">SOL</th>
              <th className="px-6 py-3">USDC</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-800/[0.2] border-b border-t border-gray-700">
              <td className="px-6 py-4">Collateral Balance</td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(native?.depositTokenBalance.toString())/(10**9) || 0}
              </td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(fungible?.depositTokenBalance.toString())/(10**9) || 0}
              </td>
            </tr>

            <tr className="bg-gray-800/[0.2] border-b border-t border-gray-700">
              <td className="px-6 py-4">Borrow Allowance</td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(native?.leverageTokenBalance.toString())/(10**9) || 0}
              </td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(fungible?.leverageTokenBalance.toString())/(10**9) || 0}
              </td>
            </tr>

            <tr className="bg-gray-800/[0.2] border-b border-t border-gray-700">
              <td className="px-6 py-4">Borrowed Balance</td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(native?.borrowTokenBalance.toString())/(10**9) || 0}
              </td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(fungible?.borrowTokenBalance.toString())/(10**9) || 0}
              </td>
            </tr>

            <tr className="bg-gray-800/[0.2] border-b border-t border-gray-700">
              <td className="px-6 py-4">V token balance</td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(native?.userTokenBalance.toString())/(10**9) || 0}
              </td>
              <td className="px-6 py-4">
                {loading ? <Skeleton /> : Number(fungible?.userTokenBalance.toString())/(10**9) || 0}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
