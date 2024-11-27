import {
    checkIfVoted,
    connectWallet,
    getCurrentWalletConnected,
    getVotingState,
    mapVotingState,
    startVoting,
    walletListener,
    getWinner,
    voteForOption,
    resetVoting,
    finishVoting,
    getOwnerAddress,
    loadOptions,
} from "../utilities/ContractInteractions";
const { useState, useEffect } = require("react");

const Voting = () => {
    const [walletAddress, setWalletAddress] = useState("");
    const [status, setStatus] = useState(
        "Unable to connect to the blockchain."
    );
    const [votingState, setVotingState] = useState("NotStarted");
    const [options, setOptions] = useState([]);
    const [winner, setWinner] = useState("");
    const [duration, setDuration] = useState("");
    const [isOwner, setIsOwner] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const { address, status } = await getCurrentWalletConnected();
                setWalletAddress(address);
                setStatus(status);

                const state = await getVotingState();
                setVotingState(mapVotingState(parseInt(state)));

                const owner = await getOwnerAddress();
                setIsOwner(address.toLowerCase() === owner.toLowerCase());

                if (address) {
                    const voted = await checkIfVoted(address);
                    setHasVoted(voted);
                }

                if (votingState === "Finished" || 2) {
                    const fetchWinner = async () => {
                        try {
                            const fetchedWinner = await getWinner();
                            setWinner(fetchedWinner);
                        } catch (err) {
                            console.error("Error fetching winner:", err);
                        }
                    };
                    fetchWinner();
                }

                const optionsFromContract = await loadOptions();
                setOptions(optionsFromContract);

                walletListener(
                    setWalletAddress,
                    setOptions,
                    setHasVoted,
                    setStatus
                );
            } catch (err) {
                console.error("Error initializing voting app:", err);
            }
        };
        init();
    }, [votingState]);

    const handleConnectWallet = async () => {
        const walletResponse = await connectWallet();
        setWalletAddress(walletResponse.address);
        setStatus(walletResponse.status);
    };

    const handleStartVoting = async () => {
        if (options.length < 2) {
            setStatus("Please provide at least 2 options.");
            return;
        }

        if (!duration || isNaN(duration) || duration <= 0) {
            setStatus("Please provide a valid duration in seconds.");
            return;
        }

        try {
            const response = await startVoting(
                walletAddress,
                options,
                duration
            );
            setStatus(response.status);
            setVotingState("Ongoing");
        } catch (err) {
            console.error("Error starting vote:", err);
            setStatus("Error starting vote: " + err.message);
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, ""]);
    };

    const handleVote = async (option) => {
        try {
            const response = await voteForOption(walletAddress, option);
            setStatus(response.status);
            setHasVoted(true);
        } catch (err) {
            console.error("Error voting:", err);
            setStatus("Error voting: " + err.message);
        }
    };

    const handleReset = async () => {
        try {
            const response = await resetVoting(walletAddress);
            setStatus(response.status);
            setOptions([]);
            setWinner("");
            setVotingState("NotStarted");
        } catch (err) {
            console.error("Error resetting voting:", err);
            setStatus("Error resetting voting: " + err.message);
        }
    };

    const handleFinishVoting = async () => {
        try {
            const response = await finishVoting(walletAddress);
            setStatus(response.status);

            if (response.success) {
                const fetchedWinner = await getWinner();
                setWinner(fetchedWinner);
            }

            const updatedState = await getVotingState();
            setVotingState(mapVotingState(parseInt(updatedState)));
        } catch (err) {
            console.error("Error in handleCheckAndFinish:", err);
            setStatus("Unknown error occurred while finishing voting.");
        }
    };

    return (
        <div className="container">
            <div className="header">
                <div className="logo-name">
                    <img
                        src="/buzzcloud-logo.png"
                        alt="Buzzcloud logo"
                    />
                    <h1 className="title">BuzzVoting</h1>
                </div>
                {!walletAddress && (
                    <button
                        className="walletBtn"
                        onClick={handleConnectWallet}
                    >
                        Connect Wallet
                    </button>
                )}

                {walletAddress && (
                    <p className="wallet-address">
                        Connected:{" "}
                        {`${walletAddress.substring(
                            0,
                            6
                        )}...${walletAddress.substring(
                            walletAddress.length - 4
                        )}`}
                    </p>
                )}
            </div>

            <div className="content">
                {votingState === "Ongoing" ? (
                    <div className="vote">
                        <h3>Vote for:</h3>
                        {Array.isArray(options) && options.length > 0 ? (
                            options.map((option, index) => (
                                <button
                                    key={index}
                                    className="btn"
                                    onClick={() => handleVote(option)}
                                    disabled={hasVoted}
                                >
                                    {option}
                                </button>
                            ))
                        ) : (
                            <p>No options available for voting.</p>
                        )}

                        {hasVoted && (
                            <p className="voted">You have already voted!</p>
                        )}
                    </div>
                ) : (
                    <p>No active voting session.</p>
                )}

                {isOwner && (
                    <div className="admin-controls">
                        {votingState === "NotStarted" && (
                            <div className="controller">
                                <h3>Start a New Vote</h3>
                                <div className="admin-option-controller">
                                    {options.map((option, index) => (
                                        <input
                                            key={index}
                                            type="text"
                                            value={option || ""}
                                            onChange={(e) =>
                                                handleOptionChange(
                                                    index,
                                                    e.target.value
                                                )
                                            }
                                            placeholder={`Option ${index + 1}`}
                                        />
                                    ))}
                                </div>
                                <button onClick={addOption}>Add Option</button>
                                <div className="duration-controller">
                                    <input
                                        type="number"
                                        placeholder="Duration in seconds"
                                        value={duration}
                                        onChange={(e) =>
                                            setDuration(
                                                parseInt(e.target.value, 10)
                                            )
                                        }
                                    />
                                    <button onClick={handleStartVoting}>
                                        Start Voting
                                    </button>
                                </div>
                            </div>
                        )}

                        {votingState === "Finished" && (
                            <div>
                                <button onClick={handleReset}>
                                    Reset Voting
                                </button>
                            </div>
                        )}

                        <button onClick={handleFinishVoting}>
                            Check and Finish Voting
                        </button>
                    </div>
                )}

                {votingState === "Finished" && (
                    <div>
                        <p className="winner-title">Winner:</p>
                        {winner ? (
                            <p className="winner">{winner}</p>
                        ) : (
                            <p className="winner">
                                {winner === ""
                                    ? "No winner (tie or no votes)"
                                    : "Loading winner..."}
                            </p>
                        )}
                    </div>
                )}

                <p className="status">{status}</p>
            </div>
        </div>
    );
};

export default Voting;
