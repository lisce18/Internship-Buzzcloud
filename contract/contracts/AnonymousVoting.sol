// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AnonymousVoting {
    enum VotingState { NotStarted, Ongoing, Finished }

    struct Option {
        string name;
        uint voteCount;
    }

    Option[] public options;
    address[] public voterList;
    address public owner;
    string public winner;
    VotingState public votingState;
    mapping(address => bool) public hasVoted;
    uint256 public votingEnd;
    IERC20 public buzzCoin;

    event VoteCast(bytes32 voteHash, string message);
    event VotingFinished(string winner);
    event VotingStarted(uint256 votingEnd);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function!");
        _;
    }

    modifier inState(VotingState _state) {
        require(votingState == _state, "Invalid state!");
        _;
    }

    modifier onlyTokenHolder() {
        require(buzzCoin.balanceOf(msg.sender) > 0, "Insufficient BuzzCoin to vote!");
        _;
    }

    constructor(address _buzzCoin) {
        owner = msg.sender;
        buzzCoin = IERC20(_buzzCoin);
        votingState = VotingState.NotStarted;
        winner = "";
    }

    function startVoting(string[] memory _votingOptions, uint256 _votingDuration) public onlyOwner inState(VotingState.NotStarted) {
        require(_votingOptions.length > 1, "Must have at least 2 voting options!");

        delete options;
        for (uint256 i = 0; i < _votingOptions.length; i++) {
            options.push(Option({ name: _votingOptions[i], voteCount: 0 }));
        }

        delete voterList;
        votingEnd = block.timestamp + _votingDuration;
        votingState = VotingState.Ongoing;
        emit VotingStarted(votingEnd);
    }

    function vote(string memory optionName) public inState(VotingState.Ongoing) onlyTokenHolder {
        require(block.timestamp < votingEnd, "Voting has ended!");
        require(!hasVoted[msg.sender], "You have already voted!");

        bool found = false;
        for (uint256 i = 0; i < options.length; i++) {
            if (keccak256(abi.encodePacked(options[i].name)) == keccak256(abi.encodePacked(optionName))) {
                options[i].voteCount += 1;
                found = true;
                break;
            }
        }

        require(found, "Invalid vote option!");

        hasVoted[msg.sender] = true;
        voterList.push(msg.sender);
        bytes32 voteHash = keccak256(abi.encodePacked(msg.sender, optionName));
        emit VoteCast(voteHash, "Vote successfully cast!");
    }

    function finishVoting() public onlyOwner {
    require(block.timestamp >= votingEnd, "Voting is still ongoing!");

    votingState = VotingState.Finished;

    uint256 highestVotes = 0;
    string memory _winner = "";

    for (uint256 i = 0; i < options.length; i++) {
        if (options[i].voteCount > highestVotes) {
            highestVotes = options[i].voteCount;
            _winner = options[i].name;
        } else if (options[i].voteCount == highestVotes) {
            _winner = "Tie";
        }
    }

    winner = _winner;
    emit VotingFinished(winner);
}

    function resetVoting() public onlyOwner inState(VotingState.Finished) {
    votingState = VotingState.NotStarted;
    winner = "";

    delete options;

    for (uint256 i = 0; i < voterList.length; i++) {
        hasVoted[voterList[i]] = false;
    }

    delete voterList;
}


    function getWinner() public view returns (string memory) {
        require(votingState == VotingState.Finished, "Voting has not ended yet!");
        return winner;
    }

    function getOptionCount() public view returns (uint256) {
        return options.length;
    }
}
