export const add_chain = async (chain) => {
    try {
        if (chain === "osmosis") {
            await window.keplr.experimentalSuggestChain({
                chainId: "osmo-test-5",
                chainName: "Osmosis Testnet 5",
                rpc: "https://rpc.osmotest5.osmosis.zone:443",
                rest: "https://lcd.osmotest5.osmosis.zone:1317",
                bip44: {
                    coinType: 118,
                },
                bech32Config: {
                    bech32PrefixAccAddr: "osmo",
                    bech32PrefixAccPub: "osmo" + "pub",
                    bech32PrefixValAddr: "osmo" + "valoper",
                    bech32PrefixValPub: "osmo" + "valoperpub",
                    bech32PrefixConsAddr: "osmo" + "valcons",
                    bech32PrefixConsPub: "osmo" + "valconspub",
                },
                currencies: [
                    {
                        coinDenom: "OSMO",
                        coinMinimalDenom: "uosmo",
                        coinDecimals: 6,
                        coinGeckoId: "osmosis",
                    },
                ],
                feeCurrencies: [
                    {
                        coinDenom: "OSMO",
                        coinMinimalDenom: "uosmo",
                        coinDecimals: 6,
                        coinGeckoId: "osmosis",
                        gasPriceStep: {
                            low: 0.01,
                            average: 0.025,
                            high: 0.04,
                        },
                    },
                ],
                stakeCurrency: {
                    coinDenom: "OSMO",
                    coinMinimalDenom: "uosmo",
                    coinDecimals: 6,
                    coinGeckoId: "osmosis",
                },
            });
        }

        if (chain === "archway") {
            await window.keplr.experimentalSuggestChain({
                chainId: "constantine-3",
                chainName: 'Constantine Testnet',
                rpc: 'https://rpc.constantine.archway.io:443',
                rest: 'https://api.constantine.archway.tech',
                bip44: {
                    coinType: 118,
                },
                bech32Config: {
                    bech32PrefixAccAddr: 'archway',
                    bech32PrefixAccPub: 'archwaypub',
                    bech32PrefixValAddr: 'archwayvaloper',
                    bech32PrefixValPub: 'archwayvaloperpub',
                    bech32PrefixConsAddr: 'archwayvalcons',
                    bech32PrefixConsPub: 'archwayvalconspub',
                },
                currencies: [
                    {
                        coinDenom: 'CONST',
                        coinMinimalDenom: 'aconst',
                        coinDecimals: 18,
                    },
                ],
                feeCurrencies: [
                    {
                        coinDenom: 'CONST',
                        coinMinimalDenom: 'aconst',
                        coinDecimals: 18,
                        gasPriceStep: {
                            low: 0.01,
                            average: 0.025,
                            high: 0.04,
                        },
                    },
                ],
                stakeCurrency: {
                    coinDenom: 'CONST',
                    coinMinimalDenom: 'aconst',
                    coinDecimals: 18,
                    coinGeckoId: "archway"
                },
            });
        }
    } catch (error) {
        console.log(error)
    }
}