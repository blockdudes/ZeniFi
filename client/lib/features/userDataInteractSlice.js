import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokens } from "@/constant/constant";
import { LEVERAGE_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } from "@/utils/constant";
import { leverageContractABI } from "@/abis/leverageContractAbi";


const userAssetInitialData = {
    native: null,
    fungible: null,
    orders: [],
    loading: false,
    error: null
}


const userDataInteractSlice = createSlice({
    name: "user asset interaction",
    initialState: userAssetInitialData,
    reducers: {
        resetUserData: (state) => {
            state.native = null;
            state.fungible = null;
            state.orders = [];
            state.loading = false;
            state.error = null;
        },
        addBalance: (state, action) => {
            state.native = action.payload.native;
            state.fungible = action.payload.fungible;
        }
    }
});

export const { resetUserData, addBalance } = userDataInteractSlice.actions;
export default userDataInteractSlice.reducer;