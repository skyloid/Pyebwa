import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from '../idl/pyebwa_token.json';

const PROGRAM_ID = new PublicKey(process.env.REACT_APP_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

export const useProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [program, setProgram] = useState<Program | null>(null);

  useEffect(() => {
    if (!wallet || !wallet.publicKey || !wallet.signTransaction) {
      setProgram(null);
      return;
    }

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );

    try {
      const program = new Program(idl as Idl, PROGRAM_ID, provider);
      setProgram(program);
    } catch (error) {
      console.error('Error setting up program:', error);
      setProgram(null);
    }
  }, [connection, wallet]);

  return program;
};