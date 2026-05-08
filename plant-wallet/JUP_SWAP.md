# Code to implement investing idle usdc into yield generating token

### assume

primary wallet = 5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj

### constants

USDC = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
JLP = 27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4
jup api key = jup_90f21b571b28c78317183d9150b510bf0a7db1fae596a212cfc7bcef7f110790

## Get Transaction to swap 1 USDC

note: amount take 10^6 multiplier

curl -X GET "https://api.jup.ag/swap/v2/order?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4&amount=1000000&taker=5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj" -H "x-api-key: jup_90f21b571b28c78317183d9150b510bf0a7db1fae596a212cfc7bcef7f110790"

{"swapMode":"ExactIn","inputMint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","outputMint":"27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4","inAmount":"100000","outAmount":"25340","otherAmountThreshold":"25213","slippageBps":50,"priceImpactPct":"0.006419565454545266","priceImpact":0.6419565454545266,"routePlan":[{"percent":100,"bps":10000,"usdValue":0.09998743173763347,"swapInfo":{"ammKey":"proVF4pMXVaYqmy4NjniPh4pqKNfMmsihgd4wdkCX3u","label":"OKX DEX Router","inputMint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","outputMint":"27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4","inAmount":"100000","outAmount":"25340"}}],"feeMint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","feeBps":0,"platformFee":{"feeBps":0,"feeMint":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},"signatureFeeLamports":5000,"signatureFeePayer":"5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj","prioritizationFeeLamports":174812,"prioritizationFeePayer":"5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj","rentFeeLamports":2039280,"rentFeePayer":"5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj","swapType":"aggregator","router":"okx","guaranteedPrice":false,"transaction":"AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAEB0HIIAV8AJ0Iwaie0lhCySSniFRqQfLI2pKAcNT6FCeWQmYLDOLR08Yv7RCfl0EQgWQkdHPu99kNns39gaTDgE+SWNkda/+xrKsUFXVnLqujQwZC5XHxdfakblG2jD206YyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAK8cNDIYjKOmNRNaE6GJUazr1an2A9qHheCBhiikWjdwxCm9fBj1D4FW2a/Bzd5y32aNmrO+yva1cNV2ZkWtnIC4H6XeBNmn3qDVfprMr7WJZ0RZBZTj9x9mFMx3RKLoYEBAAFAli1BgAEAAkDOBEGAAAAAAADBgABACAjKgEBBkAAAgElIAYGHBseKioDIywGKBwbGhcnJBgWGRkZKh8cGh0qKiIKKSYLCQwNCAchHB0eERITEA4qKyIpIBUPIxQFOaopVbGEUB819OerOwAAAACghgEAAAAAAPtiAAAAAAAAMgADAAAAEhAnARAQJxILECcjAAAAAAAAAAQcOzIp2bzAPEnInH5gW8CtHhhfujK+uiVL3SRGdDw/UQcOHAwIBRobAQB7rrZNNQOGf9OqFcqtvKnvBMF+Reo4Zcc0f+cclrtKeQgKCAQGCwMCDwMNBwyKAcoMztn1Sm5Yk0EgMkxufiSdjSau16MCh6zMVbSMUgQECQUHCQ4DBggBAgoAJ/5XS8kyXn/LAdgLONC/BXP4Eu2yPj92BilLHUe8rkEOBQQDAQIsAXE=","lastValidBlockHeight":"396498052","gasless":false,"jitOptimized":false,"requestId":"019e07c7-8589-734c-a7e4-546473535fad","taker":"5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj","inUsdValue":0.09998743173763347,"outUsdValue":0.10062930760030508,"swapUsdValue":0.09998743173763347,"mode":"ultra","totalTime":741}

## execute transaction using zerion

figure out a way use env.private_key to sign txn. (do not use zerion)

### inject signature and serialize

import { VersionedTransaction, PublicKey } from "@solana/web3.js";

const txBase64 = "AQAAAAAAAAAAAA...";
const sigHex = "67aa2698...";
const pubkey = "5RnVY4jqrWfhnHNSyAhRJBXYDKoGHVbr6gF71du1ejwj";

const txBuffer = Buffer.from(txBase64, "base64");
const tx = VersionedTransaction.deserialize(txBuffer);

// Inject signature
const sigBytes = Buffer.from(sigHex, "hex");
tx.addSignature(
new PublicKey(pubkey),
sigBytes
);

const signedTxBase64 = Buffer.from(tx.serialize()).toString("base64");
console.log(signedTxBase64);

### execute

curl -X POST "https://api.jup.ag/swap/v2/execute" -H "Content-Type: application/json" -H "x-api-key:jup_90f21b571b28c78317183d9150b510bf0a7db1fae596a212cfc7bcef7f11079" -d '{ "signedTransaction": "ASzIfCikuBGobxrI7Ku30R3BBbSayngvbaKX9CTHpqP8CBLQHMcMZGaMrKGj4IEIi4uL5Vf4va5w5nOzNwZY7QqAAQAFDUHIIAV8AJ0Iwaie0lhCySSniFRqQfLI2pKAcNT6FCeWFNw3LKzxuiCpcDR+/JdgjvQ6dcHTO7dPkjt0nolvARVCZgsM4tHTxi/tEJ+XQRCBZCR0c+732Q2ezf2BpMOAT3GfxPRRe1cCBCDSk7uk4a9ytXJHoBSgy2gWBE3f6g0Ag03LaokQyzSj4v1W7UKqD0QxmH/fTYUq+NeuwC4lqZ6SWNkda/+xrKsUFXVnLqujQwZC5XHxdfakblG2jD206bYatxlSPvdx93eCdtOOJgNkSqT7xilTgXmqfCcuraD8ziWNjdmInLrA2k5z/a6hBLAJ3pz/gVVijfOhT7jlFcIj8S7F8EYz6cdfy4PEt2nCLbcuj2I67fHi9HN+gSuvWIyXJY9OJInxuz0QKRSODYMLWhOZ2v8QhASOe9jb6fhZAwZGb+UhFzL/7K26csOb57yM5bvF9xJrLEObOkAAAAAEedVb8jHAbu50xW7OaBUH/bGy3qP0jlECsc2iVrwTjwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpGRHIL2MZLOzgfSgR0yNZGc9gjZu93yDu36Q8o5DWhdoHCgAFAtgnCgAKAAkDPNotAAAAAAALBQYAKgwmCZPxe2T0hK52/gkGAAEAMyYMAQEJBgACACsmDAEBC1MABQIoKwwMCycLNAAiAQUhIzMoMTI1DAwlDw0OEBEFAQAMNSQALhgFAR0WFwwbHBkaCy8AIB4fBgEMDDUwCy0VCBIUBgIrKhMtAAwMLC0HBAMLKUi7ZPrMMcSvFEBCDwAAAAAA5dgDAAAAAAAyAAAAAAADAAAAkgMAAAAIARAnAAAGAAAAAAQAAAAAFAQQJwABjQAQJwECJhAnAgMMAwYAAAEJBhRX4NHOQpCzV3mQVQKHVvD+Hz5/4Xrk/nlbuQhEFiWZBVtZWl9cAhdeKb+VBypPvwTfcXWT5zi8zCEnKBXCRxqA2fn1VbDUhCUABRMAKAEXSJ8uMQh4iwFBA7dgSqdU4V/K1SvI3niWxhw1HgLlKlUEg0NHgQNERkqgqd3JaCRtQMktfdmSmBGEM8YemgUjmKMcWrKmKKTvzwhBHT08Fj4/GgEXv5bM8BQlnot0nMI9bEust1mxWZ+Jt07F25Euxd0BZmMD19HQArCz3UDLjSWiR7/tOMfA+EoPNrP1tz3kWPHSsN0YqYH6sKkDEhcUBRMVGBsW", "requestId": "019e07d3-fed8-7789-b473-2ead5f70ad84" }'
