// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.27;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract BuzzCoin is ERC20{
    constructor(uint256 initialSupply) ERC20('BuzzCoin', 'BUZZ'){
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}