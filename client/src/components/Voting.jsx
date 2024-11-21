import React, { useState } from "react";
import { ethers } from "ethers";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const abi = [
    "function totalVotesFor(uint256 candidate) view returns(uint256)",
    "function voteForCandidate(uint256 candidate)",
];

const Voting = () => {
    const { provider, setProvider } = useState(null);
    const [voteOption, setVoteOption] = useState(0);

    async function connectWallet() {
        const prov = new ethers.providers.Web3Provider(window.ethereum);
        await prov.send("eth_requestAccounts", []);
        setProvider(prov);
    }

    async function castVote() {
        if (!provider) return alert("Connect your wallet first!");

        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);

        const token = await contract.generateToken(await signer.getAddress());
        await contract.vote(voteOption, token);

        alert("Vote cast successfully!");
    }

    return (
        <div className="container">
            <div className="header">
                <h1>Anonymous Voting</h1>
                <button onClick={connectWallet}>Connect Wallet</button>
            </div>
            <div className="vote-section">
                <input
                    type="number"
                    placeholder="Vote Option"
                    onChange={(e) => setVoteOption(e.target.value)}
                />
                <button onClick={castVote}>Vote</button>
            </div>
        </div>
    );
};

export default Voting;
