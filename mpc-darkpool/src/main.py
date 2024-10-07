from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from typing import List, Tuple
import pickle 
from tno.mpc.protocols.distributed_keygen import DistributedPaillier
from tno.mpc.encryption_schemes.paillier import Paillier
import asyncio
from tno.mpc.communication import Pool
import argparse
import json
import os
import uvicorn
from contextlib import asynccontextmanager
from tno.mpc.encryption_schemes.paillier.paillier import PaillierPublicKey , PaillierCiphertext
from tno.mpc.protocols.distributed_keygen.paillier_shared_key import PaillierSharedKey
from web3 import Web3
from eth_account import Account
from datetime import datetime
import requests

# cosmwasm 
from cosmpy.aerial.wallet import LocalWallet
from cosmpy.crypto.keypairs import PrivateKey
from cosmpy.aerial.contract import LedgerContract
from cosmpy.aerial.client import LedgerClient, NetworkConfig, Address

app = FastAPI()

origins = [
    "http://localhost.tiangolo.com",
    "https://localhost.tiangolo.com",
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1:5000",
    "http://localhost:5173",
    "http://localhost:5173/home",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_PORT = 8900
NR_PARTIES = 3

# Application-wide configuration object
app.config = {
    'ORDERS_FILE': 'store/orders.json',
    'PRIVATE_KEY': "b0104cc3ae940f18c66addbb6076c5f98d1c0f350cc2fe0c1b585e66b7ec498b",
    'KEY_LENGTH': 128,
    'PRIME_THRESHOLD': 2000,
    'CORRUPTION_THRESHOLD': 1,
}

class Order(BaseModel):
    order_id: str
    user_address: str
    selectedMarket: str
    status: int
    createdAt: int = None
    encrypted_order_value: str
    buyToken: str
    sellToken: str
    trader_address: str = None
    chain: str

class Orders(BaseModel):
    orders: List[Order]

class Item(BaseModel):
    value: int

# async def periodic_task():
#     while True:
#         try:
#             await execute_orders_internal()
#         except Exception as e:
#             print(f"Error in periodic task: {e}")
#         await asyncio.sleep(10 * 60 * 60)  # 10 hours * 60 minutes/hour * 60 seconds/minute

def buy_eth_with_usdc(usdc_amount_wei, eth_price_usd):
    eth_amount_wei = usdc_amount_wei * 10**18 / eth_price_usd
    return eth_amount_wei

def sell_eth_for_usdc(eth_amount_wei, eth_price_usd):
    usdc_amount_wei = eth_amount_wei * eth_price_usd / 10**18
    return usdc_amount_wei

# Utility functions
def load_orders():
    try:
        with open(app.config['ORDERS_FILE'], 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        print("Warning: 'orders.json' is not found or empty. Returning an empty list.")
        return []

def save_orders(orders):
    with open(app.config['ORDERS_FILE'], 'w') as f:
        json.dump(orders, f)

def get_w3_and_contract(chain: str):
    if chain in app.config['CONTRACTS']:
        config = app.config['CONTRACTS'][chain]
        w3 = Web3(Web3.HTTPProvider(config['RPC']))
        contract = w3.eth.contract(address=config['ADDRESS'], abi=load_contract_abi())
        return w3, contract
    else:
        raise HTTPException(status_code=400, detail="Unsupported chain")

def load_contract_abi():
    try:
        with open('./abi/ccipAbi.json') as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="ABI file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error decoding ABI file")

async def setup_distributed_scheme(party_number, pool) -> DistributedPaillier:
    with open(f"store/{party_number}.pkl",'rb') as f:
        data = pickle.load(f)
    paillier_public_key = PaillierPublicKey.deserialize(data['paillier']['pubkey'])
    paillier_shared_key = PaillierSharedKey.deserialize(data['paillier']['seckey'])

    (
        number_of_players,
        prime_length,
        prime_list,
        shamir_scheme,
        shares,
        other_parties,
    ) = DistributedPaillier.setup_input(pool, app.config['KEY_LENGTH'], app.config['PRIME_THRESHOLD'], app.config['CORRUPTION_THRESHOLD'])

    index, party_indices, zero_share, session_id = await DistributedPaillier.setup_protocol(
        shamir_scheme, other_parties, pool
    )

    distributed_scheme = DistributedPaillier(
        paillier_public_key,
        paillier_shared_key,
        0,
        pool,
        index,
        party_indices,
        shares,
        session_id,
        False
    )
    return distributed_scheme

def setup_local_pool(server_port: int, others: List[Tuple[str, int]]) -> Pool:
    pool = Pool()
    pool.add_http_server(server_port)
    for client_ip, client_port in others:
        pool.add_http_client(
            f"client_{client_ip}_{client_port}", client_ip, client_port
        )
    return pool

async def setup():
    distributed_schemes = []
    pools = [None] * NR_PARTIES
    
    for party_number in range(NR_PARTIES):
        others = [
            ("localhost", BASE_PORT + i) for i in range(NR_PARTIES) if i != party_number
        ]
        server_port = BASE_PORT + party_number
        pool = setup_local_pool(server_port, others)
        pools[party_number] = pool
    
    distributed_schemes = tuple(
        await asyncio.gather(
            *[
                setup_distributed_scheme(
                    i,
                    pools[i]
                )
                for i in range(NR_PARTIES)
            ]
        )
    )
    return distributed_schemes

@app.post("/add_order")
async def add_order(order: Order):
    # headers = {
    #     "X-CMC_PRO_API_KEY": "99e8b7ac-34a8-4b56-9ac3-a00ce4165050"
    # }
    
    # response = requests.get('https://pro-api.coinmarketcap.com/v1/tools/price-conversion?symbol=USDC&amount=10&convert=OSMO', headers=headers)
    # print((response.json()['data']['quote']['OSMO']['price']))
    
    orders = load_orders()
    orders.append(order.dict())
    save_orders(orders)
    return {"message": "Order added successfully"}

async def sum_encrypted_values(orders):
    distributed_schemes = app.distribute_scema
    ciphertext_sum = distributed_schemes[0].encrypt(0)

    for order in orders:
        ciphertext = PaillierCiphertext(int(order['encrypted_order_value']), distributed_schemes[0])
        ciphertext_sum += ciphertext
    return ciphertext_sum

def encrypt_zero(distributed_scheme):
    return distributed_scheme.encrypt(0)


async def decrypt_all_orders(encrypted_vals):
    distributed_schemes = app.distribute_scema
    results = []
    for encrypted_val in encrypted_vals:
        dec = await asyncio.gather(
            *[
                distributed_schemes[i].decrypt(encrypted_val)
                for i in range(len(distributed_schemes))
            ]
        )
        results.append(dec[0])
    return results

async def calculate_cumulative_sums(orders):
    cumulative_sums = []
    sum_value = app.distribute_scema[0].encrypt(0)
    for order in orders:
        ciphertext = PaillierCiphertext(int(order['encrypted_order_value']), app.distribute_scema[0])
        sum_value += ciphertext
        cumulative_sums.append(sum_value)
    return cumulative_sums

async def binary_search_and_partial_decrypt(cumulative_sums, target_value, matched_orders, orders):
    low, high = 0, len(cumulative_sums) - 1

    while low < high:
        mid = (low + high) // 2
        difference = cumulative_sums[mid] - target_value
        decrypted_difference = await decrypt_all_orders([difference])

        if decrypted_difference[0] < 0:
            low = mid + 1
        else:
            high = mid

    partial_matched_orders = orders[:low + 1]
    remaining_encrypted_value = cumulative_sums[low] - target_value

    for order in partial_matched_orders[:-1]:
        encrypted_order_value = PaillierCiphertext(
            int(order['encrypted_order_value']), app.distribute_scema[0])
        decrypted_order_value = await decrypt_all_orders([encrypted_order_value])
        matched_orders.append({
            'user_address': order['user_address'],
            'selectedMarket': order['selectedMarket'],
            'status': order['status'],
            'createdAt': order['createdAt'],
            'trader_address': order['trader_address'],
            'sellToken': order['sellToken'],
            'buyToken': order['buyToken'],
            'chain': order['chain'],
            'encrypted_order_value': abs(int(decrypted_order_value[0]))
        })

    partial_order = partial_matched_orders[-1]
    if remaining_encrypted_value != app.distribute_scema[0].encrypt(0):
        temp = target_value - cumulative_sums[low - 1]  
        target_value_dec = await decrypt_all_orders([target_value])

        decrypted_order_value = await decrypt_all_orders([temp])
        print("value", decrypted_order_value)
        matched_orders.append({
            'user_address': partial_order['user_address'],
            'selectedMarket': partial_order['selectedMarket'],
            'status': partial_order['status'],
            'createdAt': partial_order['createdAt'],
            'trader_address': partial_order['trader_address'],
            'sellToken': partial_order['sellToken'],
            'buyToken': partial_order['buyToken'],
            'chain': partial_order['chain'],
            'encrypted_order_value': abs(int(target_value_dec[0])) 
        })


        # Update the remaining value and add to remaining_orders
        partial_order['encrypted_order_value'] = str(remaining_encrypted_value.get_value())
        
        orders.insert(0, partial_order)
    else:
        orders.pop(low)

    orders = orders[low + 1:]
    return matched_orders, orders

@app.post("/execute_osmosis_orders")
async def execute_orders_osmosis_internal():
    # print("decrypt", await decrypt_all_orders([PaillierCiphertext(810204001075069181365450675581913177600018489857778512943088584482130287613395,app.distribute_scema[0])]))
    # return
    orders = load_orders()
    
    osmo_to_usdc_orders = [order for order in orders if order['sellToken'] == 'XFI' and order['buyToken'] == 'USDT']
    usdc_to_osmo_orders = [order for order in orders if order['sellToken'] == 'USDT' and order['buyToken'] == 'XFI']
    encrypted_zero = encrypt_zero(app.distribute_scema[0])

    osmo_to_usdc_sum = await sum_encrypted_values(osmo_to_usdc_orders)
    usdc_to_osmo_sum = await sum_encrypted_values(usdc_to_osmo_orders)

    osmo_to_usdc_is_zero = await decrypt_all_orders([osmo_to_usdc_sum - encrypted_zero])
    usdc_to_osmo_is_zero = await decrypt_all_orders([usdc_to_osmo_sum - encrypted_zero])

    if osmo_to_usdc_is_zero[0] == 0 or usdc_to_osmo_is_zero[0] == 0:
        print("Invalid orders: One of the sums is zero")
        return {"error": "Invalid orders: One of the sums is zero"}

    encrypted_difference = (osmo_to_usdc_sum - usdc_to_osmo_sum)
    decrypted_difference = await decrypt_all_orders([encrypted_difference])

    if decrypted_difference[0] > 0:
        larger_orders, smaller_orders = osmo_to_usdc_orders, usdc_to_osmo_orders
        larger_sum, smaller_sum = osmo_to_usdc_sum, usdc_to_osmo_sum
    elif decrypted_difference[0] < 0:
        larger_orders, smaller_orders = usdc_to_osmo_orders, osmo_to_usdc_orders
        larger_sum, smaller_sum = usdc_to_osmo_sum, osmo_to_usdc_sum
    else:
        matched_orders = osmo_to_usdc_orders + usdc_to_osmo_orders
        for order in matched_orders:
            encrypted_order_value = PaillierCiphertext(int(order['encrypted_order_value']), app.distribute_scema[0])
            decrypted_order_value = await decrypt_all_orders([encrypted_order_value])
            order['encrypted_order_value'] = abs(int(decrypted_order_value[0]))
        print(matched_orders)
        await execute_osmosis_matched_orders(matched_orders)
        save_orders([])
        return {"matched_orders": matched_orders, "remaining_orders": []}

    cumulative_sums = await calculate_cumulative_sums(larger_orders)
    matched_orders = []
    for order in smaller_orders:
        encrypted_order_value = PaillierCiphertext(int(order['encrypted_order_value']), app.distribute_scema[0])
        decrypted_order_value = await decrypt_all_orders([encrypted_order_value])
        matched_orders.append({
            'order_id': order['order_id'],
            'user_address': order['user_address'],
            'trader_address': order['trader_address'],
            'selectedMarket': order['selectedMarket'],
            'status': order['status'],
            'createdAt': order['createdAt'],
            'sellToken': order['sellToken'],
            'buyToken': order['buyToken'],
            'chain': order['chain'],
            'encrypted_order_value': abs(int(decrypted_order_value[0]))
        })
    

    matched_orders, updated_orders = await binary_search_and_partial_decrypt(cumulative_sums, smaller_sum, matched_orders, larger_orders)
    # print('latest',matched_orders, updated_orders)
    await execute_osmosis_matched_orders(matched_orders)
    save_orders(updated_orders)
    return {"matched_orders": matched_orders, "remaining_orders": updated_orders}

@app.post("/execute_orders")
async def execute_orders_internal(): 
    print("welcome")
    orders = load_orders()
    eth_to_usdc_orders = [order for order in orders if order['sellToken'] == app.config['TOKEN_ADDRESSES'][order['chain']]['ETH'] and order['buyToken'] == app.config['TOKEN_ADDRESSES'][order['chain']]['USDC']]
    usdc_to_eth_orders = [order for order in orders if order['sellToken'] == app.config['TOKEN_ADDRESSES'][order['chain']]['USDC'] and order['buyToken'] == app.config['TOKEN_ADDRESSES'][order['chain']]['ETH']]
    encrypted_zero = encrypt_zero(app.distribute_scema[0])

    usdc_to_eth_sum = await sum_encrypted_values(usdc_to_eth_orders)
    eth_to_usdc_sum = await sum_encrypted_values(eth_to_usdc_orders)

    usdc_to_eth_is_zero = await decrypt_all_orders([usdc_to_eth_sum - encrypted_zero])
    eth_to_usdc_is_zero = await decrypt_all_orders([eth_to_usdc_sum - encrypted_zero])

    if usdc_to_eth_is_zero[0] == 0 or eth_to_usdc_is_zero[0] == 0:
     print("Invalid orders: One of the sums is zero")
     return {"error": "Invalid orders: One of the sums is zero"}

    encrypted_diffrence = (eth_to_usdc_sum - usdc_to_eth_sum)
    decrypted_diffrence = await decrypt_all_orders([encrypted_diffrence])

    if decrypted_diffrence[0] > 0:
        larger_orders, smaller_orders = eth_to_usdc_orders, usdc_to_eth_orders
        larger_sum, smaller_sum = eth_to_usdc_sum, usdc_to_eth_sum
    elif decrypted_diffrence[0] < 0:
        larger_orders, smaller_orders = usdc_to_eth_orders, eth_to_usdc_orders
        larger_sum, smaller_sum = usdc_to_eth_sum, eth_to_usdc_sum
    else:
        matched_orders = eth_to_usdc_orders + usdc_to_eth_orders
        for order in matched_orders:
            encrypted_order_value = PaillierCiphertext(int(order['encrypted_order_value']), app.distribute_scema[0])
            decrypted_order_value = await decrypt_all_orders([encrypted_order_value])
            order['encrypted_order_value'] = abs(int(decrypted_order_value[0]))
        await execute_matched_orders(matched_orders)
        save_orders([])
        return {"matched_orders": matched_orders, "remaining_orders": []}
    
    cumulative_sums = await calculate_cumulative_sums(larger_orders)
    matched_orders = []
    for order in smaller_orders:
        encrypted_order_value = PaillierCiphertext(int(order['encrypted_order_value']), app.distribute_scema[0])
        decrypted_order_value = await decrypt_all_orders([encrypted_order_value])
        matched_orders.append({
            'user_address': order['user_address'],
            'trader_address': order['trader_address'],
            'selectedMarket': order['selectedMarket'],
            'status': order['status'],
            'createdAt': order['createdAt'],
            'sellToken': order['sellToken'],
            'buyToken': order['buyToken'],
            'chain': order['chain'],
            'encrypted_order_value': abs(int(decrypted_order_value[0]))
        })
    
    
    matched_orders, updated_orders = await binary_search_and_partial_decrypt(cumulative_sums, smaller_sum, matched_orders, larger_orders)
    await execute_matched_orders(matched_orders)
    save_orders(updated_orders)
    return {"matched_orders": matched_orders, "remaining_orders": updated_orders}

async def execute_osmosis_matched_orders(request: List[dict]):
    try:
        headers = {
            "X-CMC_PRO_API_KEY": "99e8b7ac-34a8-4b56-9ac3-a00ce4165050"
        }
        
        print("resquest", request)
        
        for order in request: 
            print("ututututututututu")
            if order['buyToken'] == 'XFI':
                print("f1")
                print(f"https://pro-api.coinmarketcap.com/v1/tools/price-conversion?symbol=USDT&amount={float(order['encrypted_order_value']/(10**6))}&convert=XFI")
                response = requests.get(f"https://pro-api.coinmarketcap.com/v1/tools/price-conversion?symbol=USDT&amount={float(order['encrypted_order_value']/(10**6))}&convert=XFI", headers=headers)
                fetched_amount = int((response.json()['data']['quote']['XFI']['price']) * (10**18))
                print("f1: ", fetched_amount)
            elif order['sellToken'] == 'XFI':
                print("f2")
                print(f"https://pro-api.coinmarketcap.com/v1/tools/price-conversion?symbol=XFI&amount={float(order['encrypted_order_value']/(10**18))}&convert=USDT")
                response = requests.get(f"https://pro-api.coinmarketcap.com/v1/tools/price-conversion?symbol=XFI&amount={float(order['encrypted_order_value']/(10**18))}&convert=USDT", headers=headers)
                fetched_amount = int((response.json()['data']['quote']['USDT']['price']) * (10**6))
                print("f2: ", fetched_amount)
            else:
                fetched_amount = 0
            message = {
                'execute_order': {
                    'order_id': order['order_id'],
                    'user_address': order['user_address'],
                    'token_in': order['sellToken'],
                    'token_out': order['buyToken'],
                    'amount_in': str(order['encrypted_order_value']),
                    'amount_out': str(fetched_amount)
                }
            }
            print("message", message)
            exe_response = requests.post("https://executor.dev.blockdudes.com/execute", json=message)
            print(exe_response.json())
        return {"message": "Orders executed on all chains"}
    except Exception as e:
        print(f"Error executing osmosis matched orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
async def execute_matched_orders(request: List[dict]):
    try:
        w3, contract = get_w3_and_contract(request[0]['chain'])
        account = Account.from_key(app.config['PRIVATE_KEY'])

        for order in request:
            nonce = w3.eth.get_transaction_count(account.address)
            response = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
            eth_price = response.json()['ethereum']['usd']
            wei_price = eth_price * 10**18  
            
            if order['buyToken'] == w3.to_checksum_address("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"):  # Replace "ETH_ADDRESS" with actual ETH address
                    # Buying ETH with USDC
                    eth_amount = buy_eth_with_usdc(order['encrypted_order_value'] , eth_price)
                    fetched_amount = int(eth_amount)
            elif order['sellToken'] == w3.to_checksum_address("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"):  # Replace "ETH_ADDRESS" with actual ETH address
                    # Selling ETH for USDC
                    usdc_amount = sell_eth_for_usdc(order['encrypted_order_value'], eth_price)
                    fetched_amount = int(usdc_amount * 10**6)
            else:
                    fetched_amount = 0  
            formatted_order = (
                order['user_address'],
                order['trader_address'],
                int(order['encrypted_order_value']),
                int(fetched_amount),
                w3.to_checksum_address(order['buyToken']),
                w3.to_checksum_address(order['sellToken']),
                int(order['createdAt']),
                int(order['status'])
            )

            txn = contract.functions.executeOrders([formatted_order]).build_transaction({
                'from': account.address,
                'chainId': w3.eth.chain_id,
                'gas': 1000000,
                'gasPrice': w3.to_wei('50', 'gwei'),
                'nonce': nonce,
            })

            signed_txn = w3.eth.account.sign_transaction(txn, app.config['PRIVATE_KEY'])
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)

            print(f"Sent order to {order['chain']} chain, tx hash: {tx_hash.hex()}")

        return {"message": "Orders executed on all chains"}
    except Exception as e:
        print(f"Error executing matched orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def periodic_task():
    while True:
        try:
            await execute_orders_osmosis_internal()
        except Exception as e:
            print(f"Error in periodic task: {e}")
        await asyncio.sleep(10) 

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.distribute_scema = await setup()
    task = asyncio.create_task(periodic_task())
    try:
        yield
    finally:
        task.cancel()
        await task

app.router.lifespan_context = lifespan

if __name__ == "__main__":
    config = uvicorn.Config("main:app", port=5000, log_level="info", reload=True)
    server = uvicorn.Server(config)
    asyncio.run(server.serve())