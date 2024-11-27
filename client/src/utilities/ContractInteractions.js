import Web3 from "web3";
const alchemyKey = process.env.REACT_APP_ALCHEMY_KEY;
const web3 = new Web3(new Web3.providers.WebsocketProvider(alchemyKey));

const votingAbi = require("../voting-abi.json");
const votingAddress = "0xe9F88aa9FA9d41bff460772Fc3745d2Da48CE3d5";

const votingContract = new web3.eth.Contract(votingAbi, votingAddress);

const coinAbi = require("../coin-abi.json");
const coinAddress = "0x602C273b42B90e10cb514Fa4ad28f05CCfE931c5";

const coinContract = new web3.eth.Contract(coinAbi, coinAddress);

export const checkIfVoted = async (address) => {
    const voted = await votingContract.methods.hasVoted(address).call();
    return voted;
};

export const connectWallet = async () => {
    if (window.ethereum) {
        try {
            const addressArray = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            return {
                address: addressArray[0],
                status: "",
            };
        } catch (err) {
            return {
                address: "",
                status: err.message,
            };
        }
    } else {
        return {
            address: "",
            status: (
                <span>
                    Want to use this application? <br />
                    <a
                        href="https://metamask.io/download.html"
                        target="blank"
                    >
                        Install MetaMask for your browser!
                    </a>
                </span>
            ),
        };
    }
};

export const finishVoting = async (walletAddress) => {
    if (!window.ethereum) {
        return {
            status: "MetaMask is not installed. Please install MetaMask to proceed.",
        };
    }

    try {
        const encodedABI = votingContract.methods.finishVoting().encodeABI();

        const transactionParams = {
            to: votingContract.options.address,
            from: walletAddress,
            data: encodedABI,
        };

        const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [transactionParams],
        });

        return {
            status: `Voting finished successfully! Transaction hash: ${txHash}`,
        };
    } catch (err) {
        console.error("Error finishing voting transaction:", err.message);
        return {
            status: `Error finishing voting: ${err.message}`,
            error: err, // Include the error object for debugging
        };
    }
};

export const getCurrentWalletConnected = async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_accounts",
            });

            if (accounts.length > 0) {
                return {
                    address: accounts[0],
                    status: "",
                };
            } else {
                return {
                    address: "",
                    status: "Connect your wallet using the top right button!",
                };
            }
        } catch (err) {
            return {
                address: "",
                status: err.message,
            };
        }
    } else {
        return {
            address: "",
            status: (
                <span>
                    Want to use this application? <br />
                    <a
                        href="https://metamask.io/download.html"
                        target="blank"
                    >
                        Install MetaMask for your browser!
                    </a>
                </span>
            ),
        };
    }
};

export const getOwnerAddress = async () => {
    try {
        const owner = await votingContract.methods.owner().call();
        return owner;
    } catch (err) {
        console.error("Error fetching owner address:", err);
        throw new Error("Unable to fetch owner address");
    }
};

export const getVotingState = async () => {
    const state = await votingContract.methods.votingState().call();
    return state;
};

export const getWinner = async () => {
    try {
        const winner = await votingContract.methods.getWinner().call();
        return winner;
    } catch (err) {
        console.error("Error fetching winner:", err);
        throw err;
    }
};

export const loadOptions = async () => {
    try {
        const optionCount = await votingContract.methods
            .getOptionCount()
            .call();
        const options = [];
        for (let i = 0; i < optionCount; i++) {
            const option = await votingContract.methods.options(i).call();
            options.push(option.name);
        }
        return options;
    } catch (err) {
        console.error("Error loading options:", err);
        throw new Error("Unable to load options from contract.");
    }
};

export const mapVotingState = (state) => {
    switch (parseInt(state)) {
        case 0:
            return "NotStarted";
        case 1:
            return "Ongoing";
        case 2:
            return "Finished";
        default:
            return "Unknown State";
    }
};

export const resetVoting = async (walletAddress) => {
    if (!window.ethereum) {
        return {
            status: "MetaMask is not installed. Please install MetaMask to proceed.",
        };
    }

    try {
        const encodedABI = votingContract.methods.resetVoting().encodeABI();

        const transactionParams = {
            to: votingContract.options.address,
            from: walletAddress,
            data: encodedABI,
        };

        const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [transactionParams],
        });

        return {
            status: `Voting reset successfully!`,
        };
    } catch (err) {
        console.error("Error during transaction:", err.message);
        return {
            status: "Error resetting voting: " + err.message,
        };
    }
};

export const startVoting = async (walletAddress, options, duration) => {
    if (!window.ethereum) {
        return {
            status: "MetaMask is not installed. Please install MetaMask to proceed.",
        };
    }

    try {
        const encodedABI = votingContract.methods
            .startVoting(options, duration)
            .encodeABI();

        const transactionParams = {
            to: votingContract.options.address,
            from: walletAddress,
            data: encodedABI,
        };

        const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [transactionParams],
        });

        return {
            status: "Voting has started!",
        };
    } catch (err) {
        console.error("Error during transaction:", err.message);
        return {
            status: "Error starting vote: " + err.message,
        };
    }
};

export const voteForOption = async (walletAddress, optionName) => {
    if (!window.ethereum || !walletAddress) {
        return {
            status: "You need to connect your wallet in order to vote!",
        };
    }

    try {
        const transactionParams = {
            to: votingAddress,
            from: walletAddress,
            data: votingContract.methods.vote(optionName).encodeABI(),
        };

        const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [transactionParams],
        });

        return {
            status: (
                <span>
                    <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="blank"
                    >
                        View the status of your transaction here!
                    </a>
                    <br />
                    Your vote is being processed. Once the transaction is
                    verified, your vote will be counted!
                </span>
            ),
            txHash,
        };
    } catch (err) {
        return {
            status: "Error when casting vote: " + err.message,
        };
    }
};

export const waitForTransaction = async (txHash, setHasVoted) => {
    try {
        let receipt = null;
        while ((receipt = null)) {
            receipt = await web3.eth.getTransactionReceipt(txHash);
        }

        if (receipt && receipt.status) {
            setHasVoted(true);
        }
    } catch (err) {
        console.error("Error confirming transaction: ", err);
    }
};

export const walletListener = async (
    setWalletAddress,
    checkIfVoted,
    setHasVoted,
    setStatus
) => {
    if (window.ethereum) {
        window.ethereum.on("accountsChanged", async (accounts) => {
            if (accounts.length > 0) {
                setWalletAddress(accounts[0]);
                const voted = await checkIfVoted(accounts[0]);
                setHasVoted(voted);
                setStatus("");
            } else {
                setWalletAddress("");
                setHasVoted(false);
                setStatus("Connect your wallet using the top right button!");
            }
        });
    }
};

export const withdrawFunds = async (walletAddress) => {
    if (!window.ethereum) {
        return {
            status: "MetaMask is not installed. Please install MetaMask to proceed.",
        };
    }

    try {
        const encodedABI = votingContract.methods.withdrawFunds().encodeABI();

        const transactionParams = {
            to: votingContract.options.address,
            from: walletAddress,
            data: encodedABI,
        };

        const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [transactionParams],
        });

        return {
            status: `Funds withdrawn successfully! Transaction hash: ${txHash}`,
        };
    } catch (err) {
        console.error("Error during transaction:", err.message);
        return {
            status: "Error withdrawing funds: " + err.message,
        };
    }
};

export const eventListeners = async (setStatus, setVotingState, setWinner) => {
    votingContract.events.VotingStarted({}, (err, event) => {
        if (err) {
            console.error("Error in VotingStarted event:", err);
            setStatus(`Error: ${err.message}`);
        } else {
            setStatus("Ongoing");
        }
    });

    votingContract.events.VoteCast({}, (err, event) => {
        if (err) {
            console.error("Error in VoteCast event:", err);
            setStatus(`Error: ${err.message}`);
        } else {
            setStatus("Vote successfully cast!");
        }
    });

    votingContract.events.VotingFinished({}, (err, event) => {
        if (err) {
            console.error("Error in VotingFinished event:", err);
            setStatus(`Error: ${err.message}`);
        } else {
            setVotingState("Finished");
            if (event.returnValues && event.returnValues.winner) {
                setWinner(event.returnValues.winner);
            } else {
                console.error("No winner found in event:", event);
            }
        }
    });
};
