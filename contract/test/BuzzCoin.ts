import { expect } from "chai";
import hre from "hardhat";

describe("BuzzCoin", function () {
    async function deployBuzzCoinFixture() {
        const initialSupply = BigInt(1000000);
        const BuzzCoin = await hre.ethers.getContractFactory("BuzzCoin");
        const buzzCoin = await BuzzCoin.deploy(initialSupply);

        return { buzzCoin, initialSupply };
    }

    describe("Deployment", function () {
        it("Should deploy BuzzCoin and the correct initial supply", async function () {
            const { buzzCoin, initialSupply } = await deployBuzzCoinFixture();
            const [owner] = await hre.ethers.getSigners();

            const ownerBalance = await buzzCoin.balanceOf(owner.address);
            const expectedSupply = initialSupply * BigInt(10 ** 18);
            expect(await buzzCoin.totalSupply()).to.equal(expectedSupply);
            expect(ownerBalance).to.equal(expectedSupply);
        });
    });
});
