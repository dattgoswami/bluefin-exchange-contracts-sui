export const OWNERSHIP_ERROR = (
    objId: string,
    ownerId: string,
    signerId: string
) => {
    //     return `Error executing transaction with request type: Error: RPC Error: Failed to process transaction on a quorum of validators to form a transaction certificate. Locked objects: {}. Validator errors: [
    //     "Error checking transaction input objects: [IncorrectSigner { error: \\"Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}\\" }]",
    // ]}`;

    return `Error executing transaction with request type: Error: RPC Error: Failed to process transaction on a quorum of validators to form a transaction certificate. Locked objects: {}. Validator errors: [
    "Error checking transaction input objects: [IncorrectSigner { error: \\"Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}\\" }]",
    "Error checking transaction input objects: [IncorrectSigner { error: \\"Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}\\" }]",
    "Error checking transaction input objects: [IncorrectSigner { error: \\"Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}\\" }]",
]}`;
};

export const ERROR_CODES = {
    "1": "Minimum order price must be > 0",
    "2": "Minimum trade price must be < maximum trade price",
    "3": "Maker: Trade price is < min allowed price",
    "4": "Maker: Trade price is > max allowed price",
    "5": "Maker: Trade price does not conforms to allowed tick size",
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
    "25": "Maker: OI open for selected leverage > max allowed oi open",
    "26": "Maker: OI open for selected leverage > max allowed oi open",
    "27": "Sender does not have permissions for the taker",
    "28": "Maker: Order was already canceled",
    "29": "Taker: Order was already canceled",
    "30": "Maker: Order has invalid signature",
    "31": "Taker: Order has invalid signature",
    "32": "Maker: Order has expired",
    "33": "Taker: Order has expired",
    "34": "Maker: Fill price is invalid",
    "35": "Taker: Fill price is invalid",
    "36": "Maker: Order trigger price has not been reached",
    "37": "Taker: Order trigger price has not been reached",
    "38": "Maker: Fill does not decrease size",
    "39": "Taker: Fill does not decrease size",
    "40": "Maker: Invalid leverage",
    "41": "Taker: Invalid leverage",
    "42": "Maker: Leverage must be > 0",
    "43": "Taker: Leverage must be > 0",
    "44": "Maker: Cannot overfill order",
    "45": "Taker: Cannot overfill order",
    "46": "Maker: Cannot trade when loss exceeds margin. Please add margin",
    "47": "Taker: Cannot trade when loss exceeds margin. Please add margin",
    "48": "Taker: Order can not be of the same side as Maker"
};
