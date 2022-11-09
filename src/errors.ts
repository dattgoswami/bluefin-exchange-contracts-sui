// TODO break strings error strings in to multiple lines

export const OWNERSHIP_ERROR = (
    objId: string,
    ownerId: string,
    signerId: string
) => {
    return `Error executing transaction with request type: Error: RPC Error: Internal error - Error checking transaction input objects: [IncorrectSigner { error: "Object ${objId} is owned by account address ${ownerId}, but signer address is ${signerId}" }]}`;
};

export const ERROR_CODES = {
    "1": "Minimum order price must be > 0",
    "2": "Minimum trade price must be < maximum trade price",
    "3": "Trade price is < min allowed price",
    "4": "Trade price is > max allowed price"
};
