## Project Description: Soldex

### Overview
Soldex is revolutionizing the way traders operate within the decentralized finance (DeFi) space. By addressing the critical issues of transparency and market manipulation, Soldex offers a secure and private trading environment that significantly reduces the risks faced by large traders. Our innovative platform introduces the first decentralized on-chain dark pool with leverage, providing a privacy-preserving way to trade cryptocurrencies.

### Problem Statement
Public transactions on blockchain platforms, while beneficial for transparency, pose significant challenges for traders. Issues such as Miner Extractable Value (MEV) attacks, order manipulation, and market panic due to public transactions result in substantial financial losses. Currently, traders face billions of dollars in losses due to these problems.

### Solution
Soldex offers a unique solution by creating a decentralized dark pool for trading cryptocurrencies with leverage. Inspired by the success of dark pools in traditional stock trading—where nearly 40% of trade volume occurs—we are building the first such platform for DeFi. Soldex ensures pre-trade transparency, preventing others from seeing trade intentions before execution, thereby protecting traders from MEV, quote fading, and other manipulations.

### Key Features
1. **Decentralized Dark Pool**: Enables private trading of assets on-chain.
2. **Leverage Trading**: Allows traders to borrow up to 10x their collateral for leveraged trading.
3. **Privacy-Preserving**: Utilizes encrypted orders and MPC (Multi-Party Computation) matchers to secure transactions.
4. **Automated Liquidation**: Ensures that leveraged positions are automatically liquidated if they fall below the health threshold.

### Technical Architecture
Traders deposit collateral into the Soldex exchange contract, which enables them to borrow up to 10x the collateral amount in vTokens. These vTokens can be used to create encrypted orders for trading, which are then matched by our MPC matchers using a volume batching algorithm. Orders are executed on-chain at market prices, maintaining privacy and security throughout the process.

### Impact
Soldex aims to address one of the biggest pain points in crypto trading by providing a secure and private trading environment. This solution can save traders billions of dollars, attract more funds from centralized exchanges to DeFi, and increase overall crypto trading volume. Additionally, it offers the potential to bring stock and other asset trading on-chain, away from the centralized control of traditional dark pools.

### Why Solana?
We have chosen Solana, Solana Chain is built on Tendermint Core, which makes it secure, fraud-resistant, allows high throughput, all of these features enabling unlimited scaling opportunities. Cosmos and EVM are the integral parts of Solana Chain. Solana interoperability and robust infrastructure make it an ideal foundation for Soldex.

### Conclusion
Soldex is poised to transform DeFi trading by introducing a secure, private, and leveraged trading platform. By solving critical issues faced by traders, Soldex can lead to increased participation and efficiency in the crypto market, ultimately building a better DeFi ecosystem.

Join us in building a better DeFi together.