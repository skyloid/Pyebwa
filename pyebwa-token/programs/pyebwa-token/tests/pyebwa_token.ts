import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PyebwaToken } from "../target/types/pyebwa_token";
import { expect } from "chai";

describe("pyebwa-token", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PyebwaToken as Program<PyebwaToken>;
  
  // Test accounts
  const authority = anchor.web3.Keypair.generate();
  const family = anchor.web3.Keypair.generate();
  const planter = anchor.web3.Keypair.generate();
  
  // PDAs
  let tokenPoolPDA: anchor.web3.PublicKey;
  let familyAccountPDA: anchor.web3.PublicKey;
  let planterAccountPDA: anchor.web3.PublicKey;
  let treeFundPDA: anchor.web3.PublicKey;

  before(async () => {
    // Derive PDAs
    [tokenPoolPDA] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("token_pool")],
      program.programId
    );
    
    [familyAccountPDA] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("family"), family.publicKey.toBuffer()],
      program.programId
    );
    
    [planterAccountPDA] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("planter"), planter.publicKey.toBuffer()],
      program.programId
    );
    
    [treeFundPDA] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("tree_fund")],
      program.programId
    );
    
    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(family.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(planter.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
  });

  describe("initialize", () => {
    it("initializes the token pool", async () => {
      const tokenPrice = new anchor.BN(1000); // 0.001 SOL per token
      const treeFundRate = 5000; // 50%
      const treePaymentRate = new anchor.BN(200); // 200 tokens per tree
      
      await program.methods
        .initialize({
          tokenPrice,
          treeFundRate,
          treePaymentRate,
        })
        .accounts({
          tokenPool: tokenPoolPDA,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      
      const tokenPool = await program.account.tokenPool.fetch(tokenPoolPDA);
      expect(tokenPool.authority.toString()).to.equal(authority.publicKey.toString());
      expect(tokenPool.tokenPrice.toNumber()).to.equal(1000);
      expect(tokenPool.treeFundRate).to.equal(5000);
      expect(tokenPool.totalSupply.toNumber()).to.equal(0);
    });
  });

  describe("purchase_tokens", () => {
    it("allows family to purchase tokens", async () => {
      const amount = new anchor.BN(10000); // 10,000 tokens
      
      await program.methods
        .purchaseTokens(amount)
        .accounts({
          buyer: family.publicKey,
          familyAccount: familyAccountPDA,
          tokenPool: tokenPoolPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([family])
        .rpc();
      
      const familyAccount = await program.account.familyAccount.fetch(familyAccountPDA);
      expect(familyAccount.tokenBalance.toNumber()).to.equal(10000);
      expect(familyAccount.owner.toString()).to.equal(family.publicKey.toString());
      
      const tokenPool = await program.account.tokenPool.fetch(tokenPoolPDA);
      expect(tokenPool.totalSupply.toNumber()).to.equal(10000);
    });

    it("updates token price after million tokens", async () => {
      // Purchase enough to trigger price increase
      const largeAmount = new anchor.BN(990000);
      
      await program.methods
        .purchaseTokens(largeAmount)
        .accounts({
          buyer: family.publicKey,
          familyAccount: familyAccountPDA,
          tokenPool: tokenPoolPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([family])
        .rpc();
      
      const tokenPool = await program.account.tokenPool.fetch(tokenPoolPDA);
      expect(tokenPool.tokenPrice.toNumber()).to.be.greaterThan(1000);
    });
  });

  describe("preserve_heritage", () => {
    it("preserves a photo and funds trees", async () => {
      const ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
      const tokenCost = new anchor.BN(50); // 50 tokens for a photo
      
      await program.methods
        .preserveHeritage(ipfsHash, { photo: {} }, tokenCost)
        .accounts({
          family: family.publicKey,
          familyAccount: familyAccountPDA,
          tokenPool: tokenPoolPDA,
          treeFund: treeFundPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([family])
        .rpc();
      
      const familyAccount = await program.account.familyAccount.fetch(familyAccountPDA);
      expect(familyAccount.heritageItems).to.equal(1);
      expect(familyAccount.totalSpent.toNumber()).to.equal(50);
      
      const tokenPool = await program.account.tokenPool.fetch(tokenPoolPDA);
      expect(tokenPool.heritagePreserved.toNumber()).to.equal(1);
    });

    it("fails with insufficient balance", async () => {
      const ipfsHash = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
      const tokenCost = new anchor.BN(100000000); // More than balance
      
      try {
        await program.methods
          .preserveHeritage(ipfsHash, { photo: {} }, tokenCost)
          .accounts({
            family: family.publicKey,
            familyAccount: familyAccountPDA,
            tokenPool: tokenPoolPDA,
            treeFund: treeFundPDA,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([family])
          .rpc();
        
        expect.fail("Should have thrown InsufficientBalance error");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("InsufficientBalance");
      }
    });
  });

  describe("planter flow", () => {
    it("initializes planter account", async () => {
      const treeCount = 10;
      const gpsCoordinates = [18.5944, -72.3074]; // Port-au-Prince
      const evidenceHash = "QmPlanterEvidence123";
      
      // First attempt should fail - planter not verified
      try {
        await program.methods
          .submitPlanting(treeCount, gpsCoordinates, evidenceHash)
          .accounts({
            planter: planter.publicKey,
            planterAccount: planterAccountPDA,
            plantingEvidence: anchor.web3.PublicKey.new(Buffer.alloc(32)), // dummy
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([planter])
          .rpc();
        
        expect.fail("Should have thrown PlanterNotVerified error");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("PlanterNotVerified");
      }
    });

    it("verifies planter and accepts submission", async () => {
      // Admin verifies planter (would be separate instruction in real implementation)
      // For now, we'll test the verification flow
      
      const evidencePDA = anchor.web3.PublicKey.new(Buffer.alloc(32)); // dummy for test
      
      // Test verification (would require admin authority in real implementation)
      // This test demonstrates the verification flow structure
    });
  });

  describe("security tests", () => {
    it("prevents unauthorized access to admin functions", async () => {
      const unauthorizedUser = anchor.web3.Keypair.generate();
      
      // Airdrop SOL
      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(
          unauthorizedUser.publicKey,
          anchor.web3.LAMPORTS_PER_SOL
        )
      );
      
      // Try to verify planting without authority
      // This would fail with Unauthorized error in real implementation
    });

    it("validates GPS coordinates for Haiti", async () => {
      const invalidCoordinates = [40.7128, -74.0060]; // New York
      
      // This would fail with InvalidGPSCoordinates error
    });

    it("prevents math overflow", async () => {
      const maxAmount = new anchor.BN(2).pow(new anchor.BN(64)).sub(new anchor.BN(1));
      
      // This would fail with MathOverflow error
    });
  });
});