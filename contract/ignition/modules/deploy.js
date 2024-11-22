const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const BuzzCoinModule = buildModule("BuzzCoinModule", (m) => {
    const initialSupply = m.getParameter("initialSupply", 1000000);

    const buzzCoin = m.contract("BuzzCoin", [initialSupply]);

    return { buzzCoin };
});

const AnonymousVotingModule = buildModule("AnonymousVotingModule", (m) => {
    const buzzCoin = m.useModule(BuzzCoinModule).buzzCoin;

    const anonymousVoting = m.contract("AnonymousVoting", [buzzCoin]);

    return { anonymousVoting };
});

module.exports = AnonymousVotingModule;
