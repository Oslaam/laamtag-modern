import { NextApiRequest } from 'next';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

const getAdminWallets = () => (process.env.ADMIN_WALLETS || "").split(',');

export const isWalletAdmin = (address: string) => {
  if (!address) return false;
  return getAdminWallets().includes(address);
};

// This helper is used by your API routes (like pending.ts)
export const isAdmin = async (req: NextApiRequest) => {
  const userWallet = req.headers['x-admin-wallet'] as string;
  if (!userWallet) return false;
  return isWalletAdmin(userWallet);
};

export function verifyAdminSignature(
  address: string, 
  signature: string, 
  message: string
): boolean {
  if (!isWalletAdmin(address)) return false;
  
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(address).toBytes();
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (e) {
    console.error("Auth Signature Error:", e);
    return false;
  }
}