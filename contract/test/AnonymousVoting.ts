import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("AnonymousVoting", function () {
    async function deployContractFixture() {
        const [owner, addr1, addr2] = await hre.ethers.getSigners();

        const BuzzCoin = await hre.ethers.getContractFactory("BuzzCoin");
        const buzzCoin = await BuzzCoin.deploy(1000000);

        const AnonymousVoting = await hre.ethers.getContractFactory(
            "AnonymousVoting"
        );
        const contract = await AnonymousVoting.deploy(buzzCoin, 3600);

        return { buzzCoin, contract, owner, addr1, addr2 };
    }

    describe("Voting", function () {
        it("Should allow token holders to vote", async function () {
            const { buzzCoin, contract, addr1 } = await deployContractFixture();
            const voteHash = ethers.keccak256(ethers.toUtf8Bytes("vote1"));

            const amount = hre.ethers.parseUnits("100", 18);
            await buzzCoin.transfer(addr1.address, amount);

            expect(await contract.connect(addr1).castVote(voteHash)).to.emit(
                contract,
                "VoteCast"
            );
        });

        it("Should not allow non-token holders to vote", async function () {
            const { contract, addr2 } = await deployContractFixture();
            const voteHash = ethers.keccak256(ethers.toUtf8Bytes("vote1"));

            await expect(
                contract.connect(addr2).castVote(voteHash)
            ).to.be.revertedWith("Must hold BuzzCoin to vote!");
        });

        it("Should not allow voting twice", async function () {
            const { buzzCoin, contract, addr1 } = await deployContractFixture();
            const voteHash = ethers.keccak256(ethers.toUtf8Bytes("vote1"));

            const amount = hre.ethers.parseUnits("100", 18);
            await buzzCoin.transfer(addr1.address, amount);

            await buzzCoin.connect(addr1).approve(contract, 100);
            await contract.connect(addr1).castVote(voteHash);

            await expect(
                contract.connect(addr1).castVote(voteHash)
            ).to.be.revertedWith("Already voted");
        });

        it("Should not allow voting after the voting period has ended", async function () {
            const { buzzCoin, contract, addr1 } = await deployContractFixture();
            const voteHash = ethers.keccak256(ethers.toUtf8Bytes("vote1"));

            const amount = hre.ethers.parseUnits("100", 18);
            await buzzCoin.transfer(addr1.address, amount);

            await ethers.provider.send("evm_increaseTime", [3601]);
            await ethers.provider.send("evm_mine");

            await expect(
                contract.connect(addr1).castVote(voteHash)
            ).to.be.revertedWith("Voting has ended.");
        });
    });

    describe("Results", function () {
        it("Should return the correct vote count", async function () {
            const { buzzCoin, contract, addr1, addr2 } =
                await deployContractFixture();
            const voteHash = ethers.keccak256(ethers.toUtf8Bytes("vote1"));

            const amount = hre.ethers.parseUnits("100", 18);
            await buzzCoin.transfer(addr1.address, amount);
            await buzzCoin.transfer(addr2.address, amount);

            await contract.connect(addr1).castVote(voteHash);
            await contract.connect(addr2).castVote(voteHash);

            expect(await contract.getVoteCount(voteHash)).to.equal(2);
        });
    });
});
