"use client"
import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserData } from '@/lib/features/userDataInteractSlice';
import BalancesTable from './BalancesTable';
import { useActiveAccount } from 'thirdweb/react';

export default function UserStats() {
  const account = useActiveAccount();

  const dispatch = useDispatch();
  useEffect(() => {
    if (account) {
      dispatch(fetchUserData({ signer: account.address }))
    }
  }, [account])


  return (
    <div className="p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">User Stats</h2>
      <BalancesTable />
    </div>
  )
}