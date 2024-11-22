// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.27;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract AnonymousVoting{
    enum VotingState {NotStarted, Ongoing, Finished}

    struct Option {
        bytes32 name;
        uint voteCount;
    }

    Option[] public options;
    VotingState public votingState;
    mapping(address => bool) public hasVoted;
    bytes32 public winner;
    address public owner;
    uint256 public votingEnd;
    IERC20 public buzzCoin;

    event VotingStarted(uint256 votingEnd);
    event VoteCast(address voter, string message);
    event VotingFinished(bytes32 winner);

    constructor(address _buzzCoin) {
        owner = msg.sender;
        buzzCoin = IERC20(_buzzCoin);
        votingState = VotingState.NotStarted;
        winner = '';
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'Only owner can call this function!');
        _;
    }

    modifier inState(VotingState _state) {
        require(votingState == _state, 'Invalid state!');
        _;
    }

    modifier onlyTokenHolder() {
        require(buzzCoin.balanceOf(msg.sender) > 0, 'Must hold BuzzCoin to vote!');
        _;
    }

    modifier onlyBeforeEnd() {
        require(block.timestamp < votingEnd, 'Voting has ended!');
        _;
    }

    function startVoting(bytes32[] memory _votingOptions, uint256 _votingDuration) public onlyOwner inState(VotingState.NotStarted){
        require(_votingOptions.length > 1, 'Must have at least 2 voting options!');
        for(uint i = 0; i < _votingOptions.length; i++){
        options.push(Option({name: _votingOptions[i], voteCount: 0}));
        }
        votingEnd = block.timestamp + _votingDuration;
        votingState = VotingState.Ongoing;
        emit VotingStarted(votingEnd);
    }

    function vote(bytes32 optionName) public inState(VotingState.Ongoing) onlyTokenHolder onlyBeforeEnd{
        require(!hasVoted[msg.sender], 'You have already voted!');

        bool _found = false;
        for(uint i = 0; i < options.length; i++){
            if(options[i].name == optionName){
                options[i].voteCount += 1;
                _found = true;
                break;
            }
        }

        require(_found, 'Invalid vote option!');

        hasVoted[msg.sender] = true;
        keccak256(abi.encodePacked(msg.sender, optionName));
        emit VoteCast(msg.sender, 'Vote successfully casted!');
    }

    function finishVoting() public {
        require(block.timestamp >= votingEnd, 'Voting has not ended yet!');
        require(votingState == VotingState.Ongoing, 'Voting has not started yet!');
        votingState = VotingState.Finished;

        uint256 highestVotes = 0;
        bytes32 winningOption;
        for(uint256 i = 0; i < options.length; i++){
            if(options[i].voteCount > highestVotes){
                highestVotes = options[i].voteCount;
                winningOption = options[i].name;
            }
        }
        winner = winningOption;
        emit VotingFinished(winner);
    }

    function getWinner() public view returns (bytes32){
        require(votingState == VotingState.Finished, 'Voting has not ended yet!');
        return winner;
    }
}