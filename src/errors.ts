export const OWNERSHIP_ERROR = (
    objId: string,
    ownerId: string,
    signerId: string
) => {
    return `Error executing transaction with request type: Error: RPC Error: Failed to process transaction on a quorum of validators to form a transaction certificate. Locked objects: {}. Validator errors: [
    "Error checking transaction input objects: [IncorrectSigner { error: \\"Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}\\" }]",
]}`;
};

export const ERROR_CODES = {
    "1": "Minimum order price must be > 0",
    "2": "Minimum trade price must be < maximum trade price",
    "3": "Trade price is < min allowed price (Maker At Fault)",
    "4": "Trade price is > max allowed price (Maker At Fault)",
    "5": "Trade price does not conforms to allowed tick size (Maker At Fault)",
    "6": "User already has a position object",
    "7": "Operator already whitelisted as settlement operator",
    "8": "Operator does not exist",
    "9": "Maximum trade price must be > min trade price",
    "10": "Step Size must be > 0",
    "11": "Tick Size Must be > 0",
    "12": "Market Take Bound for long trades must be > 0",
    "13": "Market Take Bound for short trades must be > 0",
    "14": "Market Take Bound for short trades must be < 100%",
    "15": "Maximum Limit Trade quantity must be > minimum trade quantity",
    "16": "Maximum Market Trade quantity must be > minimum trade quantity",
    "17": "Minimum trade quantity must be < max trade quantity",
    "18": "Minimum trade quantity must be > 0",
    "19": "Trade quantity is < min tradeable quantity",
    "20": "Trade quantity is > max allowed limit quantity",
    "21": "Trade quantity is > max allowed market quantity",
    "22": "Trade quantity does not conforms to allowed step size",
    "23": "Trade price is > Market Take Bound for long side",
    "24": "Trade price is < Market Take Bound for short side",
    "25": "OI open for selected leverage > max allowed oi open"
};
