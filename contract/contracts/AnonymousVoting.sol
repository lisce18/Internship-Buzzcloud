// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.27;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract AnonymousVoting{
    IERC20 public buzzCoin;
    uint256 public votingEnd;
    address public owner;
    mapping(bytes32 => uint256) public votes;
    mapping(address=> bool) public hasVoted;

    event VoteCast(bytes32 indexed voteHash);

    constructor(address _buzzCoin, uint256 _votingDuration){
        buzzCoin = IERC20(_buzzCoin);
        votingEnd = block.timestamp + _votingDuration;
        owner = msg.sender;
    }

    modifier onlyBeforeEnd() {
        require(block.timestamp < votingEnd, 'Voting has ended.');
        _;
    }

    modifier onlyTokenHolders(){
        require(buzzCoin.balanceOf(msg.sender) > 0, 'Must hold BuzzCoin to vote!');
        _;
    }

    function castVote(bytes32 voteHash) external onlyBeforeEnd onlyTokenHolders {
        require(!hasVoted[msg.sender], 'Already voted');
        votes[voteHash]++;
        hasVoted[msg.sender] = true;
        emit VoteCast(voteHash);
    }

    function getVoteCount(bytes32 voteHash) external view returns(uint256){
        return votes[voteHash];
    }
}