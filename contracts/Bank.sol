// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Bank is Ownable{

    using SafeMath for uint256;

    Token public token;
    address private _owner;
    uint public timePeriodMinutes;
    uint public t0;
    uint public rewardPool;
    address[] public usersAddresses;
    
    struct user {
        uint p1;
        uint p2;
        uint p3;
        uint stakingBalance;
        bool isStaking;
    }

    mapping(address => user) users;
    mapping(uint => uint) totalStaked; // staking amount at each period

    event NewStaker(address stakerAddress, uint amount);

    constructor(Token _token, uint _timePeriodMinutes, uint _rewardPool) public {
        _owner      = msg.sender;
        token       = _token;
        timePeriodMinutes  = _timePeriodMinutes.mul(60);
        t0          = block.timestamp;
        rewardPool  = _rewardPool;
    }

    modifier notStaking(address _userAddress) {
        require(users[_userAddress].isStaking != true, 'Already staking');
        _;
    }

    modifier depositAllowed() {
        require(getCurrentPeriod() == 1, "It is only possible to deposit in the first period");
        _;
    }

    modifier withdrawAllowed() {
        require(getCurrentPeriod() > 2, "You cannot withdraw your tokens");
        _;
    }

    // Satking Tokens (Deposit)
    function stakeTokens(uint _amount) public notStaking(msg.sender) depositAllowed {

        // Require amount > 0
        require(_amount > 0, "minimal amount is 0");

        // Create user and populate variable
        users[msg.sender] = user(
        {
            p1: 0,
            p2: 0,
            p3: 0,
            stakingBalance : _amount,
            isStaking: true
        }
        );

        // Transfer xyz to this contract for staking
        token.transferFrom(msg.sender, address(this), _amount);
    
        // update staking balance
        users[msg.sender].stakingBalance = _amount;
        totalStaked[1] = totalStaked[1].add(_amount);

        // Add user to stakers array if they haven't staked already
        usersAddresses.push(msg.sender);

        // Emit event
        emit NewStaker(msg.sender, _amount);
    }

    // Unstaking Tokens (Withdraw)
    function unstakeTokens() public withdrawAllowed {

        uint balance = users[msg.sender].stakingBalance; // Fetch staking balance
        uint currentPeriod = getCurrentPeriod();

        // Require amount greater than 0
        require(balance > 0, "staking balance connot be 0");

        // Transfer balance + rewards
        uint totalRewards = users[msg.sender].p1 + users[msg.sender].p2 + users[msg.sender].p3;
        token.transferFrom(address(this), msg.sender, balance + totalRewards);

        // Update variables
        users[msg.sender].isStaking = false;
        usersAddresses[getIndex(msg.sender)] = usersAddresses[usersAddresses.length - 1];
        usersAddresses.pop();
        totalStaked[currentPeriod] = totalStaked[currentPeriod].sub(balance);
    }

    // Calculate rewards 
    function updateRewards() public {
        address userAddress;

        if (getCurrentPeriod() == 3) {
            for(uint i = 0; i<usersAddresses.length; i++){
                userAddress = usersAddresses[i];
                users[userAddress].p1 = users[userAddress].stakingBalance/totalStaked[3]*2/10*rewardPool;
            }
        }

        if (getCurrentPeriod() == 4) {
            for(uint i = 0; i<usersAddresses.length; i++){
                userAddress = usersAddresses[i];
                users[userAddress].p1 = users[userAddress].stakingBalance/totalStaked[4]*3/10*rewardPool;
            }
        }
        
        if (getCurrentPeriod() == 5) {
            for(uint i = 0; i<usersAddresses.length; i++){
                userAddress = usersAddresses[i];
                users[userAddress].p1 = users[userAddress].stakingBalance/totalStaked[5]*5/10*rewardPool;
            }
        }
    }

    function getIndex(address _sender) private  view returns (uint i){
        for(i = 0; i<usersAddresses.length; i++){
            if(_sender == usersAddresses[i]) {
                return i;
            }
        }
    }

    function getCurrentPeriod() public view returns (uint period) {
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