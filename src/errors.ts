
export const OWNERSHIP_ERROR = (objId:string, ownerId:string, signerId:string) => {
    return `Error executing transaction with request type: Error: RPC Error: Failed to process transaction on a quorum of validators to form a transaction certificate. Locked objects: {}. Validator errors: [
    "Error checking transaction input objects: [IncorrectSigner { error: \\"Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}\\" }]",
]}`
} 




export const ERROR_CODES = {
    '1': "Minimum order price must be > 0",
    '2': "Minimum trade price must be < maximum trade price",
    '3': "Trade price is < min allowed price (Maker At Fault)",
    '4': "Trade price is > max allowed price (Maker At Fault)",
    '5': "Trade price does not conforms to allowed tick size (Maker At Fault)",
}
