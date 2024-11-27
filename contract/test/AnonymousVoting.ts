import { expect } from "chai";
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

                await expect(
                    contract
                        .connect(owner)
                        .startVoting(["Option 1", "Option 2"], 60)
                ).to.emit(contract, "VotingStarted");
            });

            it("Should not allow non-owner to start voting", async function () {
                const { contract, addr1 } = await deployContractFixture();

                await expect(
                    contract
                        .connect(addr1)
                        .startVoting(["Option 1", "Option 2"], 60)
                ).to.be.revertedWith("Only the owner can call this function!");
            });

            it("Should not allow owner to start a voting when one is already started", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                await expect(
                    contract
                        .connect(owner)
                        .startVoting(["Option 1", "Option 2"], 60)
                ).to.be.revertedWith("Invalid state!");
            });

            it("Should not allow starting a voting with less than 2 options", async function () {
                const { contract, owner } = await deployContractFixture();

                await expect(
                    contract.connect(owner).startVoting(["Option 1"], 60)
                ).to.be.revertedWith("Must have at least 2 voting options!");
            });

            it("Should allow starting a vote with duplicate answers", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                expect(
                    await contract.connect(owner).startVoting(options, 3600)
                ).to.emit(contract, "VotingStarted");
            });
        });
        describe("Finish Voting", function () {
            it("Should finish the vote when time runs out", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                await contract.connect(owner).startVoting(options, 3600);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await contract.finishVoting();
                expect(await contract.votingState()).to.equal(2);
            });

            it("Should determine the correct winner", async function () {
                const { buzzCoin, contract, owner, addr1, addr2, addr3 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);
                await buzzCoin.transfer(addr2.address, amount);
                await buzzCoin.transfer(addr3.address, amount);
                await buzzCoin
                    .connect(addr3)
                    .approve(contract.getAddress(), amount);

                await contract.connect(addr1).vote("Option1");
                await contract.connect(addr2).vote("Option2");
                await contract.connect(addr3).vote("Option2");

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);
                await contract.finishVoting();

                const winner = await contract.getWinner();
                expect(winner).to.equal("Option2");
            });

            it("Should not finish voting if time has not ended", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                await contract.connect(owner).startVoting(options, 3600);

                await expect(contract.finishVoting()).to.be.revertedWith(
                    "Voting is still ongoing!"
                );
            });

            it("Should not allow finishing a vote when it has not started", async function () {
                const { contract } = await deployContractFixture();

                await expect(contract.finishVoting()).to.be.revertedWith(
                    "Invalid state!"
                );
            });

            it("Should do nothing if voting is already finished", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                await contract.connect(addr1).vote("Option1");

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await contract.finishVoting();

                expect(await contract.votingState()).to.equal(2);
            });

            it("Should handle no votes cast and finish voting gracefully", async function () {
                const { contract, owner } = await deployContractFixture();

                await contract
                    .connect(owner)
                    .startVoting(["Option1", "Option2"], 3600);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await contract.finishVoting();

                expect(await contract.votingState()).to.equal(2);
                expect(await contract.getWinner()).to.equal("Tie");
            });
        });

        describe("Vote", function () {
            it("Should allow token holders to vote", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                expect(await contract.connect(addr1).vote("Option1")).to.emit(
                    contract,
                    "VoteCast"
                );
            });

            it("Should not allow non-token holders to vote", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];

                await contract.connect(owner).startVoting(options, 3600);

                await expect(
                    contract.connect(addr1).vote("Option1")
                ).to.be.revertedWith("Insufficient BuzzCoin to vote!");
            });

            it("Should not allow voting twice", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("2");
                await buzzCoin.transfer(addr1.address, amount);

                await contract.connect(addr1).vote("Option1");

                await expect(
                    contract.connect(addr1).vote("Option1")
                ).to.be.revertedWith("You have already voted!");
            });

            it("Should allow users to vote again when a new vote is started", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                await contract
                    .connect(owner)
                    .startVoting(["Option1", "Option2"], 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                await contract.connect(addr1).vote("Option1");

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);
                await contract.finishVoting();
                await contract.connect(owner).resetVoting();

                expect(await contract.hasVoted(addr1.address)).to.equal(false);

                await contract
                    .connect(owner)
                    .startVoting(["Option1", "Option2"], 3600);

                await expect(contract.connect(addr1).vote("Option2")).to.emit(
                    contract,
                    "VoteCast"
                );
            });

            it("Should not allow voting with an invalid option", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
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

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await expect(
                    contract.connect(addr1).vote("Option1")
                ).to.be.revertedWith("Voting has ended!");
            });

            it("Should revert if a voter tries to vote with an empty option", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                await expect(
                    contract.connect(addr1).vote("")
                ).to.be.revertedWith("Invalid vote option!");
            });
        });

        describe("Reset Voting", function () {
            it("should reset voting correctly", async function () {
                const { buzzCoin, contract, owner, addr1, addr2 } =
                    await deployContractFixture();

                await contract
                    .connect(owner)
                    .startVoting(["Option 1", "Option 2"], 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);
                await buzzCoin.transfer(addr2.address, amount);

                await contract.connect(addr1).vote("Option 1");
                await contract.connect(addr2).vote("Option 2");

                await ethers.provider.send("evm_increaseTime", [3602]);
                await ethers.provider.send("evm_mine", []);

                await contract.connect(owner).finishVoting();

                await contract.connect(owner).resetVoting();

                expect(await contract.votingState()).to.equal(0);
                expect(await contract.getOptionCount()).to.equal(0);
                expect(await contract.hasVoted(addr1.address)).to.equal(false);
                expect(await contract.hasVoted(addr2.address)).to.equal(false);
            });

            it("Should reset the contracts state after voting ends", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                await contract.connect(addr1).vote("Option1");

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);
                await contract.finishVoting();

                expect(await contract.votingState()).to.equal(2);
                expect(await contract.getWinner()).to.equal("Option1");

                await contract.resetVoting();

                expect(await contract.votingState()).to.equal(0);
                expect(await contract.getOptionCount()).to.equal(0);
            });

            it("Should allow resetting the contract immediately after finishing voting", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                await contract
                    .connect(owner)
                    .startVoting(["Option1", "Option2"], 3600);

                const amount = ethers.parseEther("1");

                await buzzCoin.transfer(addr1.address, amount);
                await contract.connect(addr1).vote("Option1");

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);
                await contract.finishVoting();

                expect(await contract.votingState()).to.equal(2);

                await contract.resetVoting();

                expect(await contract.votingState()).to.equal(0);
                expect(await contract.getOptionCount()).to.equal(0);
            });

            it("Should not allow resetting the vote while it is ongoing", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                await expect(contract.resetVoting()).to.be.revertedWith(
                    "Invalid state!"
                );
            });
        });

        describe("Get Winner", function () {
            it("Should revert when called before voting has ended", async function () {
                const { contract } = await deployContractFixture();

                await expect(contract.getWinner()).to.be.revertedWith(
                    "Voting has not ended yet!"
                );
            });

            it("Should present winner when vote is over", async function () {
                const { buzzCoin, contract, owner, addr1 } =
                    await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const amount = ethers.parseEther("1");
                await buzzCoin.transfer(addr1.address, amount);

                await contract.connect(addr1).vote("Option1");

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await contract.finishVoting();

                const winner = await contract.getWinner();
                expect(winner).to.equal("Option1");
            });
        });

        describe("Get Option Count", function () {
            it("Should return the correct number of options", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                const optionCount = await contract.getOptionCount();
                expect(optionCount).to.equal(3);
            });

            it("Should return 0 if no vote is ongoing", async function () {
                const { contract } = await deployContractFixture();

                const optionCount = await contract.getOptionCount();
                expect(optionCount).to.equal(0);
            });

            it("Should reset the option count after resetting the vote", async function () {
                const { contract, owner } = await deployContractFixture();

                const options = ["Option1", "Option2", "Option3"];
                await contract.connect(owner).startVoting(options, 3600);

                await ethers.provider.send("evm_increaseTime", [3601]);
                await ethers.provider.send("evm_mine", []);

                await contract.finishVoting();

                await contract.resetVoting();

                const optionCount = await contract.getOptionCount();
                expect(optionCount).to.equal(0);
            });
        });
    });
});
