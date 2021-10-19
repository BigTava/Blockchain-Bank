// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Bank is Ownable{

    Token public token;
    address private _owner;
    uint public timePeriod;
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
    mapping(uint => uint) public totalStaked;

    event NewStaker(address stakerAddress, uint amount);

    constructor(Token _token, uint _timePeriod, uint _rewardPool) public {
        _owner      = msg.sender;
        token       = _token;
        timePeriod  = 0 minutes + _timePeriod;
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
        totalStaked[getCurrentPeriod()] += _amount;

        // Add user to stakers array if they haven't staked already
        usersAddresses.push(msg.sender);

        // Emit event
        emit NewStaker(msg.sender, _amount);
    }

    // Unstaking Tokens (Withdraw)
    function unstakeTokens() public withdrawAllowed {

        // Fetch staking balance
        uint balance = users[msg.sender].stakingBalance;

        // Require amount greater than 0
        require(balance > 0, "staking balance connot be 0");

        // Transfer balance + rewards
        uint totalRewards = users[msg.sender].p1 + users[msg.sender].p2 + users[msg.sender].p3;
        token.transferFrom(address(this), msg.sender, balance + totalRewards);

        // Update variables
        users[msg.sender].isStaking = false;
        usersAddresses[getIndex(msg.sender)] = usersAddresses[usersAddresses.length - 1];
        usersAddresses.pop();
        totalStaked[getCurrentPeriod()] -= balance;
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

    function getIndex(address _sender) private  view returns (uint index){
        for(uint i = 0; i<usersAddresses.length; i++){
            if(_sender == usersAddresses[i]) {
                return i;
            }
        }
    }

    function getCurrentPeriod() public view returns (uint period) {
        if ((block.timestamp >= t0 + 1*timePeriod) && (block.timestamp < t0 + 2*timePeriod)) {
            period = 1;
        } else if ((block.timestamp >= t0 + 1*timePeriod) && (block.timestamp < t0 + 2*timePeriod)) {
            period = 2;
        } else if ((block.timestamp >= t0 + 2*timePeriod) && (block.timestamp < t0 + 3*timePeriod)) {
            period = 3;
        } else if ((block.timestamp >= t0 + 3*timePeriod) && (block.timestamp < t0 + 4*timePeriod)) {
            period = 4;
        } else if ((block.timestamp >= t0 + 4*timePeriod)) {
            period = 5;
        }
        return period;
    }
}