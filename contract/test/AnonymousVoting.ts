import { expect } from "chai";
import { AbiCoder } from "ethers";
import hre, { ethers } from "hardhat";

describe("AnonymousVoting", function () {
    async function deployContractFixture() {
        const [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();

        const BuzzCoin = await hre.ethers.getContractFactory("BuzzCoin");
        const buzzCoin = await BuzzCoin.deploy(1000000);

        const AnonymousVoting = await hre.ethers.getContractFactory(
            "AnonymousVoting"
        );
        const contract = await AnonymousVoting.deploy(buzzCoin.getAddress());

        return { buzzCoin, contract, owner, addr1, addr2, addr3 };
    }

    describe("Deployment", function () {
        it("Should deploy the contract in the correct state", async function () {
            const { contract } = await deployContractFixture();

            expect(await contract.votingState()).to.equal(0);
        });

        it("Should set the the right owner", async function () {
            const { contract, owner } = await deployContractFixture();

            expect(await contract.owner()).to.equal(owner.address);
        });
    });

    describe("Voting", function () {
        describe("Start Voting", async function () {
            it("Should allow the owner to start the voting", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await expect(
                    contract.connect(owner).startVoting(options, 3600)
                ).to.emit(contract, "VotingStarted");
            });

            it("Should not allow non-owner to start voting", async function () {
                const { contract, addr1 } = await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await expect(
                    contract.connect(addr1).startVoting(options, 3600)
                ).to.be.revertedWith("Only owner can call this function!");
            });

            it("Should not allow owner to start a voting when one is already started", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                await expect(
                    contract.connect(owner).startVoting(options, 3600)
                ).to.be.revertedWith("Invalid state!");
            });

            it("Should not allow starting a voting with less than 2 options", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = [ethers.encodeBytes32String("Option1")];

                await expect(
                    contract.connect(owner).startVoting(options, 3600)
                ).to.be.revertedWith("Must have at least 2 voting options!");
            });

            it("Should allow starting a vote with duplicate answers", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option1"),
                ];

                await expect(
                    contract.connect(owner).startVoting(options, 3600)
                ).to.emit(contract, "VotingStarted");
            });
        });
        describe("Finish Voting", function () {
            it("Should finish the vote when time runs out", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await contract.finishVoting();
                expect(await contract.votingState()).to.equal(2);
            });

            it("Should determine the correct winner", async function () {
                const { buzzCoin, contract, owner, addr1, addr2, addr3 } =
                    await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseUnits("100", 18);
                await buzzCoin.transfer(addr1.address, amount);
                await buzzCoin.transfer(addr2.address, amount);
                await buzzCoin.transfer(addr3.address, amount);

                await contract.connect(addr1).vote(options[0]);
                await contract.connect(addr2).vote(options[1]);
                await contract.connect(addr3).vote(options[1]);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);
                await contract.finishVoting();

                const winner = await contract.getWinner();
                expect(winner).to.equal(ethers.encodeBytes32String("Option2"));
            });

            it("Should not allow finishing the vote before the voting period has ended", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                await expect(contract.finishVoting()).to.be.revertedWith(
                    "Voting has not ended yet!"
                );
            });

            it("Should not allow finishing a vote when it has not started", async function () {
                const { contract } = await deployContractFixture();

                await expect(contract.finishVoting()).to.be.revertedWith(
                    "Voting has not started yet!"
                );
            });
        });

        describe("Vote", function () {
            it("Should allow token holders to vote", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseUnits("100", 18);
                await buzzCoin.transfer(addr1.address, amount);

                expect(await contract.connect(addr1).vote(options[0])).to.emit(
                    contract,
                    "VoteCast"
                );
            });

            it("Should not allow non-token holders to vote", async function () {
                const { contract, owner, addr1 } =
                    await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                await expect(
                    contract.connect(addr1).vote(options[0])
                ).to.be.revertedWith("Must hold BuzzCoin to vote!");
            });

            it("Should not allow voting twice", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseUnits("100", 18);
                await buzzCoin.transfer(addr1.address, amount);

                await contract.connect(addr1).vote(options[0]);

                await expect(
                    contract.connect(addr1).vote(options[0])
                ).to.be.revertedWith("You have already voted!");
            });

            it("Should not allow voting with an invalid option", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseUnits("100", 18);
                await buzzCoin.transfer(addr1.address, amount);

                const invalidOption =
                    ethers.encodeBytes32String("InvalidOption");

                await expect(
                    contract.connect(addr1).vote(invalidOption)
                ).to.be.revertedWith("Invalid vote option!");
            });

            it("Should not allow voting after the voting period has ended", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = [
                    ethers.encodeBytes32String("Option1"),
                    ethers.encodeBytes32String("Option2"),
                    ethers.encodeBytes32String("Option3"),
                ];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseUnits("100", 18);
                await buzzCoin.transfer(addr1.address, amount);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await expect(
                    contract.connect(addr1).vote(options[0])
                ).to.be.revertedWith("Voting has ended!");
            });
        });

        describe("Get Winner", function () {
            it("Should revert when called before voting has ended", async function () {
                const { contract, owner } = await deployContractFixture();

                await expect(contract.getWinner()).to.be.revertedWith(
                    "Voting has not ended yet!"
                );
            });
        });
    });
});
