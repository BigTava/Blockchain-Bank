// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Bank is Ownable{

    using SafeMath for uint256;

    Token public token;
    uint public timePeriodMinutes;
    uint public t0;
    uint public rewardPool;
    uint public rewardPoolLeft;
    address private _owner;
    address[] public usersAddresses;
    
    struct user {
        uint stakingBalance;
        bool isStaking;
    }

    mapping(address => user) public users;
    mapping(uint => uint) public totalStaked; // staking amount at each period

    event NewStaker(address stakerAddress, uint amount);

    constructor(Token _token, uint _timePeriodMinutes, uint _rewardPool) public {
        _owner      = msg.sender;
        token       = _token;
        timePeriodMinutes  = _timePeriodMinutes.mul(60);
        t0          = block.timestamp;
        rewardPool  = _rewardPool;
    }

    modifier notStaking {
        require(users[msg.sender].isStaking != true, 'Already staking');
        _;
    }

    modifier depositAllowed {
        require(getCurrentPeriod() == 1, "It is only possible to deposit in the first period");
        _;
    }

    modifier userWithdrawAllowed {
        require(getCurrentPeriod() >= 3, "You cannot withdraw your tokens");
        _;
    }

    modifier bankWithdrawAllowed {
        require(getCurrentPeriod() == 5, "Bank can only withdraw in period 5");
        require(totalStaked[5] == 0, "Bank can only withdraw if no other user is staking");
        _;
    }

    // Satking Tokens (Deposit)
    function stakeTokens(uint _amount) external notStaking depositAllowed {

        // Require amount > 0
        require(_amount > 0, "minimal amount is 0");
    
        // Create user and populate variable
        users[msg.sender] = user(
        {
            stakingBalance : _amount,
            isStaking: true
        }
        );

        // Transfer xyz to this contract for staking
        token.transferFrom(msg.sender, address(this), _amount);
    
        // update variables
        users[msg.sender].stakingBalance = _amount;
        updateTotalStaked(1, _amount);

        // Add user to stakers array if they haven't staked already
        usersAddresses.push(msg.sender);
        users[msg.sender].isStaking = true;

        // Emit event
        emit NewStaker(msg.sender, _amount);
    }

    // Unstaking Tokens (Withdraw)
    function unstakeTokens() external userWithdrawAllowed {

        uint balance = users[msg.sender].stakingBalance;
        uint8 currentPeriod = getCurrentPeriod();
        uint totalRewards;

        // Require amount greater than 0
        require(balance > 0, "staking balance connot be 0");

        // Transfer balance + rewards
        totalRewards = calculateRewards(currentPeriod);
        token.transfer(msg.sender, balance + totalRewards);

        // Update variables
        users[msg.sender].isStaking = false;
        users[msg.sender].stakingBalance = 0;
        usersAddresses[getIndex(msg.sender)] = usersAddresses[usersAddresses.length - 1];
        usersAddresses.pop();
        updateTotalStaked(currentPeriod, balance);
    }

    // Bank Withdraw in period 5 
    function bankWithdraw() external bankWithdrawAllowed onlyOwner{

        uint amount;

        // check in which period there
        if (totalStaked[3] == 0) {
            amount = rewardPool;
        } else if (totalStaked[4] == 0) {
            amount = 8*rewardPool/10;
        } else if (totalStaked[5] == 0) {
            amount = 5*rewardPool/10;
        }

        token.transfer(_owner, amount);
    }

    // Calculate rewards 
    function calculateRewards(uint8 period) view private returns (uint rewards) {

        address userAddress = msg.sender;
        uint stakingBalance = users[userAddress].stakingBalance;

        if (period == 3) {

            uint r1 = stakingBalance*2*rewardPool/totalStaked[3]/10;

            rewards = r1;
    
        } else if (period == 4) {

            uint r1 = stakingBalance*2*rewardPool/totalStaked[3]/10;
            uint r2 = stakingBalance*3*rewardPool/totalStaked[4]/10;

            rewards = r1 + r2;

        } else if (period == 5) {

            uint r1 = stakingBalance*2*rewardPool/totalStaked[3]/10;
            uint r2 = stakingBalance*3*rewardPool/totalStaked[4]/10;
            uint r3 = stakingBalance*5*rewardPool/totalStaked[5]/10;

            rewards = r1 + r2 + r3;
    
        }

        return rewards;
    }

    function updateTotalStaked(uint8 period, uint amount) private {
        
        if (period == 1) {
            totalStaked[1] = totalStaked[1].add(amount);
            totalStaked[3] = totalStaked[1];
            totalStaked[4] = totalStaked[1];
            totalStaked[5] = totalStaked[1];
        }
        if (getCurrentPeriod() == 3) {
            totalStaked[4] = totalStaked[4].sub(amount);
            totalStaked[5] = totalStaked[4];
        }
        if (getCurrentPeriod() == 4) {
            totalStaked[5] = totalStaked[5].sub(amount);
        }
    }

    function getIndex(address _sender) private  view returns (uint i){
        for(i = 0; i<usersAddresses.length; i++){
            if(_sender == usersAddresses[i]) {
                return i;
            }
        }
    }

    function getCurrentPeriod() public view returns (uint8 period) {
        if ((block.timestamp >= t0) && (block.timestamp < t0 + 1*timePeriodMinutes)) {
            period = 1;
        } else if ((block.timestamp >= t0.add(1*timePeriodMinutes)) && (block.timestamp < t0.add(2*timePeriodMinutes))) {
            period = 2;
        } else if ((block.timestamp >= t0.add(2*timePeriodMinutes)) && (block.timestamp < t0.add(3*timePeriodMinutes))) {
            period = 3;
        } else if ((block.timestamp >= t0.add(3*timePeriodMinutes)) && (block.timestamp < t0.add(4*timePeriodMinutes))) {
            period = 4;
        } else if ((block.timestamp >= t0.add(4*timePeriodMinutes))) {
            period = 5;
        }
        return period;
    }

    function getCurrentBlockTimestamp() public view returns (uint) {
        return block.timestamp;
    }
}